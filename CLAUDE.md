# ZZ Language - Project Context

## Overview
ZZ is a minimal, strongly-typed language that compiles to clean JavaScript. Uses symbols instead of keywords for concise syntax. Immutable by default, explicit mutability with `~`.

## Tech Stack
- TypeScript 5.3.0 compiler implementation
- Target: ES2022 JavaScript
- No runtime dependencies - pure JS output

## Commands
```bash
npm run build                    # Compile TypeScript to dist/
node dist/index.js <file.zz>     # Compile .zz file to compiled/<name>.js
node dist/index.js <file.zz> --run    # Compile and execute
node dist/index.js <file.zz> --stdout # Output to console
node dist/index.js <file.zz> --ast    # Debug: show tokens and AST
```

## Project Structure
```
src/
├── index.ts       # CLI entry point
├── lexer.ts       # Tokenizer (100+ token types)
├── parser.ts      # Recursive descent parser
├── ast.ts         # AST node type definitions
├── codegen.ts     # JavaScript code generator
└── typechecker.ts # Static type validation

examples/          # Example .zz files with compiled/ output
editors/           # Vim, Sublime syntax highlighting
vscode-zz/         # VS Code extension
```

## Compiler Pipeline
1. **Lexer** → Tokens
2. **Parser** → AST
3. **Type Checker** → Validation
4. **Code Generator** → JavaScript

## Language Syntax Quick Reference

### Types & Variables
- `s#name = "text"` → `const name = "text"` (string, immutable)
- `i~count = 0` → `let count = 0` (int, mutable)
- Primitives: `s` (string), `i` (int), `f` (float), `b` (bool)
- Arrays: `i[]` (dynamic), `i[5]` (fixed-size)
- Tuples: `ti5` (5 ints), `tiN` (inferred length), always immutable
- Null: `_` (no undefined in ZZ)
- String interpolation: `s"Hello, {name}!"`

### Control Flow
- `?(cond) ... ;` → if
- `:?(cond) ... ;` → else if
- `: ... ;` → else
- `@(cond) ... ;` → while
- `@(i#1..5) ... ;` → for loop (range)
- `>!` → break, `>>` → continue

### Functions
- `Z funcName() ... ;` → void function
- `i Z add(i#a i#b) a + b ;` → typed return (last expr is return value)

### Enums
```zz
E Color Red Green Blue ;     // Declaration
Color#c = Color.Red          // Usage
```

### Structs
```zz
S Person                     // Declaration
  s#name                     // Fields use type#name
  i#age

  s Z greet()                // Methods inside struct
    s"Hello, {name}!"        // Implicit self (fields accessible directly)
  ;
;

Person#p = Person("Alice", 30)   // Immutable instance
Person~q = Person("Bob", 25)     // Mutable instance (can modify fields)
print(p.name)                    // Field access
print(p.greet())                 // Method call
q.age = 26                       // Field assignment (mutable only)
```
Generated as JavaScript classes.

### Modules
- `->` export, `<-` import

### Error Handling
- `? ... :(e) ... ;` → try-catch
- `>X(expr)` → throw

### Operators
- `**` for power, `..` for range (inclusive both ends)
- `++`/`--` increment/decrement
- `+=`, `-=`, `*=`, `/=`, `%=`, `**=` compound assignment

### Built-ins
- `print()`, `error()` → console.log/error
- `.len()` → .length
- `s()`, `i()`, `f()`, `b()` → type casting
- UFCS: `str.upper()` calls `upper(str)` (any function can be method-called)

## Conventions
- 2-space indentation in generated JS
- Variable names preserved exactly
- Parentheses added for operator precedence safety
- Range loops generate ascending/descending handling
- Two-pass parsing: collect enum/struct names first, then parse (enables forward references)
- Structs compile to JS classes, enums to frozen objects
