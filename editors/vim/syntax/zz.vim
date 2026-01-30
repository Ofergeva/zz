" Vim syntax file for ZZ language
" Language: ZZ
" Maintainer: ZZ Language Team

if exists("b:current_syntax")
  finish
endif

" Comments
syn match zzComment "//.*$"

" Strings
syn region zzString start='"' skip='\\"' end='"' contained
syn region zzInterpString start='s"' skip='\\"' end='"' contains=zzInterpolation
syn match zzPlainString '"[^"]*"'

" Interpolation in strings
syn region zzInterpolation start='{' end='}' contained contains=zzIdentifier,zzNumber,zzOperator

" Numbers
syn match zzFloat "\<\d\+\.\d\+\>"
syn match zzNumber "\<\d\+\>"

" Boolean constants
syn keyword zzBoolean true false

" Null constant
syn match zzNull "\<_\>"

" Keywords
syn keyword zzKeyword print

" Function definition keyword
syn match zzFuncKeyword "\<Z\>"

" Module keywords
syn match zzModule "->"
syn match zzModule "<-"

" Control flow symbols
syn match zzControl "@"
syn match zzControl ":\?"
syn match zzControl "?"
syn match zzControl ":"
syn match zzControl ";"
syn match zzControl ">!"
syn match zzControl ">>"

" Type prefixes
syn match zzType "\<s\>\ze[\[#~]"
syn match zzType "\<i\>\ze[\[#~]"
syn match zzType "\<f\>\ze[\[#~]"
syn match zzType "\<b\>\ze[\[#~]"

" Mutability modifiers
syn match zzImmutable "#"
syn match zzMutable "\~"

" Operators (order matters - longer matches first)
syn match zzOperator "\*\*="
syn match zzOperator "\*\*"
syn match zzOperator "++"
syn match zzOperator "+="
syn match zzOperator "+"
syn match zzOperator "--"
syn match zzOperator "-="
syn match zzOperator "-"
syn match zzOperator "\*="
syn match zzOperator "\*"
syn match zzOperator "/="
syn match zzOperator "/"
syn match zzOperator "%="
syn match zzOperator "%"
syn match zzOperator "=="
syn match zzOperator "!="
syn match zzOperator ">="
syn match zzOperator "<="
syn match zzOperator ">"
syn match zzOperator "<"
syn match zzOperator "&&"
syn match zzOperator "||"
syn match zzOperator "!"
syn match zzOperator "="
syn match zzOperator "\.\."

" Function calls (identifier followed by paren)
syn match zzFuncCall "\<[a-zA-Z_][a-zA-Z0-9_]*\>\ze("

" Identifiers
syn match zzIdentifier "\<[a-zA-Z_][a-zA-Z0-9_]*\>"

" Array brackets
syn match zzBracket "[\[\]]"

" Highlighting links
hi def link zzComment Comment
hi def link zzString String
hi def link zzInterpString String
hi def link zzPlainString String
hi def link zzInterpolation Special
hi def link zzNumber Number
hi def link zzFloat Float
hi def link zzBoolean Boolean
hi def link zzNull Constant
hi def link zzKeyword Keyword
hi def link zzFuncKeyword Keyword
hi def link zzModule Include
hi def link zzControl Conditional
hi def link zzType Type
hi def link zzImmutable StorageClass
hi def link zzMutable StorageClass
hi def link zzOperator Operator
hi def link zzFuncCall Function
hi def link zzIdentifier Identifier
hi def link zzBracket Delimiter

let b:current_syntax = "zz"
