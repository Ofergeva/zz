# ZZ Language — Agent Reference

ZZ is a minimal, strongly-typed language that compiles to JavaScript. It uses symbols instead of keywords. Immutable by default, explicit mutability with `~`. Every block ends with `;`.

## Critical Rules

These cause compile errors if violated. Read before writing any ZZ code.

1. **Every block ends with `;`** — if/else, loops, functions, structs, enums, traits, pattern match, try-catch. No exceptions.
2. **Conditions must be boolean** — `?(count)` is illegal. Write `?(count > 0)`. No truthy/falsy coercion.
3. **No `undefined`** — only `_` (null). `?(x == _)` for null checks.
4. **Variables must be declared with type** — `x = 5` is illegal. Write `i#x = 5`.
5. **`#` = immutable (const), `~` = mutable (let)** — reassigning `#` variables is a compile error.
6. **No lambdas or anonymous functions** — all functions must be named with `Z`.
7. **No higher-order array methods** — no `.map()`, `.filter()`, `.reduce()`. Use `@(item#arr)` loops.
8. **Tuples are always immutable** — `ti3~x` is illegal. Only `ti3#x`.
9. **Fixed-size arrays cannot push/pop** — `i[5]#arr` has no `.push()` or `.pop()`.
10. **Division always returns float** — `10 / 3` is `3.333...`, use `i(10 / 3)` for integer division.
11. **Logical operators require boolean operands** — `!count` is illegal. Write `!(count > 0)`.
12. **Struct fields accessible directly in methods** — no `this.` or `self.` prefix.
13. **Last expression in a function is the return value** — no `return` keyword.
14. **All functions compile to async/await** — all calls block by default.
15. **String interpolation requires `s` prefix** — `s"Hello, {name}!"` not `"Hello, {name}!"`.

## Types & Variables

### Primitives

```
s#name = "hello"       // immutable string
s~name = "hello"       // mutable string
i#count = 42           // immutable int
i~count = 0            // mutable int
f#pi = 3.14            // immutable float
f~x = 0.0              // mutable float
b#flag = true           // immutable bool
b~done = false          // mutable bool
```

### Null

```
s~value = _             // null
?(value == _)           // null check
  print("is null")
;
```

### Arrays

```
i[]#nums = [1, 2, 3]           // immutable dynamic int array
i[]~nums = [1, 2, 3]           // mutable dynamic int array
i[5]#fixed = [1, 2, 3, 4, 5]   // fixed-size (no push/pop)
s[]#words = ["a", "b"]          // string array
```

Array methods: `.len()`, `.push(val)` (mutable dynamic only), `.pop()` (mutable dynamic only), `arr[i]` index access, `arr[i] = val` index assignment (mutable only).

### Multi-dimensional Arrays

```
i[][]~matrix = [[1, 2, 3], [4, 5, 6]]     // 2D int array
matrix[0][1]                                // 2
matrix.push([7, 8, 9])                      // push a row

i[][][]#cube = [[[1, 2], [3, 4]], [[5, 6], [7, 8]]]  // 3D
cube[0][0][0]                                // 1

s[][]#words = [["hello", "world"], ["foo"]]  // 2D string array
Point[][]#grid = [[Point(0,0)], [Point(1,1)]]  // 2D struct array
```

Nest to any depth. All array operations (push, pop, len, indexing) work at each level. Type checking validates element types at every nesting level.

### Tuples

```
ti3#point = (1, 2, 3)          // tuple of 3 ints (always immutable)
tiN#inferred = (10, 20, 30)    // length inferred
tsN#words = ("a", "b", "c")    // string tuple
```

Syntax: `t{type}{length}` — type is `i`/`f`/`s`/`b`, length is number or `N` (inferred). Only `.len()` and index access. Always homogeneous. `tiN(arr)` converts array to tuple, `i[](tup)` converts tuple to array.

### Ranges

```
i[]#r = 1..5            // [1, 2, 3, 4, 5] — inclusive both ends
```

### Type Casting

```
i#x = i("42")           // string → int
s#y = s(42)             // int → string
f#z = f(42)             // int → float
i#w = i(3.7)            // float → int (truncates to 3)
b#v = b(1)              // int → bool
```

Implicit int→float widening is allowed (passing `int` where `float` expected).

### String Interpolation

```
s#msg = s"Hello, {name}! You are {age} years old."
```

Must use `s"..."` prefix. Plain `"..."` is a regular string literal.

## Control Flow

### If / Else If / Else

```
?(condition)
  // body
;

?(condition)
  // body
:?(other_condition)
  // else if body
:
  // else body
;
```

### While Loop

```
@(condition)
  // body
;
```

### For Loop (Range)

```
@(i#1..5)               // i goes 1, 2, 3, 4, 5 (inclusive)
  print(i)
;

@(i#5..1)               // descending: 5, 4, 3, 2, 1
  print(i)
;

@(n#start..end)          // variable bounds
  print(n)
;
```

### For-Each Loop

```
@(item#array)
  print(item)
;
```

### Break and Continue

```
>!                       // break
>>                       // continue
```

## Functions

```
// Void function
Z greet(s#name)
  print(s"Hello, {name}!")
;

// Function with return type (type before Z)
i Z add(i#a i#b)
  a + b
;

// Last expression is the return value — no return keyword
s Z format(s#name i#age)
  s"{name} is {age}"
;

// Calling functions
greet("Alice")
i#sum = add(3, 5)

// Named arguments
i#result = add(b=5, a=3)
```

## Structs

```
S Point
  i#x
  i#y

  s Z toString()
    s"({x}, {y})"
  ;

  i Z manhattan()
    x + y
  ;
;

// Instantiation
Point#p = Point(10, 20)          // immutable — fields can't change
Point~q = Point(10, 20)          // mutable — fields can change
Point#p2 = Point(x=5, y=15)     // named args

// Access
print(p.x)                       // field access
print(p.toString())               // method call
q.x = 99                          // field assignment (mutable only)
```

Fields accessible directly in methods (implicit self). Structs compile to JS classes.

### Arrays of Structs

```
Point[]~points = [Point(1, 2), Point(3, 4)]
points.push(Point(5, 6))
print(points[0].x)
```

## Enums

```
E Color
  Red
  Green
  Blue
;

Color#c = Color.Red
?(c == Color.Green)
  print("green")
;
```

Type-safe: can't compare different enum types, can't use unknown variants.

## Traits

Compile-time contracts. No runtime representation — emit no JavaScript.

```
// Declaration
ZZ Printable
  s Z toString()
;

ZZ Comparable
  i Z compareTo(Self#other)       // Self = the implementing struct type
;

// Implementation — use : after struct name
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

// Trait as parameter type (polymorphism)
Z display(Printable#item)
  print(item.toString())
;

display(Point(3.0, 4.0))         // works — Point implements Printable

// Trait-typed variable
Printable#p = Point(1.0, 2.0)
```

## Generics

### Generic Structs

```
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

// Multi-parameter
S Pair<A, B>
  A#first
  B#second
;

Pair<i, s>#p = Pair<i, s>(42, "answer")
```

### Generic Functions

```
<T> T Z first(T[]#arr)
  arr[0]
;

i#x = first([1, 2, 3])          // T inferred as i
s#y = first(["a", "b"])         // T inferred as s
i#z = first<i>([1, 2, 3])      // explicit type arg
```

Erasure-based: type parameters are compile-time only, stripped in JS output. No constraints on type parameters.

## J Objects (JSON-like)

```
// Immutable (Object.freeze in JS)
J#config = {
  host: "localhost",
  port: 8080,
  tags: ["web", "api"],
  nested: { maxConn: 100 }
}

// Mutable
J~settings = { theme: "dark", fontSize: 14 }

// Dot access
print(config.host)
print(config.nested.maxConn)

// Mutation (J~ only — compile error on J#)
settings.theme = "light"
settings.set("fontSize", 16)

// Built-in methods
config.has("host")               // bool
config.get("port")               // dynamic value
settings.set("key", value)       // mutable only
config.len()                     // number of keys

// As function parameter/return
J Z makeConfig(s#host i#port)
  { host: host, port: port }
;

Z readConfig(J#cfg)
  print(cfg.host)
;
```

Values: `s`, `i`, `f`, `b`, `_` (null), nested `J`, or arrays of these types. Dot access returns dynamic/untyped values.

### Arrays in J Objects

```
J#data = {
  tags: ["a", "b", "c"],
  scores: [1, 2, 3],
  nested: { items: [10, 20] }
}
```

J values can contain arrays of primitives (`i[]`, `s[]`, `f[]`, `b[]`), arrays of J (`J[]`), and nested arrays (`i[][]`). Struct/enum arrays in J are not allowed.

### J Object Arrays

```
J[]~configs = [{ host: "a" }, { host: "b" }]
configs.push({ host: "c" })
```

## Pattern Matching

```
??(value)
  | pattern => body
  | pattern => body
  | _       => default
;
```

### Pattern Types

```
// Enum
??(color)
  | Color.Red   => print("red")
  | Color.Green => print("green")
  | Color.Blue  => print("blue")
;

// Literals
??(n)
  | 0 => print("zero")
  | 1 => print("one")
  | _ => print("other")
;

// Struct destructuring
??(point)
  | Point(0, 0)    => print("origin")
  | Point(0, y)    => print(s"y-axis: {y}")
  | Point(x, 0)    => print(s"x-axis: {x}")
  | Point(x, y)    => print(s"({x}, {y})")
;

// J object destructuring
??(response)
  | { status: 200, body: b } => print(s"OK: {b}")
  | { status: 404 }          => print("not found")
  | _                        => print("unknown")
;

// Guards (use & then condition)
??(point)
  | Point(x, y) & x > 0 && y > 0 => print("quadrant I")
  | _                              => print("other")
;

// Binding pattern
??(n)
  | v & v > 100 => print(s"large: {v}")
  | v           => print(s"small: {v}")
;

// Match as expression (returns value)
i Z classify(i#n)
  ??(n)
    | 0 => 10
    | _ => 0
  ;
;
```

Enum matches are checked for exhaustiveness at compile time.

## Modules & Imports

### Exporting

```
->i Z add(i#a i#b) a + b ;      // export function
->s#VERSION = "1.0.0"            // export variable
->S Point i#x i#y ;              // export struct
->E Color Red Green Blue ;       // export enum
->ZZ Printable s Z toString() ;  // export trait
```

### Safe Imports (`<-`) — from .zz modules, fully type-checked

```
// Standard library (unquoted path)
<- { upper, trim, split } = std/string
<- { sqrt, floor, PI } = std/math

// Your own .zz modules (quoted path, relative to source file)
<- { add, subtract } = "./math"

// Aliased import
<- { add, pi=PI } = "./math"

// Namespace import
<- math = "./math"
math.add(1, 2)
```

### Unsafe Imports (`<-!`) — from JS/npm, no type checking

```
<-! { readFile } = "fs"
<-! { fetch } = "node-fetch"
<-! { helper } = "./lib/utils"
```

Auto-compilation: safe imports auto-compile the imported .zz file if stale.

## Error Handling

### Try-Catch

```
?
  // try body
:(e)
  // catch body — e is the error
;
```

### Throw

```
>X("Something went wrong!")
>X(s"Error: {details}")
```

### Console Error

```
error("goes to stderr")
print("goes to stdout")
```

## Spawn (Non-blocking Calls)

All function calls block by default. Use `~>` for fire-and-forget:

```
~> updateData(url, data)                     // non-blocking
~> riskyOp(args).onError(handleError)        // with error handler
Spawn#task = ~> longRunning(args)            // capture spawn
```

## JS Injection

```
$js {
  // Raw JavaScript — not type-checked
  // Nested { braces } are fine
  // ZZ variables are accessible
  console.log("raw JS: " + someZzVar);
}
```

No trailing `;` needed after `}`.

## Compile-Time Execution

```
i#val = ${2 + 3 * 4}                        // → 14 at compile time
s#env = ${$env("NODE_ENV", "development")}
s#date = ${$date()}
i#line = ${$line()}
b#hasKey = ${$defined("API_KEY")}

// Compile-time functions — not emitted to JS
$Z i factorial(i#n)
  ??(n)
    | 0 => 1
    | 1 => 1
    | _ => n * factorial(n - 1)
  ;
;

i#fact5 = ${factorial(5)}                    // → 120
```

`$Z` functions can only call other `$Z` functions. No side effects, no runtime variables, no mutations.

Built-in: `$read(path)`, `$env(name)`, `$env(name, default)`, `$defined(name)`, `$line()`, `$file()`, `$date()`, `$time()`.

## Standard Library

Import with `<- { func } = std/module`.

### std/string

```
upper(s#str) → s                    lower(s#str) → s
trim(s#str) → s                     split(s#str, s#sep) → s[]
has(s#str, s#sub) → b               find(s#str, s#sub) → i
starts(s#str, s#pre) → b            ends(s#str, s#suf) → b
slice(s#str, i#start, i#end) → s    replace(s#str, s#old, s#new) → s
repeat(s#str, i#n) → s              join(s[]#arr, s#sep) → s
padStart(s#str, i#len, s#pad) → s   padEnd(s#str, i#len, s#pad) → s
```

### std/math

```
abs(x) floor(x) ceil(x) round(x) trunc(x) sign(x)
sqrt(x) cbrt(x) pow(x, y) exp(x)
log(x) log10(x) log2(x)
sin(x) cos(x) tan(x) asin(x) acos(x) atan(x) atan2(y, x)
min(a, b) max(a, b) random() randomInt(min, max)
PI() E()
```

### std/array

```
includes(arr, val) → b              indexOf(arr, val) → i
lastIndexOf(arr, val) → i           reverse(arr) → arr
slice(arr, start, end) → arr        concat(arr1, arr2) → arr
flat(arr) → arr                     flatDeep(arr) → arr
fill(arr, val) → arr                join(arr, sep) → s
first(arr) → val                    last(arr) → val
isEmpty(arr) → b                    sort(arr) → arr
sortDesc(arr) → arr                 sortStr(arr) → arr
sum(arr) → num                      product(arr) → num
average(arr) → num                  minVal(arr) → num
maxVal(arr) → num                   unique(arr) → arr
count(arr, val) → i
```

### std/json

```
parse(s) → J                    parseArray(s) → J[]
parseIntArray(s) → i[]          parseStrArray(s) → s[]
isArray(j) → b                  isValid(s) → b
stringify(j) → s                format(j, indent) → s
get(j, path) → J                clone(j) → J
merge(a, b) → J                 keys(j) → s[]
values(j) → J[]
```

### std/http

```
get(url) getWithHeaders(url, headers)
post(url, body) postWithHeaders(url, body, headers)
put(url, body) del(url) patch(url, body)
parseJson(response) isOk(response)
encodeUrl(s) decodeUrl(s) buildQuery(j)
```

Returns `Response` struct with `status`, `statusText`, `body`, `headers`.

### std/test

```
assert(b#cond, s#msg)               assertFalse(b#cond, s#msg)
assertEqual(i#actual, i#expected, s#msg)
assertEqualStr(s#actual, s#expected, s#msg)
assertApprox(f#actual, f#expected, f#epsilon, s#msg)
assertContains(s#str, s#sub, s#msg)
assertNull(val, s#msg)              assertNotNull(val, s#msg)
fail(s#msg)                         skip(s#reason)
```

### std/fs, std/time, std/spawn

Available but less commonly used. Import with `<- { func } = std/fs` etc.

## UFCS (Universal Function Call Syntax)

Any function `f(x, ...)` can be called as `x.f(...)`:

```
<- { upper, trim } = std/string
s#clean = "  hello  ".trim().upper()   // "HELLO"

// Works with your own functions too
s Z shout(s#str) str.upper() + "!" ;
print("hello".shout())                // "HELLO!"
```

## Built-in Functions & Methods

```
print(x)         // console.log
error(x)         // console.error
.len()           // works on strings, arrays, tuples, J objects
.at(i)           // string character at index
s(x) i(x) f(x) b(x)  // type casting functions
```

## Operators

| Operator | Meaning |
|----------|---------|
| `+` `-` `*` `/` `%` | arithmetic |
| `**` | power |
| `==` `!=` `>` `<` `>=` `<=` | comparison |
| `&&` `\|\|` `!` | logical (bool operands only) |
| `++` `--` | increment/decrement (mutable only) |
| `+=` `-=` `*=` `/=` `%=` `**=` | compound assignment (mutable only) |
| `..` | range (inclusive both ends) |

## Common Pitfalls

### From JavaScript/TypeScript

| JS/TS habit | ZZ equivalent |
|------------|---------------|
| `if (x)` | `?(x != _)` or `?(x > 0)` — must be bool |
| `const x = 5` | `i#x = 5` — type prefix required |
| `let x = 5` | `i~x = 5` — `~` for mutable |
| `arr.map(x => x * 2)` | `@(x#arr) ... ;` loop — no lambdas |
| `arr.filter(x => x > 0)` | build new array in a loop |
| `return value` | just write `value` as last expression |
| `x?.field` | no optional chaining — check `?(x != _)` first |
| `undefined` | use `_` (null) |
| `` `Hello ${name}` `` | `s"Hello, {name}!"` — `s` prefix, `{}` not `${}` |
| `obj["key"]` | `obj.get("key")` for J objects |
| `console.log()` | `print()` |
| `try {} catch {}` | `? ... :(e) ... ;` |
| `throw new Error()` | `>X("message")` |
| `break` | `>!` |
| `continue` | `>>` |

### From Python

| Python habit | ZZ equivalent |
|-------------|---------------|
| `for x in arr:` | `@(x#arr) ... ;` — semicolon terminates |
| `if x:` | `?(x > 0)` — explicit bool condition |
| `def f(x):` | `Z f(i#x) ... ;` — typed params |
| `f"string {x}"` | `s"string {x}"` — `s` prefix |
| `None` | `_` |
| indentation blocks | `;` terminates every block |

## What ZZ Does NOT Have

- No lambdas / anonymous functions / closures
- No `.map()`, `.filter()`, `.reduce()` on arrays
- No classes / inheritance (use structs + traits)
- No `undefined` (only `_` null)
- No optional chaining (`?.`)
- No nullish coalescing (`??`)
- No ternary operator (`? :`) — use pattern matching or if/else
- No destructuring in variable declarations (only in pattern matching)
- No spread operator (`...`)
- No async/await syntax (all calls are synchronous by default, compiled as async)
- No `return` keyword (last expression is return value)
- No `this` / `self` (struct fields accessed directly in methods)
- No string methods beyond `.len()` and `.at()` (use std/string imports)
- No type unions / sum types
- No interfaces (use traits with `ZZ`)
- No generics constraints / bounds
- No default parameter values

## Compilation & Execution

```bash
node dist/index.js file.zz            # compile to compiled/file.js
node dist/index.js file.zz --run      # compile and execute
node dist/index.js file.zz --stdout   # output JS to console
```
