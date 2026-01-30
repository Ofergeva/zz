# ZZ Editor Support

Syntax highlighting support for various editors.

## VS Code

The full VS Code extension is in `../vscode-zz/`.

### Quick Install

```bash
# macOS
cp -r ../vscode-zz ~/.vscode/extensions/zz-language-0.1.0

# Linux
cp -r ../vscode-zz ~/.vscode/extensions/zz-language-0.1.0

# Windows (PowerShell)
Copy-Item -Recurse ../vscode-zz $env:USERPROFILE/.vscode/extensions/zz-language-0.1.0
```

Restart VS Code after installation.

---

## Sublime Text

### Install

Copy the syntax files to your Sublime Text packages:

**macOS:**
```bash
cp sublime-text/* ~/Library/Application\ Support/Sublime\ Text/Packages/User/
```

**Linux:**
```bash
cp sublime-text/* ~/.config/sublime-text/Packages/User/
```

**Windows:**
```bash
copy sublime-text\* %APPDATA%\Sublime Text\Packages\User\
```

Restart Sublime Text after installation.

---

## JetBrains IDEs (IntelliJ, WebStorm, etc.)

JetBrains IDEs support TextMate bundles.

### Install

1. Go to **Settings → Editor → TextMate Bundles**
2. Click **+** and select the `vscode-zz` folder
3. Restart the IDE

The IDE will use the TextMate grammar from the VS Code extension.

---

## Vim / Neovim

Create `~/.vim/syntax/zz.vim` (or `~/.config/nvim/syntax/zz.vim`):

```vim
" Vim syntax file for ZZ language

if exists("b:current_syntax")
  finish
endif

" Comments
syn match zzComment "//.*$"

" Strings
syn region zzString start='"' skip='\\"' end='"'
syn region zzInterpString start='s"' skip='\\"' end='"' contains=zzInterpolation
syn region zzInterpolation start='{' end='}' contained

" Numbers
syn match zzNumber "\<\d\+\>"
syn match zzFloat "\<\d\+\.\d\+\>"

" Constants
syn keyword zzBoolean true false
syn match zzNull "\<_\>"

" Keywords
syn keyword zzKeyword print
syn match zzFunction "\<Z\>"

" Control flow
syn match zzControl "@"
syn match zzControl "?"
syn match zzControl ":?"
syn match zzControl ":"
syn match zzControl ";"
syn match zzControl ">!"
syn match zzControl ">>"

" Types
syn match zzType "\<[sifb]\>\ze[\[#~]"
syn match zzModifier "#"
syn match zzModifier "\~"

" Operators
syn match zzOperator "\*\*\|[+\-*/%]"
syn match zzOperator "==\|!=\|>=\|<=\|>\|<"
syn match zzOperator "&&\|||\|!"
syn match zzOperator "="
syn match zzOperator "\.\."

" Highlighting
hi def link zzComment Comment
hi def link zzString String
hi def link zzInterpString String
hi def link zzInterpolation Special
hi def link zzNumber Number
hi def link zzFloat Float
hi def link zzBoolean Boolean
hi def link zzNull Constant
hi def link zzKeyword Keyword
hi def link zzFunction Keyword
hi def link zzControl Conditional
hi def link zzType Type
hi def link zzModifier StorageClass
hi def link zzOperator Operator

let b:current_syntax = "zz"
```

Add to `~/.vim/ftdetect/zz.vim`:

```vim
au BufRead,BufNewFile *.zz set filetype=zz
```

---

## Emacs

Add to your Emacs config (`~/.emacs` or `~/.emacs.d/init.el`):

```elisp
(define-derived-mode zz-mode prog-mode "ZZ"
  "Major mode for editing ZZ language files."

  ;; Comments
  (setq-local comment-start "// ")
  (setq-local comment-end "")

  ;; Syntax highlighting
  (setq font-lock-defaults
        '((
           ;; Comments
           ("//.*$" . font-lock-comment-face)
           ;; Strings
           ("\"[^\"]*\"" . font-lock-string-face)
           ("s\"[^\"]*\"" . font-lock-string-face)
           ;; Numbers
           ("\\b[0-9]+\\(\\.[0-9]+\\)?\\b" . font-lock-constant-face)
           ;; Booleans and null
           ("\\b\\(true\\|false\\|_\\)\\b" . font-lock-constant-face)
           ;; Keywords
           ("\\bprint\\b" . font-lock-keyword-face)
           ("\\bZ\\b" . font-lock-keyword-face)
           ;; Control flow
           ("[@?;]\\|:\\?\\|>!\\|>>" . font-lock-keyword-face)
           ;; Types
           ("\\b[sifb]\\b" . font-lock-type-face)
           ;; Modifiers
           ("[#~]" . font-lock-type-face)
           ;; Operators
           ("\\*\\*\\|[-+*/%=]\\|==\\|!=\\|>=\\|<=\\|>\\|<\\|&&\\|||\\|!\\|\\.\\." . font-lock-builtin-face)
           ))))

(add-to-list 'auto-mode-alist '("\\.zz\\'" . zz-mode))
```

---

## Other Editors

The TextMate grammar in `../vscode-zz/syntaxes/zz.tmLanguage.json` can be used with any editor that supports TextMate grammars, including:

- **TextMate** (macOS)
- **Atom** (deprecated but still works)
- **Monaco Editor** (VS Code's web editor)
- **GitHub** (for repository syntax highlighting)

For GitHub syntax highlighting, the `.tmLanguage.json` file would need to be submitted to the [linguist](https://github.com/github/linguist) repository.
