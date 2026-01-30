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
- Types: `s` (string), `i` (int), `f` (float), `b` (bool)
- Arrays: `i[]` (dynamic), `i[5]` (fixed-size)

### Control Flow
- `?(cond) ... ;` → if
- `:?(cond) ... ;` → else if
- `: ... ;` → else
- `@(cond) ... ;` → while
- `@(i#1..5) ... ;` → for loop (range)
- `>!` → break, `>>` → continue

### Functions
- `Z funcName() ... ;` → void function
- `i Z add(i#a, i#b) -> a + b ;` → typed return

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

## Conventions
- 2-space indentation in generated JS
- Variables names preserved exactly
- Parentheses added for operator precedence safety
- Range loops generate ascending/descending handling
