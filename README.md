# ZZ (Double Zeta) Programming Language

A minimal, strongly-typed programming language that compiles to JavaScript.

## Design Philosophy

> If JavaScript allows something ambiguous, implicit, or surprising, ZZ must either forbid it or make it explicit in syntax.

### Why Symbols

ZZ uses symbols (`#`, `~`, `?`, `@`, `;`) instead of keywords (`const`, `let`, `if`, `while`). This isn't about being cryptic—it's about **information density**.

- **Visual structure**: Code blocks become immediately apparent. A `?` always starts a conditional, `@` always starts a loop, `;` always ends a block.
- **Reduced noise**: Keywords compete with your variable names for attention. Symbols step out of the way.
- **Forced consistency**: There's only one way to write an if statement. No `if`/`else if`/`else` vs ternary debates.

> `Z` signifies functions. Lower case single letters are used for data types. Capital single letters are used for complex data types. All other keywords should be symbols.

### Why Immutability by Default

In JavaScript, `const` is an afterthought. In ZZ, mutability is the afterthought.

- **Explicit intent**: `~` screams "this will change." `#` is quiet, because unchanging values should be the norm.
- **Fewer bugs**: Most variables don't need to change. When you're forced to opt-in to mutability, you think harder about state.
- **Better reasoning**: Reading `i#count = 10` tells you this value is stable throughout its scope. No hunting for reassignments.

### Why JavaScript as a Target

JavaScript is everywhere—browsers, servers, edge functions, embedded systems. By compiling to JS:

- **Zero runtime**: ZZ doesn't ship a runtime or standard library. The output is just JavaScript.
- **Full interop**: Call any npm package. Use any JavaScript API. ZZ code and JS code coexist.
- **Readable output**: The generated JavaScript is clean and debuggable, not minified soup.
- **Proven foundation**: JavaScript's semantics are well-understood (and its sharp edges are exactly what ZZ smooths over).

### No Undefined

JavaScript has two "nothing" values: `null` and `undefined`. ZZ has one: `_` (null).

```zz
s~value = _          // null, not undefined
?(value == _)        // explicit null check
  print("empty")
;
```

A value either exists or it's `_`. No `typeof x === 'undefined'`, no `x ?? y` vs `x || y` confusion.

### Booleans Are Booleans

JavaScript's truthy/falsy coercion is a source of bugs. In ZZ, conditions must be boolean:

```zz
i#count = 0
?(count)             // ❌ Compile error: condition must be boolean
?(count > 0)         // ✅ Explicit comparison

s#name = ""
?(name)              // ❌ Compile error
?(name != _)         // ✅ Explicit null check
```

The `!`, `&&`, and `||` operators also require boolean operands—no `!!value` tricks.

### No Implicit Globals

In JavaScript, forgetting `let`/`const` creates a global variable. In ZZ, it's a compile error:

```zz
x = 5                // ❌ Compile error: Undeclared variable 'x'
i#x = 5              // ✅ Explicit declaration
```

Every variable must be declared with its type. Typos become compile errors, not silent bugs.

---

## Features

- Strong static typing with type inference
- **Generics** - Type-safe generic structs and functions with type inference
- **Traits** - Compile-time contracts for polymorphism without inheritance
- Immutable by default with explicit mutability
- Concise syntax using symbols instead of keywords
- Compiles to clean, readable JavaScript

## Installation

### option 1: npm implementation

```bash
npm install
npm run build
```

### option 2: global installation

```bash
chmod +x install.sh
./install.sh
```

## Usage

```bash
# Compile to ./compiled/<filename>.js (default)
node dist/index.js yourfile.zz

# Compile and run immediately
node dist/index.js yourfile.zz --run

# Output to stdout instead of file
node dist/index.js yourfile.zz --stdout

# Compile to specific output file
node dist/index.js yourfile.zz --output path/to/output.js

# Show AST for debugging
node dist/index.js yourfile.zz --ast
```

---

## Language Reference

### Types

| Prefix    | Type               | Example                            |
| --------- | ------------------ | ---------------------------------- |
| `s`       | string             | `s#name = "hello"`                 |
| `i`       | int                | `i#count = 42`                     |
| `f`       | float              | `f#pi = 3.14`                      |
| `b`       | bool               | `b#flag = true`                    |
| `i[]`     | int array          | `i[]#nums = [1, 2, 3]`             |
| `ti5`     | tuple of 5 ints    | `ti5#point = (1, 2, 3, 4, 5)`      |
| `tiN`     | tuple (inferred)   | `tiN#vals = (1, 2, 3)`             |
| `Color`   | enum type          | `Color#c = Color.Red`              |
| `J`       | JSON-like object   | `J#config = { port: 8080 }`        |
| `Point[]` | struct array       | `Point[]#pts = [Point(1,2)]`       |
| `Color[]` | enum array         | `Color[]#cols = [Color.Red]`       |
| `J[]`     | J object array     | `J[]#cfgs = [{ host: "a" }]`       |
| `ti3[]`   | tuple array        | `ti3[]#coords = [(1,2,3)]`         |

### Mutability

| Symbol | Meaning   | JavaScript |
| ------ | --------- | ---------- |
| `#`    | immutable | `const`    |
| `~`    | mutable   | `let`      |

```zz
s#name = "Alice"      // immutable string
i~counter = 0         // mutable int
counter = counter + 1 // OK - mutable
name = "Bob"          // ERROR - immutable
```

### Print

```zz
print("Hello, World!")
print(42)
print(myVariable)
```

### Operators

**Arithmetic:**

```zz
i#sum = 5 + 3      // 8
i#diff = 10 - 4    // 6
i#prod = 6 * 7     // 42
f#quot = 10 / 3    // 3.333... (division returns float)
i#mod = 10 % 3     // 1
i#pow = 2 ** 10    // 1024
```

**Comparison:**

```zz
b#eq = 5 == 5      // true
b#neq = 5 != 3     // true
b#gt = 5 > 3       // true
b#lt = 3 < 5       // true
b#gte = 5 >= 5     // true
b#lte = 3 <= 5     // true
```

**Logical:**

```zz
b#and = true && false  // false
b#or = true || false   // true
b#not = !true          // false
```

**Increment/Decrement:**

```zz
i~count = 10
count++                // 11
count--                // 10
```

**Compound Assignment:**

```zz
i~x = 100
x += 10                // 110
x -= 30                // 80
x *= 2                 // 160
x /= 4                 // 40

i~y = 17
y %= 5                 // 2

i~z = 2
z **= 8                // 256

s~text = "Hello"
text += " World"       // "Hello World"
```

### String Interpolation

Use `s"..."` for interpolated strings:

```zz
s#name = "Alice"
i#age = 30
print(s"Hello, {name}! You are {age} years old.")
// Output: Hello, Alice! You are 30 years old.
```

### Type Casting

| Function    | Converts to            |
| ----------- | ---------------------- |
| `s(expr)`   | string                 |
| `i(expr)`   | int (truncates)        |
| `f(expr)`   | float                  |
| `b(expr)`   | bool                   |
| `tiN(expr)` | tuple of ints          |
| `i[](expr)` | int array (from tuple) |

```zz
s#numStr = "42"
i#num = i(numStr)        // 42
s#back = s(num)          // "42"
i#truncated = i(3.7)     // 3

// Tuple casts
i[]#arr = [1, 2, 3]
tiN#tup = tiN(arr)       // array to tuple
i[]#back = i[](tup)      // tuple to array
```

### Null

Use `_` for null values:

```zz
s~value = _
?(value == _)
  print("Value is null")
;
```

---

## Control Flow

### If / Else If / Else

```zz
?(condition)
  // if body
;

?(condition)
  // if body
:?(other_condition)
  // else if body
:
  // else body
;
```

**Example:**

```zz
i#score = 85

?(score >= 90)
  print("A")
:?(score >= 80)
  print("B")
:?(score >= 70)
  print("C")
:
  print("F")
;
```

### While Loop

```zz
@(condition)
  // body
;
```

**Example:**

```zz
i~count = 0
@(count < 5)
  print(count)
  count = count + 1
;
```

### For Loop

```zz
@(variable#start..end)
  // body uses variable
;
```

**Example:**

```zz
// Count up: 1, 2, 3, 4, 5
@(i#1..5)
  print(i)
;

// Count down: 5, 4, 3, 2, 1
@(i#5..1)
  print(i)
;

// Using variables
i#from = 1
i#to = 10
@(n#from..to)
  print(n)
;
```

### For-Each Loop

```zz
@(variable#array)
  // body uses variable
;
```

**Example:**

```zz
s[]#people = ["Sam", "Anna", "Ben"]
@(person#people)
  print(person)
;
// Output: Sam, Anna, Ben

// Works with any array type
i[]#numbers = [10, 20, 30]
@(n#numbers)
  print(s"Number: {n}")
;
```

### Break and Continue

```zz
>!   // break - exit loop
>>   // continue - skip to next iteration
```

**Example:**

```zz
@(i#1..10)
  ?(i == 5)
    >>         // skip 5
  ;
  ?(i == 8)
    >!         // stop at 8
  ;
  print(i)
;
// Output: 1, 2, 3, 4, 6, 7
```

---

## Functions

### Declaration

```zz
// Void function (no return)
Z functionName(type#param1 type#param2)
  // body
;

// Function with return type
returnType Z functionName(type#param)
  // body
  returnExpression
;
```

**Examples:**

```zz
// Void function
Z greet(s#name)
  print(s"Hello, {name}!")
;

// Function returning int
i Z add(i#a i#b)
  a + b
;

// Function returning string
s Z format(s#name i#age)
  s"{name} is {age} years old"
;

// Recursive function
i Z factorial(i#n)
  i~result = 1
  ?(n > 1)
    result = n * factorial(n - 1)
  ;
  result
;
```

### Function Calls

```zz
// Positional arguments
greet("Alice")
i#sum = add(3, 5)

// Named arguments
i#result = add(b=5, a=3)  // same as add(3, 5)
```

---

## Arrays

### Declaration

```zz
// Dynamic arrays (size not specified)
i[]#numbers = [1, 2, 3, 4, 5]     // immutable int array
s[]~names = ["Alice", "Bob"]      // mutable string array
i[]#empty = []                     // empty array

// Fixed-size arrays (size specified)
i[5]#fixed = [1, 2, 3, 4, 5]      // fixed-size array of 5 ints
f[3]~coords = [0.0, 0.0, 0.0]    // fixed-size mutable array
```

**Fixed-size vs Dynamic arrays:**

- `i[]` - dynamic array, can grow/shrink with `push`/`pop`
- `i[5]` - fixed-size array of exactly 5 elements, `push`/`pop` not allowed

### Range Expression

```zz
i[]#range = 1..5    // [1, 2, 3, 4, 5]
i[]#countdown = 5..1  // [5, 4, 3, 2, 1] (when used in for loop)
```

### Index Access

```zz
i[]#arr = [10, 20, 30]
print(arr[0])         // 10
print(arr[2])         // 30
```

### Index Assignment

```zz
i[]~arr = [1, 2, 3]
arr[0] = 100
print(arr[0])         // 100
```

### Array Methods

```zz
i[]~arr = [1, 2, 3]

i#length = arr.len()  // 3 - works on all arrays
arr.push(4)           // arr is now [1, 2, 3, 4]
i#last = arr.pop()    // returns 4, arr is now [1, 2, 3]
```

**Note:** `push` and `pop` only work on dynamic arrays (`i[]`). Fixed-size arrays (`i[5]`) will produce a compile error if you try to use these methods.

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
```

Functions can take and return arrays of complex types:

```zz
// Complex array parameter
Z printPoints(Point[]#pts)
  @(p#pts) print(s"({p.x}, {p.y})") ;
;

// Complex array return type
Point[] Z makePoints()
  [Point(10, 20), Point(30, 40)]
;
```

### Array Parameters

```zz
i Z sum(i[]#numbers)
  i~total = 0
  @(n#numbers)
    total += n
  ;
  total
;

i[]#data = [1, 2, 3, 4, 5]
print(sum(data))      // 15
```

### Array Return Types

```zz
i[] Z makeRange(i#start i#end)
  start..end
;

i[]#nums = makeRange(1, 5)
```

---

## Tuples

Tuples are **fixed-length, immutable** sequences of values of the same type. Unlike arrays, tuples cannot be resized or modified after creation.

### Declaration

```zz
// Fixed-length tuple (explicit size)
ti5#nums = (1, 2, 3, 4, 5)        // tuple of 5 ints
ts3#names = ("a", "b", "c")       // tuple of 3 strings

// Inferred-length tuple (use N)
tiN#values = (10, 20, 30)         // inferred as ti3
tfN#coords = (1.0, 2.5, 3.7)      // inferred as tf3
```

**Syntax**: `t{type}{length}` where:

- `t` = tuple prefix
- type = `i` (int), `f` (float), `s` (string), `b` (bool)
- length = explicit number or `N` for inferred

### Tuple Literals

Use parentheses with commas to create tuple literals:

```zz
ti3#point = (10, 20, 30)
tsN#words = ("hello", "world")
```

**Note:** A single value in parentheses is just a grouped expression, not a tuple. Use casting for single-element tuples:

```zz
i#value = (42)        // just 42, not a tuple
tiN#single = tiN(42)  // single-element tuple
```

### Accessing Elements

```zz
ti5#data = (1, 2, 3, 4, 5)
print(data[0])        // 1
print(data[4])        // 5
print(data.len())     // 5
```

### Type Casting

Convert between tuples and arrays:

```zz
// Array to tuple
i[]#arr = [1, 2, 3]
tiN#tup = tiN(arr)    // freeze array into tuple

// Single value to tuple
tiN#single = tiN(42)  // (42)

// Tuple to array
ti3#frozen = (1, 2, 3)
i[]#mutable = i[](frozen)  // create mutable array copy
```

### Immutability

Tuples are **always immutable**. Using `~` (mutable) with tuples is a compile error:

```zz
ti3#ok = (1, 2, 3)    // ✅ immutable
ti3~bad = (1, 2, 3)   // ❌ Compile error: tuples must be immutable

ok[0] = 10            // ❌ Compile error: cannot modify tuple
```

### Length Validation

When using explicit length, the tuple literal must match:

```zz
ti5#ok = (1, 2, 3, 4, 5)    // ✅ 5 elements
ti5#wrong = (1, 2, 3)       // ❌ Compile error: length mismatch
```

### Homogeneous Types

All tuple elements must be the same type:

```zz
ti3#nums = (1, 2, 3)        // ✅ all ints
ti3#bad = (1, "two", 3)     // ❌ Compile error: mixed types
```

### Tuple Methods

Only `len()` is available on tuples (no `push`/`pop` since they're immutable):

```zz
ti5#data = (1, 2, 3, 4, 5)
print(data.len())     // 5

data.push(6)          // ❌ Compile error
data.pop()            // ❌ Compile error
```

---

## Enums

Enums are named sets of variants for type-safe state representation.

### Declaration

```zz
E Color
  Red
  Green
  Blue
;

E Status
  Active
  Inactive
  Pending
;
```

- `E` keyword starts declaration
- Variants listed one per line
- `;` terminates the declaration

### Enum Variables

```zz
Color#primary = Color.Red      // immutable
Color~current = Color.Green    // mutable

current = Color.Blue           // reassign mutable
```

### Enum Access

```zz
Color.Red                      // access variant
?(status == Color.Blue)        // comparison
  print("It's blue!")
;
```

### Functions with Enums

```zz
// Enum parameter
Z printColor(Color#c)
  ?(c == Color.Red)
    print("red")
  :?(c == Color.Green)
    print("green")
  :
    print("blue")
  ;
;

// Enum return type
Color Z getDefault()
  Color.Green
;

printColor(Color.Red)
Color#def = getDefault()
```

### Type Safety

```zz
E Color
  Red
;

E Status
  Active
;

Color#c = Status.Active   // ❌ Type mismatch
Color#d = Color.Purple    // ❌ Unknown variant
?(c == Status.Active)     // ❌ Cannot compare different enums
```

---

## Structs

Structs are user-defined types with fields and methods. They provide a foundation for object-oriented programming with encapsulated behavior.

### Declaration

```zz
S Point
  i#x
  i#y

  s Z toString()
    s"({x}, {y})"
  ;

  i Z manhattanDistance()
    x + y
  ;
;
```

- `S` keyword starts declaration
- Fields use `type#name` syntax
- Methods use standard function syntax inside the struct body
- Fields are accessible directly in methods (implicit self)
- `;` terminates both methods and the struct declaration

### Struct Instantiation

```zz
// Positional arguments (in field order)
Point#p1 = Point(10, 20)

// Named arguments
Point#p2 = Point(x=5, y=15)
```

### Field Access

```zz
print(p1.x)         // 10
print(p1.y)         // 20
```

### Method Calls

```zz
print(p1.toString())           // "(10, 20)"
print(p1.manhattanDistance())  // 30
```

### Mutability

Struct instances follow the same mutability rules as other types:

```zz
// Immutable instance - cannot modify fields
Point#immutable = Point(1, 2)
immutable.x = 5    // ❌ Compile error

// Mutable instance - can modify fields
Point~mutable = Point(1, 2)
mutable.x = 5      // ✅ OK
print(mutable.x)   // 5
```

### Struct with Multiple Types

```zz
S Person
  s#name
  i#age

  s Z greet()
    s"Hello, I'm {name}!"
  ;

  b Z isAdult()
    age >= 18
  ;
;

Person#alice = Person("Alice", 30)
print(alice.greet())      // "Hello, I'm Alice!"
print(alice.isAdult())    // true
```

### Methods with Parameters

```zz
S Rectangle
  i#width
  i#height

  i Z area()
    width * height
  ;

  b Z fitsInside(i#maxW i#maxH)
    width <= maxW && height <= maxH
  ;
;

Rectangle#rect = Rectangle(10, 5)
print(rect.area())              // 50
print(rect.fitsInside(20, 20))  // true
print(rect.fitsInside(8, 8))    // false
```

### Functions with Structs

```zz
// Struct parameter
Z printPoint(Point#p)
  print(p.toString())
;

// Struct return type
Point Z origin()
  Point(0, 0)
;

printPoint(Point(3, 4))
Point#o = origin()
```

### Type Safety

```zz
S Point
  i#x
  i#y
;

S Size
  i#w
  i#h
;

Point#p = Size(10, 20)     // ❌ Type mismatch
Point#q = Point("a", "b")  // ❌ Field type mismatch
print(p.z)                 // ❌ Unknown field
```

---

## Traits

Traits are compile-time contracts (interfaces) that structs can implement. They enable polymorphism without inheritance. Traits have **no runtime representation** — all checking is compile-time, no JavaScript is emitted for trait declarations.

### Trait Declaration

Use the `ZZ` keyword to declare a trait:

```zz
ZZ Printable
  s Z toString()
;

ZZ Comparable
  i Z compareTo(Self#other)
;
```

- `ZZ` keyword starts the declaration
- Methods are **signatures only** — no body
- `Self` can be used in parameter types to mean "the implementing type"
- `;` terminates the declaration

### Implementing Traits

Use `:` after the struct name to implement one or more traits:

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

The compiler validates at compile time that:
- All required methods are present
- Parameter counts and types match
- Return types match
- `Self` is correctly substituted with the struct name

### Trait as Type (Polymorphism)

Traits can be used as parameter types, enabling polymorphism:

```zz
Z display(Printable#item)
  print(item.toString())
;

Point#p = Point(3.0, 4.0)
display(p)  // Works — Point implements Printable
```

Trait-typed variables accept any struct that implements the trait:

```zz
Printable#printable = Point(7.0, 8.0)
print(printable.toString())  // "(7, 8)"
```

### Type Safety

```zz
ZZ Describable
  Z describe()
;

S Cat : Describable
  s#name
  Z describe() print(name) ;
;

S Dog   // Does NOT implement Describable
  s#name
;

Z show(Describable#item) item.describe() ;

show(Cat("Whiskers"))  // ✅ Cat implements Describable
show(Dog("Rex"))       // ❌ Compile error: Dog doesn't implement Describable
```

### Exporting Traits

Traits can be exported and imported across modules:

```zz
// shapes.zz
->ZZ Drawable
  Z draw()
;

// main.zz
<- { Drawable } = "./shapes"
```

---

## J Objects (JSON-like)

J objects are JSON-like, string-keyed objects whose values can be `s`, `i`, `f`, `b`, `_` (null), or nested `J`. They bridge the gap between rigid structs and raw JavaScript objects — typed and safe, but flexible in shape.

### Declaration

```zz
// Immutable J object
J#config = {
  host: "localhost",
  port: 8080,
  ssl: false
}

// Mutable J object
J~settings = { theme: "dark", fontSize: 14 }
```

- `J#` → immutable (compiles to `Object.freeze({...})`)
- `J~` → mutable (plain JS object)

### Nested J Objects

```zz
J#server = {
  host: "api.example.com",
  port: 443,
  limits: {
    maxConn: 100,
    timeout: 30
  }
}

print(server.host)              // "api.example.com"
print(server.limits.maxConn)    // 100
```

### Dot Access

J objects support dot access for reading fields:

```zz
J#config = { host: "localhost", port: 8080 }
print(config.host)    // "localhost"
print(config.port)    // 8080
```

Dot access returns a dynamic (untyped) value at compile time.

### Mutability

```zz
J~settings = { theme: "dark", fontSize: 14 }

// Field assignment (mutable only)
settings.theme = "light"
print(settings.theme)     // "light"

// set() method (mutable only)
settings.set("fontSize", 16)
print(settings.fontSize)  // 16
```

Attempting to assign fields or call `set()` on an immutable `J#` is a compile error:

```zz
J#config = { x: 1 }
config.x = 2              // ❌ Compile error: immutable J object
config.set("x", 2)        // ❌ Compile error: immutable J object
```

### Built-in Methods

| Method             | Returns | Description                        |
| ------------------ | ------- | ---------------------------------- |
| `obj.has("key")`   | `b`     | Check if key exists                |
| `obj.get("key")`   | dynamic | Get value by key                   |
| `obj.set("k", v)`  | —       | Set value (mutable `J~` only)      |
| `obj.len()`        | `i`     | Number of keys                     |

```zz
J#config = { host: "localhost", port: 8080 }

print(config.has("host"))     // true
print(config.has("missing"))  // false
print(config.get("port"))     // 8080
```

### Functions with J Objects

```zz
// J as return type
J Z makeConfig(s#host i#port)
  { host: host, port: port, ssl: true }
;

J#myConfig = makeConfig("example.com", 443)

// J as parameter
Z printHost(J#cfg)
  print(cfg.host)
;

printHost(myConfig)   // "example.com"
```

### Null Values

```zz
J#nullable = { name: "test", value: _ }
print(nullable.name)    // "test"
print(nullable.value)   // null
```

### Pattern Matching on J Objects

J objects support structural pattern matching with `??`:

```zz
J#resp = { status: 200, body: "OK" }

??(resp)
  | { status: 200, body: b } => print(s"Success: {b}")
  | { status: s }            => print(s"Status: {s}")
  | _                        => print("Unknown")
;
```

- Keys in the pattern check for existence (`"key" in obj`)
- Literal values match exactly (`status: 200`)
- Identifiers bind the field value (`body: b` binds `b`)
- Nested J patterns are supported

---

## Pattern Matching

ZZ supports exhaustive pattern matching with the `??` operator. Match arms use `|` for each pattern and `=>` to separate the pattern from the body.

### Basic Syntax

```zz
??(value)
  | pattern1 => body1
  | pattern2 => body2
  | _        => defaultBody
;
```

### Enum Matching

```zz
E Color Red Green Blue ;

Z describeColor(Color#c)
  ??(c)
    | Color.Red   => print("Warm color: Red")
    | Color.Green => print("Nature color: Green")
    | Color.Blue  => print("Cool color: Blue")
  ;
;
```

Enum matches are checked for exhaustiveness at compile time. If you miss a variant and don't include a wildcard `_`, you get a compile error.

### Literal Matching

```zz
Z describeNumber(i#n)
  ??(n)
    | 0 => print("Zero")
    | 1 => print("One")
    | _ => print("Some other number")
  ;
;
```

### J Object Destructuring

Match on J object keys, with literal values and variable bindings:

```zz
J#resp = { status: 200, body: "OK" }

??(resp)
  | { status: 200, body: b } => print(s"Success: {b}")
  | { status: 404, body: b } => print(s"Not Found: {b}")
  | { status: s }            => print(s"Other: {s}")
  | _                        => print("Unknown")
;
```

- `status: 200` — matches if `status` key exists and equals `200`
- `body: b` — matches if `body` key exists, binds value to `b`
- Nested J patterns work: `| { data: { id: id } } => ...`

### Struct Destructuring

Match on struct fields, mixing literal values and variable bindings:

```zz
S Point i#x i#y ;

Z describePoint(Point#p)
  ??(p)
    | Point(0, 0)    => print("Origin")
    | Point(0, y)    => print(s"Y-axis at y={y}")
    | Point(x, 0)    => print(s"X-axis at x={x}")
    | Point(x, y)    => print(s"Point at ({x}, {y})")
  ;
;
```

- `0` in a field position matches literally
- `x`, `y` in a field position bind the field value to a variable

### Guards

Add conditions to match arms with `&`:

```zz
Z classifyPoint(Point#p)
  ??(p)
    | Point(x, y) & x > 0 && y > 0 => print("Quadrant I")
    | Point(x, y) & x < 0 && y > 0 => print("Quadrant II")
    | Point(x, y) & x < 0 && y < 0 => print("Quadrant III")
    | Point(x, y) & x > 0 && y < 0 => print("Quadrant IV")
    | _                            => print("On an axis")
  ;
;
```

### Match as Expression

Pattern matching can return values. Declare a return type before `Z` and the last expression in each arm is the return value:

```zz
i Z scoreGrade(i#score)
  ??(score)
    | 100 => 10
    | _   => 0
  ;
;

i#bonus = scoreGrade(100)  // 10
```

### Binding Patterns

Capture the matched value into a variable, optionally with a guard:

```zz
Z processValue(i#n)
  ??(n)
    | v & v > 100 => print(s"Large value: {v}")
    | v & v > 50  => print(s"Medium value: {v}")
    | v           => print(s"Small value: {v}")
  ;
;
```

### Generated JavaScript

Pattern matching compiles to an IIFE with an if/else-if chain:

```zz
??(n)
  | 0 => print("Zero")
  | _ => print("Other")
;
```

Becomes:

```javascript
(function () {
	const __match = n;
	if (__match === 0) {
		console.log("Zero");
	} else if (true) {
		console.log("Other");
	}
})();
```

---

## JS Injection

ZZ files are ZZ — no raw JavaScript works outside of injection blocks. When you need direct access to JavaScript APIs, use `$js { ... }` to inject raw JS into the compiled output.

### Syntax

```zz
$js {
  // Any JavaScript code here
  // Nested { braces } are handled correctly
}
```

The `}` closes the block — no trailing `;` is needed.

### Basic Usage

```zz
s#name = "world"

$js {
  console.log("Hello, " + name + "!");
}
```

Compiles to:

```javascript
const name = "world";
console.log("Hello, " + name + "!");
```

ZZ-defined variables are accessible inside `$js` blocks since they compile to regular JavaScript variables.

### Nested Braces

Nested `{}` in your JavaScript code work correctly — the compiler tracks brace depth:

```zz
$js {
  const items = [1, 2, 3];
  const mapped = items.map(x => {
    return { value: x * 2 };
  });
  console.log(mapped);
}
```

### Use Cases

- Accessing browser/Node.js APIs not exposed by ZZ
- Complex JS patterns (async/await, generators, etc.)
- Calling third-party JS libraries directly
- Performance-critical code that needs specific JS idioms

---

## Compile-Time Execution

Code inside `${}` is evaluated at compile time and substituted with literal values. This enables compile-time computation, environment-based configuration, and build metadata.

### Basic Usage

```zz
// Arithmetic evaluated at compile time
i#computed = ${2 + 3 * 4}        // Compiles to: const computed = 14;

// String operations
s#greeting = ${"Hello" + ", World!"}

// Comparisons
b#isDebug = ${$env("DEBUG", "false") == "true"}
```

### Environment Variables

```zz
s#env = ${$env("NODE_ENV", "development")}
s#apiKey = ${$env("API_KEY")}                   // empty string if not set
b#hasKey = ${$defined("API_KEY")}               // true if env var exists
```

### Build Metadata

```zz
s#buildDate = ${$date()}     // ISO date: "2024-01-15"
s#buildTime = ${$time()}     // ISO timestamp
i#lineNum = ${$line()}       // Current line number
s#fileName = ${$file()}      // Current file name
```

### Compile-Time Functions (`$Z`)

Define functions that execute at compile time:

```zz
$Z i factorial(i#n)
  ??(n)
    | 0 => 1
    | 1 => 1
    | _ => n * factorial(n - 1)
  ;
;

i#fact5 = ${factorial(5)}    // Compiles to: const fact5 = 120;
i#fact10 = ${factorial(10)}  // Compiles to: const fact10 = 3628800;
```

**Rules:**
- `$Z` functions can only call other `$Z` functions
- Inside `$Z` body, calls to `$Z` functions are implicitly compile-time (no `${}` needed)
- Runtime code must use `${}` to call `$Z` functions
- `$Z` functions are NOT emitted to JS output

### Built-in Compile-Time Functions

| Function | Description |
|----------|-------------|
| `$read(path)` | Read file contents at compile time |
| `$env(name)` | Get environment variable |
| `$env(name, default)` | Get env var with default |
| `$defined(name)` | Check if env var exists (returns bool) |
| `$line()` | Current source line number |
| `$file()` | Current source file name |
| `$date()` | Compile date (ISO format) |
| `$time()` | Compile time (ISO format) |

### Allowed at Compile Time

- Literals, arithmetic, string operations
- Comparisons and logical operators
- Match expressions (pattern matching)
- Array, tuple, and J literals
- Calls to `$Z` functions and built-in `$` functions

### Forbidden at Compile Time

- Runtime variable references
- Runtime function calls (regular `Z` functions)
- Side effects: `print()`, `error()`
- Mutability: no `~` variables in compile-time context

---

## Strings

### Core String Methods

Strings have two built-in methods:

```zz
s#text = "Hello, World!"

// len() - get string length
i#length = text.len()       // 13

// at(i) - get character at index
s#first = text.at(0)        // "H"
s#last = text.at(length - 1) // "!"
```

### UFCS (Universal Function Call Syntax)

ZZ supports **UFCS**: any function `f(x, ...)` can be called as `x.f(...)`. This enables method chaining with library functions:

```zz
// Import string functions
<- { upper, trim } = std/string

// These are equivalent:
upper(str)
str.upper()

// Chaining works naturally:
s#name = "  alice  "
s#clean = name.trim().upper()  // "ALICE"
```

UFCS works for any function where the first parameter matches the object's type. This means you can "extend" types with your own functions:

```zz
// Define a custom function
s Z shout(s#str)
  str.upper() + "!"
;

s#msg = "hello"
print(msg.shout())  // "HELLO!"
```

---

## Standard Library

ZZ includes a minimal standard library. Import functions and use them with UFCS for method-like syntax.

### std/string

String manipulation functions:

```zz
<- { upper, lower, trim, split, has, find, starts, ends, slice, replace, repeat, padStart, padEnd, join } = std/string
```

| Function                | Signature     | Description                               |
| ----------------------- | ------------- | ----------------------------------------- |
| `upper(s)`              | `s → s`       | Convert to uppercase                      |
| `lower(s)`              | `s → s`       | Convert to lowercase                      |
| `trim(s)`               | `s → s`       | Remove leading/trailing whitespace        |
| `split(s, sep)`         | `s, s → s[]`  | Split by separator                        |
| `has(s, sub)`           | `s, s → b`    | Check if contains substring               |
| `find(s, sub)`          | `s, s → i`    | Find index of substring (-1 if not found) |
| `starts(s, pre)`        | `s, s → b`    | Check if starts with prefix               |
| `ends(s, suf)`          | `s, s → b`    | Check if ends with suffix                 |
| `slice(s, start, end)`  | `s, i, i → s` | Extract substring                         |
| `replace(s, old, new)`  | `s, s, s → s` | Replace all occurrences                   |
| `repeat(s, n)`          | `s, i → s`    | Repeat string n times                     |
| `padStart(s, len, pad)` | `s, i, s → s` | Pad start to reach length                 |
| `padEnd(s, len, pad)`   | `s, i, s → s` | Pad end to reach length                   |
| `join(arr, sep)`        | `s[], s → s`  | Join array with separator                 |

**Example:**

```zz
<- { upper, trim, split, has } = std/string

s#input = "  hello, world  "

// Method chaining with UFCS
s#cleaned = input.trim().upper()
print(cleaned)  // "HELLO, WORLD"

// Search
?(input.has("world"))
  print("Found it!")
;

// Split into array
s[]#words = input.trim().split(", ")
print(words[0])  // "hello"
print(words[1])  // "world"
```

### std/math

Math functions for numerical operations:

```zz
<- { sqrt, floor, ceil, sin, cos, abs, min, max, random, PI } = std/math
```

| Function              | Signature        | Description                 |
| --------------------- | ---------------- | --------------------------- |
| `abs(x)`              | `num → num`      | Absolute value              |
| `floor(x)`            | `num → i`        | Round down                  |
| `ceil(x)`             | `num → i`        | Round up                    |
| `round(x)`            | `num → i`        | Round to nearest            |
| `trunc(x)`            | `num → i`        | Truncate decimals           |
| `sign(x)`             | `num → i`        | Sign (-1, 0, or 1)          |
| `sqrt(x)`             | `num → f`        | Square root                 |
| `cbrt(x)`             | `num → f`        | Cube root                   |
| `pow(x, y)`           | `num, num → num` | Power                       |
| `exp(x)`              | `num → f`        | e^x                         |
| `log(x)`              | `num → f`        | Natural log                 |
| `log10(x)`            | `num → f`        | Log base 10                 |
| `log2(x)`             | `num → f`        | Log base 2                  |
| `sin(x)`              | `num → f`        | Sine                        |
| `cos(x)`              | `num → f`        | Cosine                      |
| `tan(x)`              | `num → f`        | Tangent                     |
| `asin(x)`             | `num → f`        | Arc sine                    |
| `acos(x)`             | `num → f`        | Arc cosine                  |
| `atan(x)`             | `num → f`        | Arc tangent                 |
| `atan2(y, x)`         | `num, num → f`   | Two-argument arc tangent    |
| `min(a, b)`           | `num, num → num` | Minimum of two values       |
| `max(a, b)`           | `num, num → num` | Maximum of two values       |
| `random()`            | `→ f`            | Random float 0-1            |
| `randomInt(min, max)` | `i, i → i`       | Random int in range         |
| `PI()`                | `→ f`            | Pi constant (3.14159...)    |
| `E()`                 | `→ f`            | Euler's number (2.71828...) |

**Example:**

```zz
<- { sqrt, floor, sin, PI } = std/math

f#x = 16.0
print(x.sqrt())      // 4
print(x.floor())     // 16

f#angle = PI() / 2
print(angle.sin())   // 1
```

### std/array

Array utility functions:

```zz
<- { reverse, sort, includes, indexOf, sum, unique, first, last } = std/array
```

| Function                 | Signature         | Description                           |
| ------------------------ | ----------------- | ------------------------------------- |
| `includes(arr, val)`     | `T[], T → b`      | Check if array contains value         |
| `indexOf(arr, val)`      | `T[], T → i`      | Find index of value (-1 if not found) |
| `lastIndexOf(arr, val)`  | `T[], T → i`      | Find last index of value              |
| `reverse(arr)`           | `T[] → T[]`       | Return reversed copy                  |
| `slice(arr, start, end)` | `T[], i, i → T[]` | Extract sub-array                     |
| `concat(arr1, arr2)`     | `T[], T[] → T[]`  | Concatenate arrays                    |
| `flat(arr)`              | `T[][] → T[]`     | Flatten one level                     |
| `flatDeep(arr)`          | `T[][] → T[]`     | Flatten all levels                    |
| `fill(arr, val)`         | `T[], T → T[]`    | Fill array with value                 |
| `join(arr, sep)`         | `T[], s → s`      | Join to string                        |
| `first(arr)`             | `T[] → T`         | Get first element                     |
| `last(arr)`              | `T[] → T`         | Get last element                      |
| `isEmpty(arr)`           | `T[] → b`         | Check if empty                        |
| `sort(arr)`              | `num[] → num[]`   | Sort numbers ascending                |
| `sortDesc(arr)`          | `num[] → num[]`   | Sort numbers descending               |
| `sortStr(arr)`           | `s[] → s[]`       | Sort strings alphabetically           |
| `sum(arr)`               | `num[] → num`     | Sum of elements                       |
| `product(arr)`           | `num[] → num`     | Product of elements                   |
| `average(arr)`           | `num[] → num`     | Average of elements                   |
| `minVal(arr)`            | `num[] → num`     | Minimum value                         |
| `maxVal(arr)`            | `num[] → num`     | Maximum value                         |
| `unique(arr)`            | `T[] → T[]`       | Remove duplicates                     |
| `count(arr, val)`        | `T[], T → i`      | Count occurrences                     |

**Example:**

```zz
<- { sort, sum, reverse, includes, unique } = std/array

i[]#nums = [3, 1, 4, 1, 5, 9, 2, 6]

print(nums.sum())           // 31
print(nums.sort())          // [1, 1, 2, 3, 4, 5, 6, 9]
print(nums.unique().sort()) // [1, 2, 3, 4, 5, 6, 9]
print(nums.includes(5))     // true
print(nums.reverse())       // [6, 2, 9, 5, 1, 4, 1, 3]
```

---

## Error Handling

### Try-Catch

```zz
?
  // try body - code that might fail
:(errorVariable)
  // catch body - handle error
;
```

**Example:**

```zz
s~result = "default"

?
  result = "success"
:(err)
  result = s"failed: {err}"
;

print(result)
```

**Nested try-catch:**

```zz
?
  print("Outer try")
  ?
    print("Inner try")
  :(innerErr)
    print(s"Inner catch: {innerErr}")
  ;
:(outerErr)
  print(s"Outer catch: {outerErr}")
;
```

### Throwing Errors

Use `>X(expression)` to throw an error:

```zz
>X("Something went wrong!")
```

**With try-catch:**

```zz
?
  >X("Oops!")
:(e)
  print(s"Caught: {e}")
;
```

### Console Error Output

Use `error()` to output to stderr (like `console.error`):

```zz
error("This goes to stderr")
print("This goes to stdout")
```

---

## Synchronous Execution & Spawn

ZZ is synchronous by default. Every function call blocks until it completes — there are no callbacks, promises, or async/await at the language level.

### Blocking Calls (Default)

All function calls block:

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

---

## Modules

ZZ supports ES modules for code organization and reuse. There are two import modes: **safe** (`<-`) for ZZ modules with full type checking, and **unsafe** (`<-!`) for JavaScript/npm modules without type safety.

### Exporting

Use `->` prefix to export functions and variables:

```zz
// math.zz

// Export a function
->i Z add(i#a i#b)
  a + b
;

// Export a variable
->s#VERSION = "1.0.0"
->f#PI = 3.14159

// Private (not exported)
i Z helper(i#x)
  x * 2
;
```

### Safe Imports (`<-`)

Use `<-` to import from other `.zz` modules. The compiler parses the imported file and **resolves full type information** — function signatures, variable types, struct definitions, and enums are all type-checked:

```zz
// Import from standard library (unquoted path)
<- { sqrt, floor, PI } = std/math
<- { upper, trim, split } = std/string

// Import from your own .zz modules (quoted path, relative to source file)
<- { add, subtract } = "./math"

// Import with alias
<- { add, pi=PI } = "./math"

// Import all as namespace
<- math = "./math"
```

**Type safety with safe imports:**

```zz
<- { upper } = std/string
<- { sqrt } = std/math

upper(42)          // ❌ Compile error: expects string, got int
sqrt()             // ❌ Compile error: missing argument
upper("hello")     // ✅ Returns string
```

**Auto-compilation:** Safe imports automatically compile the imported `.zz` file to `.js` if the output is missing or stale (based on file timestamps). This means you don't need to manually compile dependencies — just run your main file.

### Unsafe Imports (`<-!`)

Use `<-!` to import from JavaScript or npm modules. No type checking is performed — all imported bindings are treated as untyped:

```zz
// Import from a JS file
<-! { readFile } = "fs"

// Import from npm packages
<-! { fetch } = "node-fetch"

// Import from local JS files
<-! { helper } = "./lib/utils"
```

Use unsafe imports when:

- Importing npm packages
- Importing plain JavaScript files (no `.zz` source)
- Working with Node.js built-in modules

### Path Resolution

- **Standard library** (`std/xxx`): Unquoted. The compiler resolves the path to the built-in `std/` directory automatically.
- **Regular imports** (`"./path"`): Quoted. Paths are relative to the source `.zz` file. The compiler adjusts them for the output location.
- `.js` extension is optional — the compiler appends it automatically.

### Using Imports

```zz
// Use named imports directly
print(add(5, 3))
print(pi)

// Use namespace imports with dot notation
print(math.add(100, 200))
print(math.VERSION)
```

### Generated JavaScript

```javascript
// Exports become:
export function add(a, b) {
	return a + b;
}
export const VERSION = "1.0.0";

// Imports become:
import { add, subtract } from "./math.js";
import { PI as pi } from "./math.js";
import * as math from "./math.js";
import { sqrt, floor, PI } from "../../std/math.js";
```

---

## Complete Example

```zz
// FizzBuzz in ZZ

Z fizzbuzz(i#n)
  @(i#1..n)
    b#divisibleBy3 = i % 3 == 0
    b#divisibleBy5 = i % 5 == 0

    ?(divisibleBy3 && divisibleBy5)
      print("FizzBuzz")
    :?(divisibleBy3)
      print("Fizz")
    :?(divisibleBy5)
      print("Buzz")
    :
      print(i)
    ;
  ;
;

fizzbuzz(15)
```

---

## Syntax Quick Reference

| ZZ                    | JavaScript                              | Description                     |
| --------------------- | --------------------------------------- | ------------------------------- |
| `s#x = "hi"`          | `const x = "hi"`                        | Immutable string                |
| `i~x = 0`             | `let x = 0`                             | Mutable int                     |
| `print(x)`            | `console.log(x)`                        | Print                           |
| `?(cond) ... ;`       | `if (cond) { ... }`                     | If statement                    |
| `:?(cond)`            | `else if (cond)`                        | Else if                         |
| `:`                   | `else`                                  | Else                            |
| `@(cond) ... ;`       | `while (cond) { ... }`                  | While loop                      |
| `@(i#1..5) ... ;`     | `for (let i=1; i<=5; i++)`              | For loop (range)                |
| `@(x#arr) ... ;`      | `for (const x of arr)`                  | For-each loop                   |
| `>!`                  | `break`                                 | Break                           |
| `>>`                  | `continue`                              | Continue                        |
| `Z fn() ... ;`        | `function fn() { ... }`                 | Void function                   |
| `i Z fn() ... ;`      | `function fn() { return ...; }`         | Function with return            |
| `? ... :(e) ... ;`    | `try { ... } catch(e) { ... }`          | Try-catch                       |
| `>X(expr)`            | `throw expr`                            | Throw error                     |
| `error(x)`            | `console.error(x)`                      | Print to stderr                 |
| `s"...{x}..."`        | `` `...${x}...` ``                      | String interpolation            |
| `i(x)`                | `Math.trunc(Number(x))`                 | Cast to int                     |
| `_`                   | `null`                                  | Null value                      |
| `1..5`                | `[1,2,3,4,5]`                           | Range                           |
| `i[]#arr`             | `const arr = [...]`                     | Dynamic array                   |
| `i[5]#arr`            | `const arr = [...]`                     | Fixed-size array (no push/pop)  |
| `ti5#tup`             | `Object.freeze([...])`                  | Tuple (5 ints, immutable)       |
| `tiN#tup`             | `Object.freeze([...])`                  | Tuple (inferred length)         |
| `(1, 2, 3)`           | `Object.freeze([1,2,3])`                | Tuple literal                   |
| `tiN(arr)`            | `Object.freeze([...arr])`               | Array to tuple cast             |
| `i[](tup)`            | `[...tup]`                              | Tuple to array cast             |
| `E Color Red Green ;` | `const Color = Object.freeze({...})`    | Enum declaration                |
| `Color#c = Color.Red` | `const c = Color.Red`                   | Enum variable                   |
| `Color.Red`           | `Color.Red`                             | Enum access                     |
| `S Name ... ;`        | `class Name { ... }`                    | Struct declaration              |
| `S Name : Trait`      | `class Name { ... }`                    | Struct implementing trait       |
| `Name#x = Name(...)`  | `const x = new Name(...)`               | Immutable struct instance       |
| `Name~x = Name(...)`  | `let x = new Name(...)`                 | Mutable struct instance         |
| `ZZ Trait ... ;`      | *(nothing — erased)*                    | Trait declaration               |
| `Trait#x = ...`       | `const x = ...`                         | Trait-typed variable            |
| `J#x = { k: v }`     | `const x = Object.freeze({k: v})`      | Immutable J object              |
| `J~x = { k: v }`     | `let x = {k: v}`                        | Mutable J object                |
| `x.has("k")`         | `("k" in x)`                            | J key existence check           |
| `x.get("k")`         | `x["k"]`                                | J get value by key              |
| `x.set("k", v)`      | `(x["k"] = v)`                          | J set value (mutable only)      |
| `x.field`             | `x.field`                               | Field access                    |
| `x.method()`          | `x.method()`                            | Method call                     |
| `x++`                 | `x++`                                   | Increment                       |
| `x--`                 | `x--`                                   | Decrement                       |
| `x += 5`              | `x += 5`                                | Add assign                      |
| `x -= 5`              | `x -= 5`                                | Subtract assign                 |
| `x *= 5`              | `x *= 5`                                | Multiply assign                 |
| `x /= 5`              | `x /= 5`                                | Divide assign                   |
| `x %= 5`              | `x %= 5`                                | Modulo assign                   |
| `x **= 5`             | `x **= 5`                               | Power assign                    |
| `->i Z fn()`          | `export function fn()`                  | Export function                 |
| `->s#x = "hi"`        | `export const x = "hi"`                 | Export variable                 |
| `<- { a } = "./m"`    | `import { a } from "./m.js"`            | Safe import (typed, .zz module) |
| `<-! { a } = "pkg"`   | `import { a } from "pkg"`               | Unsafe import (untyped, JS)     |
| `<- { a } = std/math` | `import { a } from "../../std/math.js"` | Std library import              |
| `<- m = "./m"`        | `import * as m from "./m.js"`           | Namespace import                |
| `??(val) \| p => ;`   | `if/else-if chain (IIFE)`               | Pattern matching                |
| `\| Color.Red =>`     | `if (v === Color.Red)`                  | Enum pattern                    |
| `\| 42 =>`            | `if (v === 42)`                         | Literal pattern                 |
| `\| Point(x, y) =>`   | destructure + bind fields               | Struct pattern                  |
| `\| { k: v } =>`      | `if ("k" in obj && ...)`                | J object pattern                |
| `\| _ =>`             | `else`                                  | Wildcard (catch-all)            |
| `\| v & v > 0 =>`     | `if (true && (v > 0))`                  | Guard condition                 |
| `$js { code }`        | raw JS output verbatim                  | JS injection block              |
| `str.len()`           | `str.length`                            | String length                   |
| `str.at(i)`           | `str.charAt(i)`                         | Character at index              |
| `str.upper()`         | `upper(str)`                            | UFCS: calls imported function   |

---

## Editor Support

Syntax highlighting is available for multiple editors.

### VS Code

```bash
# Install the extension
cp -r editors/vscode ~/.vscode/extensions/zz-language-0.1.0

# Restart VS Code
```

### Vim / Neovim

```bash
# Copy syntax files
mkdir -p ~/.vim/syntax ~/.vim/ftdetect
cp editors/vim/syntax/zz.vim ~/.vim/syntax/
cp editors/vim/ftdetect/zz.vim ~/.vim/ftdetect/

# For Neovim, use ~/.config/nvim/ instead of ~/.vim/
```

### Sublime Text

```bash
# macOS
cp editors/sublime-text/* ~/Library/Application\ Support/Sublime\ Text/Packages/User/

# Linux
cp editors/sublime-text/* ~/.config/sublime-text/Packages/User/
```

### JetBrains IDEs

1. Go to **Settings → Editor → TextMate Bundles**
2. Click **+** and select the `vscode-zz` folder
3. Restart the IDE

See [editors/README.md](editors/README.md) for more details and Emacs support.

---

## Project Structure

```
zz/
├── src/
│   ├── index.ts       # CLI entry point
│   ├── lexer.ts       # Tokenizer
│   ├── parser.ts      # Recursive descent parser
│   ├── ast.ts         # AST type definitions
│   ├── typechecker.ts # Static type validation
│   └── codegen.ts     # JavaScript code generator
├── std/               # Standard library (.zz source, auto-compiled to .js)
│   ├── string.zz      # String functions
│   ├── math.zz        # Math functions
│   └── array.zz       # Array functions (+ time, rand, path, json, convert, http)
├── editors/           # Editor syntax highlighting
├── vscode-zz/         # VS Code extension
├── examples/          # Example ZZ programs
├── dist/              # Compiled JavaScript
└── package.json
```

## License

MIT
