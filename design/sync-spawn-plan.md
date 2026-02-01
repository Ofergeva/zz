# Plan: Synchronous-by-Default Language + Spawn Operator

## Summary

Make ZZ synchronous-by-default: all function calls block (compiled as `async/await`). Add `~>` spawn operator for non-blocking calls that return a `Spawn` struct with `.onError(handlerFn)` chaining. Auto-import Spawn from std library when `~>` is used.

## Design Decisions (Pre-resolved)

- **All** ZZ function declarations compile to `async function` in JS
- **All** function/method calls compile with `await` prefix (safe no-op on sync values)
- `~>` spawns a call WITHOUT `await`, wrapping in `new Spawn(promise)`
- `.onError()` accepts a **function name** (no lambdas): `.onError(handleError)`
- Spawn is a **std library** (`std/spawn.js`), auto-imported by codegen when `~>` is used
- Top-level `await` works because output is ESM (`"type": "module"` in package.json)
- `--run` flag needs update: `eval()` doesn't support top-level await, change to temp file + `node` subprocess

---

## Step 1: Add SPAWN token to Lexer

**File:** `src/lexer.ts`

### 1a. Add token type to enum (line ~119, before `IDENTIFIER`)

Find this exact string:
```
  // Other
  IDENTIFIER = 'IDENTIFIER',
```

Add before it:
```
  // Spawn
  SPAWN = 'SPAWN',               // ~>
```

### 1b. Modify tilde handling to check for `>` (line 166)

Find this exact line:
```
    if (char === '~') { this.advance(); return this.makeToken(TokenType.MUTABLE, '~'); }
```

Replace with:
```
    if (char === '~') {
      this.advance();
      if (this.peek() === '>') {
        this.advance();
        return this.makeToken(TokenType.SPAWN, '~>');
      }
      return this.makeToken(TokenType.MUTABLE, '~');
    }
```

---

## Step 2: Add SpawnExpression to AST

**File:** `src/ast.ts`

### 2a. Add SpawnExpression interface (after JSBlockStatement interface, around line 475)

Find:
```
// Type information extracted from an imported .zz module
```

Add before it:
```typescript
// Spawn expression: ~> functionCall() — non-blocking call wrapped in Spawn
export interface SpawnExpression extends ASTNode {
  type: 'SpawnExpression';
  call: FunctionCall | MethodCall;
}
```

### 2b. Add SpawnExpression to Expression type union (line 151)

Find:
```
export type Expression = StringLiteral | NumberLiteral | BoolLiteral | NullLiteral | Identifier | BinaryExpression | UnaryExpression | InterpolatedString | CastExpression | FunctionCall | ArrayLiteral | TupleLiteral | RangeExpression | IndexAccess | MethodCall | MemberExpression | EnumAccess | StructInstantiation | MatchExpression;
```

Replace with (add `SpawnExpression` at the end):
```
export type Expression = StringLiteral | NumberLiteral | BoolLiteral | NullLiteral | Identifier | BinaryExpression | UnaryExpression | InterpolatedString | CastExpression | FunctionCall | ArrayLiteral | TupleLiteral | RangeExpression | IndexAccess | MethodCall | MemberExpression | EnumAccess | StructInstantiation | MatchExpression | SpawnExpression;
```

### 2c. Update the codegen import list

In `src/codegen.ts` line 4-35 imports, add `SpawnExpression` to the import list from `./ast.js`.

---

## Step 3: Parse `~>` in Parser

**File:** `src/parser.ts`

### 3a. Import SpawnExpression

Add `SpawnExpression` to the import list from `./ast.js` at the top of the file.

### 3b. Pre-register "Spawn" as a known struct name

In the `constructor` method (around line 82-88), after the external types are loaded, add:
```typescript
this.structNames.add('Spawn');
```

This ensures `Spawn#s = ~> func()` variable declarations work.

### 3c. Add ~> statement handling in parseStatement()

Find this exact block (around line 304-314):
```
    // Raw JavaScript injection: $js { ... }
    if (token.type === TokenType.JS_BLOCK) {
```

Add BEFORE it:
```typescript
    // Spawn expression: ~> functionCall()
    if (token.type === TokenType.SPAWN) {
      return this.parseSpawnStatement();
    }
```

### 3d. Add parseSpawnStatement() method

Add this new method to the Parser class (after `parseExpressionStatement` or any convenient location):

```typescript
  private parseSpawnStatement(): ExpressionStatement {
    const spawnToken = this.advance(); // consume ~>
    const nameToken = this.expect([TokenType.IDENTIFIER]);

    // Parse the function call
    this.expect([TokenType.LPAREN]); // expect (
    const args: FunctionArgument[] = [];
    while (this.peek().type !== TokenType.RPAREN) {
      if (this.peek().type === TokenType.IDENTIFIER && this.peekNext()?.type === TokenType.EQUALS) {
        const argNameToken = this.advance();
        this.advance(); // consume =
        const value = this.parseExpression();
        args.push({ name: argNameToken.value, value });
      } else {
        const value = this.parseExpression();
        args.push({ value });
      }
      if (this.peek().type === TokenType.COMMA) {
        this.advance();
      }
    }
    this.expect([TokenType.RPAREN]); // consume )

    const call: FunctionCall = {
      type: 'FunctionCall',
      name: nameToken.value,
      arguments: args,
      line: nameToken.line,
      column: nameToken.column,
    };

    let expr: Expression = {
      type: 'SpawnExpression',
      call: call,
      line: spawnToken.line,
      column: spawnToken.column,
    } as SpawnExpression;

    // Handle method chaining: ~> func().onError(handler)
    while (this.peek().type === TokenType.DOT) {
      this.advance(); // consume .
      const methodToken = this.expect([TokenType.IDENTIFIER]);
      this.expect([TokenType.LPAREN]);
      const methodArgs: Expression[] = [];
      while (this.peek().type !== TokenType.RPAREN) {
        methodArgs.push(this.parseExpression());
        if (this.peek().type === TokenType.COMMA) {
          this.advance();
        }
      }
      this.expect([TokenType.RPAREN]);
      expr = {
        type: 'MethodCall',
        object: expr,
        method: methodToken.value,
        arguments: methodArgs,
        line: methodToken.line,
        column: methodToken.column,
      } as MethodCall;
    }

    return {
      type: 'ExpressionStatement',
      expression: expr,
      line: spawnToken.line,
      column: spawnToken.column,
    } as ExpressionStatement;
  }
```

### 3e. Add ~> in expression context (for `Spawn#s = ~> func()`)

In `parsePrimary()` method (around line 1910), find:
```
    if (token.type === TokenType.IDENTIFIER) {
      return this.parseIdentifier();
    }
```

Add BEFORE it:
```typescript
    // Spawn expression in expression context: ~> functionCall()
    if (token.type === TokenType.SPAWN) {
      return this.parseSpawnExpression();
    }
```

### 3f. Add parseSpawnExpression() method

```typescript
  private parseSpawnExpression(): Expression {
    const spawnToken = this.advance(); // consume ~>
    const nameToken = this.expect([TokenType.IDENTIFIER]);

    // Parse the function call
    this.expect([TokenType.LPAREN]);
    const args: FunctionArgument[] = [];
    while (this.peek().type !== TokenType.RPAREN) {
      if (this.peek().type === TokenType.IDENTIFIER && this.peekNext()?.type === TokenType.EQUALS) {
        const argNameToken = this.advance();
        this.advance(); // consume =
        const value = this.parseExpression();
        args.push({ name: argNameToken.value, value });
      } else {
        const value = this.parseExpression();
        args.push({ value });
      }
      if (this.peek().type === TokenType.COMMA) {
        this.advance();
      }
    }
    this.expect([TokenType.RPAREN]);

    const call: FunctionCall = {
      type: 'FunctionCall',
      name: nameToken.value,
      arguments: args,
      line: nameToken.line,
      column: nameToken.column,
    };

    let expr: Expression = {
      type: 'SpawnExpression',
      call: call,
      line: spawnToken.line,
      column: spawnToken.column,
    } as SpawnExpression;

    // Handle method chaining: ~> func().onError(handler)
    while (this.peek().type === TokenType.DOT) {
      this.advance(); // consume .
      const methodToken = this.expect([TokenType.IDENTIFIER]);
      this.expect([TokenType.LPAREN]);
      const methodArgs: Expression[] = [];
      while (this.peek().type !== TokenType.RPAREN) {
        methodArgs.push(this.parseExpression());
        if (this.peek().type === TokenType.COMMA) {
          this.advance();
        }
      }
      this.expect([TokenType.RPAREN]);
      expr = {
        type: 'MethodCall',
        object: expr,
        method: methodToken.value,
        arguments: methodArgs,
        line: methodToken.line,
        column: methodToken.column,
      } as MethodCall;
    }

    return expr;
  }
```

---

## Step 4: Update Type Checker

**File:** `src/typechecker.ts`

### 4a. Import SpawnExpression

Add `SpawnExpression` to the import from `./ast.js`.

### 4b. Handle SpawnExpression in expression type checking

Find the method that checks/infers expression types. In `checkExpression` (or equivalent), add a case for `SpawnExpression`:

```typescript
case 'SpawnExpression':
  // Type-check the inner function call
  this.checkExpression(expr.call, line);
  break;
```

### 4c. Handle SpawnExpression in type inference

In `inferExpressionType` (or equivalent), add:

```typescript
case 'SpawnExpression':
  return { kind: 'struct', name: 'Spawn' } as StructType;
```

### 4d. Register Spawn as a known struct type

In the type checker's initialization (constructor or `check` method), register Spawn:
- Add `'Spawn'` to any struct tracking maps
- Register `onError` as a method of Spawn that accepts a function name parameter

If the type checker uses a `structInfo` map, add an entry:
```typescript
this.structInfo.set('Spawn', {
  fields: [],
  methods: new Map([['onError', { parameters: [], returnType: { kind: 'struct', name: 'Spawn' } }]])
});
```

The exact implementation depends on how the type checker tracks struct info — adapt to the existing pattern.

---

## Step 5: Update Code Generator

**File:** `src/codegen.ts`

This is the largest change. There are 5 sub-changes.

### 5a. Track whether any SpawnExpression exists (for auto-import)

Add a class field:
```typescript
private hasSpawn: boolean = false;
```

Reset it in `generate()`:
```typescript
this.hasSpawn = false;
```

### 5b. Auto-import Spawn in `generate()` method

In the `generate()` method (line 56-76), after generating all statements, prepend the Spawn import if needed.

Replace:
```typescript
    return lines.join('\n');
```

With:
```typescript
    let output = lines.join('\n');
    if (this.hasSpawn) {
      // Calculate relative path from output to std/spawn.js
      let spawnImport: string;
      if (this.options) {
        const absStdSpawn = path.join(this.options.stdLibDir, 'spawn.js');
        const relPath = path.relative(this.options.outputDir, absStdSpawn);
        const normalized = relPath.split(path.sep).join('/');
        const importPath = normalized.startsWith('.') ? normalized : './' + normalized;
        spawnImport = `import { Spawn } from "${importPath}";`;
      } else {
        spawnImport = `import { Spawn } from "./std/spawn.js";`;
      }
      output = spawnImport + '\n' + output;
    }
    return output;
```

### 5c. Make all function declarations async

In `generateFunctionDeclaration()` (line 332-355), change the function output.

Find:
```
    return `${exportPrefix}function ${decl.name}(${params}) {\n${body}\n}`;
```

Replace with:
```
    return `${exportPrefix}async function ${decl.name}(${params}) {\n${body}\n}`;
```

### 5d. Make struct methods async

In `generateStructMethod()` (line 155-175), change the method output.

Find:
```
    return `  ${method.name}(${params}) {\n${body}\n  }`;
```

Replace with:
```
    return `  async ${method.name}(${params}) {\n${body}\n  }`;
```

### 5e. Add `await` to function calls

In `generateExpression()`, find the `case 'FunctionCall':` block (line 423-456).

Extract the existing function call generation logic into a new helper method:

```typescript
  private generateFunctionCallCode(expr: FunctionCall): string {
    const paramNames = this.functionParams.get(expr.name);

    if (paramNames) {
      const argMap = new Map<string, string>();
      const positionalArgs: string[] = [];

      for (const arg of expr.arguments) {
        if (arg.name) {
          argMap.set(arg.name, this.generateExpression(arg.value));
        } else {
          positionalArgs.push(this.generateExpression(arg.value));
        }
      }

      const finalArgs: string[] = [];
      for (let i = 0; i < paramNames.length; i++) {
        const paramName = paramNames[i];
        if (i < positionalArgs.length) {
          finalArgs.push(positionalArgs[i]);
        } else if (argMap.has(paramName)) {
          finalArgs.push(argMap.get(paramName)!);
        }
      }

      return `${expr.name}(${finalArgs.join(', ')})`;
    } else {
      const args = expr.arguments.map(arg => this.generateExpression(arg.value)).join(', ');
      return `${expr.name}(${args})`;
    }
  }
```

Then replace the `case 'FunctionCall':` block with:
```typescript
      case 'FunctionCall': {
        return 'await ' + this.generateFunctionCallCode(expr);
      }
```

### 5f. Add `await` to method calls

In the `case 'MethodCall':` block (line 476-473), add `await` prefix to each return statement.

Find each `return` in the MethodCall case and prepend `await `:
- `return \`${object}.length\`` stays as-is (property access, not a call)
- `return \`${object}.push(${args})\`` → `return \`await ${object}.push(${args})\``
- `return \`${object}.pop()\`` → `return \`await ${object}.pop()\``
- `return \`${object}.charAt(${args})\`` → `return \`await ${object}.charAt(${args})\``
- Struct method calls: `return \`${object}.${expr.method}(${args})\`` → `return \`await ${object}.${expr.method}(${args})\``
- UFCS calls: `return \`${expr.method}(${object}, ${args})\`` → `return \`await ${expr.method}(${object}, ${args})\``
- UFCS no-args: `return \`${expr.method}(${object})\`` → `return \`await ${expr.method}(${object})\``

**Exception:** `.length` is a property access, NOT a call. Do NOT add await to it.

### 5g. Add SpawnExpression case to generateExpression()

Add a new case in the `generateExpression` switch, before the default/fallthrough:

```typescript
      case 'SpawnExpression': {
        this.hasSpawn = true;
        if (expr.call.type === 'FunctionCall') {
          return `new Spawn(${this.generateFunctionCallCode(expr.call)})`;
        } else {
          // MethodCall — generate without await
          return `new Spawn(${this.generateMethodCallCode(expr.call)})`;
        }
      }
```

For this, also extract method call generation into a helper `generateMethodCallCode()` that returns the call string WITHOUT `await`. This helper should contain the same logic as the current MethodCall case but without any `await` prefix.

---

## Step 6: Update `--run` flag for async support

**File:** `src/index.ts`

The current `eval(js)` at line 99 doesn't support top-level `await`. Replace with temp file + subprocess.

Find:
```typescript
		if (runFlag) {
			// Execute the generated JavaScript
			eval(js);
		}
```

Replace with:
```typescript
		if (runFlag) {
			// Write to temp file and run with node (supports top-level await + ESM imports)
			const tmpFile = path.join(sourceDir, `_zz_run_${Date.now()}.mjs`);
			fs.writeFileSync(tmpFile, js);
			try {
				const { execSync } = await import('child_process');
				execSync(`node "${tmpFile}"`, { stdio: 'inherit' });
			} finally {
				if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
			}
		}
```

Also change `function main(): void` to `async function main(): Promise<void>` and change `main();` at the bottom to `main().catch(e => { console.error(e); process.exit(1); });`.

---

## Step 7: Create std/spawn.js

**File:** `std/spawn.js` (NEW FILE)

```javascript
export class Spawn {
  constructor(promise) {
    this.promise = promise;
    // Prevent unhandled rejection warning
    this.promise.catch(() => {});
  }

  onError(handler) {
    this.promise.catch(handler);
    return this;
  }
}
```

---

## Step 8: Create std/spawn.zz

**File:** `std/spawn.zz` (NEW FILE)

```
-> S Spawn ;
```

This is a minimal type declaration. The actual implementation is in spawn.js.

---

## Step 9: Create example file

**File:** `examples/21_spawn.zz` (NEW FILE)

```
// Synchronous by default - every call blocks
// Spawn (~>) for non-blocking calls

// A regular function - blocks until complete
i Z slowAdd(i#a i#b)
  a + b
;

// An error handler function
Z handleError(s#e)
  error(s"Spawn error: {e}")
;

// Regular (blocking) function calls
i#result = slowAdd(3, 4)
print(s"Blocking result: {result}")

// Spawn (non-blocking) function call
~> slowAdd(10, 20)

// Spawn with error handling
~> slowAdd(100, 200).onError(handleError)

print("This prints before spawned calls complete")
```

---

## Step 10: Update README.md

Add a new section **"Synchronous Execution & Spawn"** after the **Error Handling** section. Content:

~~~markdown
## Synchronous Execution & Spawn

ZZ is synchronous by default. Every function call blocks until it completes — there are no callbacks, promises, or async/await at the language level.

### Blocking Calls (Default)

```zz
i#data = fetchData(url)      // blocks until fetchData returns
processData(data)             // runs after fetchData completes
```

### Spawn (`~>`) — Non-blocking Calls

Use `~>` to spawn a function call that runs without blocking:

```zz
~> updateData(url, newData)   // does not block — runs in background
print("continues immediately")
```

`~>` returns a `Spawn` struct. Use `.onError()` to handle errors:

```zz
Z handleError(s#e)
  error(s"Failed: {e}")
;

~> riskyOperation(args).onError(handleError)
```

`.onError()` accepts a function name (not an inline function).

You can also capture the Spawn:

```zz
Spawn#task = ~> longRunning(args)
```
~~~

---

## Step 11: Update CLAUDE.md

In the **Language Syntax Quick Reference** section, add after the Error Handling subsection:

```markdown
### Synchronous Execution & Spawn

- All function calls block by default (compiled as `async/await` in JS)
- `~> func(args)` → spawns non-blocking call, returns `Spawn` struct
- `~> func(args).onError(handlerFn)` → spawn with error handler
- `Spawn#s = ~> func()` → capture spawn in variable
- Spawn auto-imported from `std/spawn` when `~>` is used
```

---

## Verification

After implementing all steps:

1. **Build the compiler:**
   ```bash
   npm run build
   ```
   Fix any TypeScript compilation errors.

2. **Test the example:**
   ```bash
   node dist/index.js examples/21_spawn.zz --stdout
   ```
   Expected output should show:
   - `import { Spawn } from "..."` at the top (auto-import)
   - All `function` declarations prefixed with `async`
   - All function calls prefixed with `await`
   - `~>` calls wrapped in `new Spawn(...)` WITHOUT `await`
   - `.onError(handleError)` chained on Spawn

3. **Run the example:**
   ```bash
   node dist/index.js examples/21_spawn.zz --run
   ```
   Should execute without errors.

4. **Test existing examples still work:**
   ```bash
   node dist/index.js examples/01_basics.zz --stdout
   node dist/index.js examples/08_functions.zz --stdout
   node dist/index.js examples/13_imports.zz --stdout
   ```
   All should compile without errors. Output should now include `async` and `await` keywords.

5. **Test AST output:**
   ```bash
   node dist/index.js examples/21_spawn.zz --ast
   ```
   Should show `SpawnExpression` nodes in the AST.

---

## Files Modified (Summary)

| File | Change |
|------|--------|
| `src/lexer.ts` | Add `SPAWN` token, modify `~` to check for `>` |
| `src/ast.ts` | Add `SpawnExpression` interface, update Expression union |
| `src/parser.ts` | Parse `~>` as statement and expression, register Spawn struct |
| `src/typechecker.ts` | Handle SpawnExpression in type checking/inference |
| `src/codegen.ts` | async functions, await calls, SpawnExpression gen, auto-import |
| `src/index.ts` | Update `--run` to use temp file + node subprocess |
| `std/spawn.js` | NEW — Spawn class implementation |
| `std/spawn.zz` | NEW — Spawn type declaration |
| `examples/21_spawn.zz` | NEW — Example demonstrating sync + spawn |
| `README.md` | Add Synchronous Execution & Spawn section |
| `CLAUDE.md` | Add spawn quick reference |
