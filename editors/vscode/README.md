# ZZ Language Support for VS Code

Full language support for the ZZ programming language.

## Features

- **Syntax highlighting** for `.zz` files
- **Real-time error checking** - see errors as you type
- **Autocomplete** - suggestions for keywords, functions, variables, and struct members
- **Go-to-definition** - jump to variable, function, struct, or enum definitions
- **Hover information** - see type information on hover
- Comment toggling (`//`)
- Bracket matching and auto-closing
- Code folding

## Installation

### Prerequisites

Before installing the extension, ensure the ZZ compiler is built:

```bash
cd /path/to/zz
npm install
npm run build
```

### Option 1: Development Mode (Recommended)

1. Open the `editors/vscode` folder in VS Code
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press F5 to launch a new VS Code window with the extension loaded

### Option 2: Copy to Extensions Folder

1. Build the extension:
   ```bash
   cd editors/vscode
   npm install
   npm run compile
   ```

2. Copy to your VS Code extensions directory:

   **macOS:**
   ```bash
   cp -r . ~/.vscode/extensions/zz-language-0.2.0
   ```

   **Windows:**
   ```bash
   xcopy /E . %USERPROFILE%\.vscode\extensions\zz-language-0.2.0
   ```

   **Linux:**
   ```bash
   cp -r . ~/.vscode/extensions/zz-language-0.2.0
   ```

3. Restart VS Code.

### Option 3: Package as VSIX

1. Install vsce: `npm install -g @vscode/vsce`
2. Build and package:
   ```bash
   cd editors/vscode
   npm install
   npm run compile
   vsce package
   ```
3. Install: `code --install-extension zz-language-0.2.0.vsix`

## Language Server Features

### Real-time Diagnostics

The extension checks your code as you type and shows errors inline:

- Type mismatches
- Undeclared variables
- Immutability violations
- Syntax errors
- And more

### Autocomplete

Get suggestions for:

- Keywords (`S`, `E`, `Z`, `J`, etc.)
- Built-in functions (`print`, `error`, `len`)
- Your variables, functions, structs, and enums
- Struct fields and methods (after `.`)
- Array methods (`push`, `pop`, `len`)

### Go-to-Definition

Click on any identifier while holding Cmd (Mac) or Ctrl (Windows/Linux) to jump to its definition.

### Hover Information

Hover over identifiers to see their type and kind (variable, function, struct, etc.).

## Syntax Highlighting

| Element | Color Theme Scope |
|---------|------------------|
| Types (`s`, `i`, `f`, `b`) | `storage.type` |
| Immutable (`#`) | `storage.modifier` |
| Mutable (`~`) | `storage.modifier` |
| Keywords (`print`, `Z`) | `keyword` |
| Control flow (`@`, `?`, `:`, `;`) | `keyword.control` |
| Strings | `string` |
| Interpolation `{...}` | `meta.interpolation` |
| Numbers | `constant.numeric` |
| Booleans (`true`, `false`) | `constant.language` |
| Null (`_`) | `constant.language` |
| Comments (`//`) | `comment` |
| Operators | `keyword.operator` |
| Functions | `entity.name.function` |
| Variables | `variable` |

## Example

```zz
// Variable declarations
s#name = "Alice"
i~count = 0

// String interpolation
print(s"Hello, {name}!")

// Control flow
@(i#1..5)
  ?(i % 2 == 0)
    print(s"{i} is even")
  :
    print(s"{i} is odd")
  ;
;

// Structs
S Person
  s#name
  i#age

  s Z greet()
    s"Hi, I'm {name}!"
  ;
;

Person#p = Person("Alice", 30)
print(p.greet())

// Functions
i Z add(i#a i#b)
  a + b
;

print(add(3, 5))
```

## Troubleshooting

### Language server not starting

1. Make sure the ZZ compiler is built: `npm run build` in the root directory
2. Check the Output panel (View > Output) and select "ZZ Language Server" for error messages

### No autocomplete or errors

1. Ensure the file has a `.zz` extension
2. Try reloading the window (Cmd/Ctrl + Shift + P > "Reload Window")
