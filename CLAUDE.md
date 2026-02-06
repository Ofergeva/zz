# ZZ Language - Project Context

## Overview

ZZ is a minimal, strongly-typed language that compiles to clean JavaScript. Uses symbols instead of keywords for concise syntax. Immutable by default, explicit mutability with `~`.

## Tech Stack

- TypeScript 5.3.0 compiler implementation
- Target: ES2022 JavaScript
- No runtime dependencies - pure JS output
- No library dependencies - everything needs to be implemented with native js

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
├── typechecker.ts # Static type validation
├── evaluator.ts   # Compile-time expression evaluator
├── codegen.ts     # JavaScript code generator
└── errors.ts      # Error formatting with source context

std/               # Standard library modules
├── string.zz      # String utilities (upper, lower, trim, split, etc.)
├── json.zz        # JSON utilities (parse, stringify, format, etc.)
├── http.zz        # HTTP client (get, post, put, del, etc.)
├── test.zz        # Testing framework (assert, assertEqual, etc.)
├── spawn.zz       # Async spawn utilities
├── fs.zz          # File system operations
├── math.zz        # Math utilities
└── time.zz        # Time and sleep utilities

examples/          # Example .zz files with compiled/ output
editors/           # Editor support
├── vim/           # Vim syntax highlighting
├── sublime-text/  # Sublime Text syntax highlighting
└── vscode/        # VS Code extension with LSP
```

## Compiler Pipeline

1. **Lexer** → Tokens
2. **Parser** → AST
3. **Type Checker** → Validation
4. **Evaluator** → Compile-time expression evaluation
5. **Code Generator** → JavaScript

## Language Syntax Quick Reference

### Types & Variables

- `s#name = "text"` → `const name = "text"` (string, immutable)
- `i~count = 0` → `let count = 0` (int, mutable)
- Primitives: `s` (string), `i` (int), `f` (float), `b` (bool)
- Arrays: `i[]` (dynamic), `i[5]` (fixed-size), supports complex element types
- Tuples: `ti5` (5 ints), `tiN` (inferred length), always immutable
- J objects: `J#config = { host: "localhost", port: 8080 }` (JSON-like, string-keyed)
- Null: `_` (no undefined in ZZ)
- String interpolation: `s"Hello, {name}!"`

### Arrays of Complex Types

Arrays can contain structs, enums, J objects, and tuples:

```zz
// Struct arrays
S Point i#x i#y ;
Point[]~points = [Point(1, 2), Point(3, 4)]
points.push(Point(5, 6))
print(points[0].x)

// Enum arrays
E Color Red Green Blue ;
Color[]~colors = [Color.Red, Color.Green]

// J object arrays
J[]~configs = [{ host: "a" }, { host: "b" }]
configs.push({ host: "c" })

// Tuple arrays
ti3[]~coords = [(1, 2, 3), (4, 5, 6)]
coords.push((7, 8, 9))

// Function with complex array parameter
Z printPoints(Point[]#pts)
  @(p#pts) print(s"({p.x}, {p.y})") ;
;

// Function returning complex array
Point[] Z makePoints()
  [Point(10, 20), Point(30, 40)]
;
```

- All array methods (`push`, `pop`, `len`) work with complex element types
- Type checking ensures correct element types for push and index assignment
- Fixed-size arrays (`Point[3]#`) cannot use `push` or `pop`

### Control Flow

- `?(cond) ... ;` → if
- `:?(cond) ... ;` → else if
- `: ... ;` → else
- `@(cond) ... ;` → while
- `@(i#1..5) ... ;` → for loop (range)
- `@(item#array) ... ;` → for-each loop
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

### J Objects (JSON-like)

```zz
// Immutable J object
J#config = {
  host: "localhost",
  port: 8080,
  ssl: false,
  limits: { maxConn: 100, timeout: 30 }
}

// Mutable J object
J~settings = { theme: "dark", fontSize: 14 }
settings.theme = "light"           // field assignment (mutable only)
settings.set("fontSize", 16)       // set method (mutable only)

// Dot access
print(config.host)
print(config.limits.maxConn)

// Built-in UFCS methods
config.has("host")                 // bool — key exists?
config.get("port")                 // dynamic — get value by key
settings.set("theme", "light")     // mutates in-place (J~ only)
config.len()                       // int — number of keys

// J as function parameter and return type
J Z makeConfig(s#host i#port)
  { host: host, port: port, ssl: true }
;

Z printHost(J#cfg)
  print(cfg.host)
;
```

- `J#` is immutable (`Object.freeze()` in JS), `J~` is mutable
- Values must be `s`, `i`, `f`, `b`, `_` (null), or nested `J`
- Dot access returns dynamic/untyped values
- `set()` and field assignment are compile errors on `J#`

### Pattern Matching

```zz
// ?? operator with | arms and => results
??(value)
  | Pattern1 => body1
  | Pattern2 => body2
  | _        => default
;
```

- Enum patterns: `| Color.Red => ...`
- Literal patterns: `| 42 => ...`, `| "hello" => ...`
- Struct destructuring: `| Point(0, y) => ...` (binds `y`, matches literal `0`)
- J destructuring: `| { status: 200, body: b } => ...` (matches key existence + literal values, binds `b`)
- Binding patterns: `| v => ...` (captures value into `v`)
- Wildcard: `| _ => ...` (catch-all)
- Guards: `| Point(x, y) & x > 0 && y > 0 => ...`
- Match as expression: `i Z fn(i#n) ??(n) | 0 => 10 | _ => 0 ; ;`
- Exhaustiveness checking for enums
- Compiles to IIFE with if/else-if chain

### Generics

Generics enable type-safe, reusable code with type parameters.

#### Generic Structs

```zz
S Stack<T>
  T[]#items

  Z push(T#item)
    items.push(item)
  ;

  i Z size()
    items.len()
  ;
;

Stack<i>#intStack = Stack<i>([])
intStack.push(10)

Stack<s>#strStack = Stack<s>([])
strStack.push("hello")
```

Multi-parameter generics:
```zz
S Pair<A, B>
  A#first
  B#second
;

Pair<i, s>#p = Pair<i, s>(42, "answer")
```

#### Generic Functions

```zz
<T> T Z first(T[]#arr)
  arr[0]
;

i#x = first([1, 2, 3])       // T inferred as i
s#y = first(["a", "b"])      // T inferred as s

// Explicit type args
i#z = first<i>([1, 2, 3])
```

Multi-parameter:
```zz
<T, U> U Z transform(T[]#arr, T#defaultVal)
  // ...
;
```

#### Type Inference

- **Function calls**: Type arguments inferred from argument types
- **Struct instantiation**: Type arguments must be explicit in variable declaration
- **Inference rules**:
  - `T#param` matches argument type directly
  - `T[]#param` matches array element type
  - Multiple occurrences of `T` must match the same type

#### Semantics

- **Erasure-based**: Type parameters are compile-time only, stripped in JS output (no monomorphization)
- **No constraints**: Any type can be used for type parameters (constraints are future work)
- **Type safety**: Full compile-time type checking with substitution

#### Limitations (v1)

- No higher-kinded types
- Type parameters cannot be used in comptime expressions
- Struct methods should avoid names like `len`, `push`, `pop` that conflict with built-in array methods

### Traits

Traits are compile-time contracts (interfaces) that structs can implement. They enable polymorphism without inheritance. Traits have **no runtime representation** — all checking is compile-time, and trait declarations emit no JavaScript code.

#### Trait Declaration

Use the `ZZ` keyword to declare a trait:

```zz
ZZ Printable
  s Z toString()
;

ZZ Comparable
  i Z compareTo(Self#other)
;

ZZ Describable
  Z describe()
;
```

- Methods are signatures only (no body)
- `Self` can be used in parameter types to refer to the implementing struct type

#### Struct Implementation

Use `:` after the struct name to implement traits:

```zz
S Point : Printable, Comparable
  f#x
  f#y

  s Z toString()
    s"({x}, {y})"
  ;

  i Z compareTo(Point#other)
    i(x + y) - i(other.x + other.y)
  ;
;
```

- A struct can implement multiple traits (comma-separated)
- The compiler validates that all required methods are present with matching signatures
- `Self` in trait methods is substituted with the implementing struct type during checking

#### Trait as Type

Traits can be used as parameter types for polymorphism:

```zz
Z display(Printable#item)
  print(item.toString())
;

Point#p = Point(3.0, 4.0)
display(p)  // Works — Point implements Printable
```

- Trait-typed variables accept any struct that implements the trait
- Method calls on trait-typed values resolve to the trait's method signatures
- Traits can be used in variable declarations: `Printable#p = Point(1.0, 2.0)`

#### Semantics

- **Erasure-based**: Traits are compile-time only, no runtime representation
- **No inheritance**: Traits cannot extend other traits
- **Self type**: `Self` in trait methods refers to the concrete implementing type
- **Exported**: Traits can be exported (`->`) and imported (`<-`) across modules

### JS Injection

- `$js { code }` → injects raw JavaScript verbatim into output
- Lexer captures entire block as single token (JS is not tokenized as ZZ)
- Nested `{}` in JS code handled via brace-depth tracking
- No type checking on injected code
- No trailing `;` needed — `}` terminates the block
- ZZ-defined variables are accessible in the JS block

### Compile-Time Execution

Code inside `${}` is evaluated at compile time and substituted with literal values.

```zz
// Basic arithmetic - evaluated at compile time
i#computed = ${2 + 3 * 4}        // → const computed = 14;

// String operations
s#greeting = ${"Hello" + ", World!"}

// Environment variables
s#env = ${$env("NODE_ENV", "development")}

// Build metadata
s#buildDate = ${$date()}
i#lineNum = ${$line()}
```

**Compile-time functions** (`$Z`):

```zz
$Z i factorial(i#n)
  ??(n)
    | 0 => 1
    | 1 => 1
    | _ => n * factorial(n - 1)
  ;
;

i#fact5 = ${factorial(5)}        // → const fact5 = 120;
```

**Rules:**

- `$Z` functions can only call other `$Z` functions (no runtime function calls)
- Inside `$Z` body, calls to `$Z` functions are implicitly compile-time
- Runtime code must use `${}` to call `$Z` functions
- `$Z` functions are NOT emitted to JS output

**Allowed at compile time:**

- Literals, arithmetic, string operations, comparisons, logical ops
- Match expressions (pattern matching)
- Array/tuple/J literals with compile-time elements
- Calls to `$Z` functions and built-in `$` functions

**Forbidden at compile time:**

- Runtime variable references
- Runtime function calls (regular `Z` functions)
- Side effects: `print()`, `error()`, file writes
- Mutability: no `~` variables in compile-time context

**Built-in compile-time functions:**

| Function              | Description                        |
| --------------------- | ---------------------------------- |
| `$read(path)`         | Read file contents at compile time |
| `$env(name)`          | Get environment variable           |
| `$env(name, default)` | Get env var with default           |
| `$defined(name)`      | Check if env var exists            |
| `$line()`             | Current source line number         |
| `$file()`             | Current source file name           |
| `$date()`             | Compile date (ISO format)          |
| `$time()`             | Compile time (ISO format)          |

### Modules

- `->` export, `<-` safe import (ZZ modules), `<-!` unsafe import (JS modules)
- Standard library: `<- { trim, split } = std/string` (unquoted, compiler resolves path)
- ZZ module imports: `<- { add } = "./lib/math"` (requires .zz source file)
- JS module imports: `<-! { fetch } = "./lib/http"` (for npm/JS libraries without .zz source)
- Import paths in ZZ are relative to the source `.zz` file, not the compiled output
- `.js` extension is optional (auto-appended by compiler)
- **Safe import type resolution**: `<-` imports parse the imported .zz file and extract full type signatures (function params/return types, variable types, structs, enums, traits). The type checker validates calls against real types.
- **Auto-compilation**: Safe imports auto-compile the imported .zz file to .js if missing or stale (timestamp check). 1 level only — transitive imports are not followed.
- Functions exported inside raw `$js{}` blocks fall back to placeholder types (untyped)
- **Unsafe imports** (`<-!`): No type checking — all bindings get placeholder types

### Error Handling

- `? ... :(e) ... ;` → try-catch
- `>X(expr)` → throw

### Synchronous Execution & Spawn

- All function calls block by default (compiled as `async/await` in JS)
- `~> func(args)` → spawns non-blocking call, returns `Spawn` struct
- `~> func(args).onError(handlerFn)` → spawn with error handler
- `Spawn#s = ~> func()` → capture spawn in variable
- Spawn auto-imported from `std/spawn` when `~>` is used

### Operators

- `**` for power, `..` for range (inclusive both ends)
- `++`/`--` increment/decrement
- `+=`, `-=`, `*=`, `/=`, `%=`, `**=` compound assignment

### Built-ins

- `print()`, `error()` → console.log/error
- `.len()` → .length
- `s()`, `i()`, `f()`, `b()` → type casting
- UFCS: `str.upper()` calls `upper(str)` (any function can be method-called)

### Standard Library

Import with `<- { funcName } = std/module`:

**std/string** - String manipulation
- `upper(s)`, `lower(s)`, `trim(s)` - case and whitespace
- `split(s, sep)`, `join(arr, sep)` - splitting and joining
- `has(s, sub)`, `find(s, sub)` - searching
- `starts(s, prefix)`, `ends(s, suffix)` - prefix/suffix checks
- `slice(s, start, end)`, `replace(s, old, new)` - modification
- `repeat(s, n)`, `padStart(s, len, pad)`, `padEnd(s, len, pad)`

**std/json** - JSON utilities
- `parse(s)` - parse JSON string to J object
- `stringify(j)`, `format(j)` - convert J to string
- `isValid(s)` - check if string is valid JSON
- `get(j, path)` - get nested value by dot path
- `clone(j)`, `merge(a, b)` - object operations
- `keys(j)`, `values(j)` - get keys/values arrays

**std/http** - HTTP client (using fetch)
- `get(url)`, `getWithHeaders(url, headers)` - GET requests
- `post(url, body)`, `postWithHeaders(url, body, headers)` - POST requests
- `put(url, body)`, `del(url)`, `patch(url, body)` - other methods
- `parseJson(response)`, `isOk(response)` - response helpers
- `encodeUrl(s)`, `decodeUrl(s)`, `buildQuery(j)` - URL utilities
- Returns `Response` struct with `status`, `statusText`, `body`, `headers`

**std/test** - Testing framework
- `assert(cond, msg)` - assert condition is true
- `assertEqual(actual, expected, msg)` - compare integers
- `assertEqualStr(actual, expected, msg)` - compare strings
- `assertApprox(actual, expected, epsilon, msg)` - compare floats
- `assertFalse(cond, msg)`, `assertContains(str, sub, msg)`
- `assertNull(val, msg)`, `assertNotNull(val, msg)`
- `fail(msg)`, `skip(reason)` - test control

## Error Messages

Compiler errors include source context for easy debugging:

```
Error at line 4: Type mismatch: cannot assign int to string variable 'name'
   3 | // Type mismatch error
   4 | s#name = 123
```

The `ZZError` class in `src/errors.ts` provides structured error information with line/column tracking.

## VS Code Extension

Full IDE support available in `editors/vscode/`:

- **Real-time diagnostics** - see errors as you type
- **Autocomplete** - keywords, functions, variables, struct members
- **Go-to-definition** - jump to declarations
- **Hover information** - type hints

Install: See `editors/vscode/README.md` for setup instructions.

## Conventions

- 2-space indentation in generated JS
- Variable names preserved exactly
- Parentheses added for operator precedence safety
- Range loops generate ascending/descending handling
- Two-pass parsing: collect enum/struct/trait names first, then parse (enables forward references)
- Structs compile to JS classes, enums to frozen objects, traits compile to nothing (erasure)
- Implicit int→float widening: passing `int` where `float` is expected is allowed (assignments, arguments, returns)

## Agent instructions

- After every change or improvement to the ZZ language, update the CLAUDE.md and README.md files.
- After every change or improvement to the ZZ language, update the examples/25_stress_test.zz and make sure it still passes.
