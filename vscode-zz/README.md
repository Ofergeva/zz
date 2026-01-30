# ZZ Language Support for VS Code

Syntax highlighting for the ZZ programming language.

## Features

- Syntax highlighting for `.zz` files
- Comment toggling (`//`)
- Bracket matching and auto-closing
- Code folding

## Installation

### Option 1: Copy to Extensions Folder

Copy the `vscode-zz` folder to your VS Code extensions directory:

**macOS:**
```bash
cp -r vscode-zz ~/.vscode/extensions/zz-language-0.1.0
```

**Windows:**
```bash
xcopy /E vscode-zz %USERPROFILE%\.vscode\extensions\zz-language-0.1.0
```

**Linux:**
```bash
cp -r vscode-zz ~/.vscode/extensions/zz-language-0.1.0
```

Then restart VS Code.

### Option 2: Package as VSIX

1. Install vsce: `npm install -g @vscode/vsce`
2. Package: `cd vscode-zz && vsce package`
3. Install: `code --install-extension zz-language-0.1.0.vsix`

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

// Functions
i Z add(i#a i#b)
  a + b
;

print(add(3, 5))
```
