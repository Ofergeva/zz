export declare enum TokenType {
    TYPE_STRING = "TYPE_STRING",// s
    TYPE_INT = "TYPE_INT",// i
    TYPE_FLOAT = "TYPE_FLOAT",// f
    TYPE_BOOL = "TYPE_BOOL",// b
    TYPE_J = "TYPE_J",// J
    IMMUTABLE = "IMMUTABLE",// #
    MUTABLE = "MUTABLE",// ~
    SPAWN = "SPAWN",// ~>
    EQUALS = "EQUALS",// =
    LPAREN = "LPAREN",// (
    RPAREN = "RPAREN",// )
    PLUS = "PLUS",// +
    MINUS = "MINUS",// -
    STAR = "STAR",// *
    SLASH = "SLASH",// /
    STAR_STAR = "STAR_STAR",// **
    PERCENT = "PERCENT",// %
    PLUS_PLUS = "PLUS_PLUS",// ++
    MINUS_MINUS = "MINUS_MINUS",// --
    PLUS_EQUALS = "PLUS_EQUALS",// +=
    MINUS_EQUALS = "MINUS_EQUALS",// -=
    STAR_EQUALS = "STAR_EQUALS",// *=
    SLASH_EQUALS = "SLASH_EQUALS",// /=
    PERCENT_EQUALS = "PERCENT_EQUALS",// %=
    STAR_STAR_EQUALS = "STAR_STAR_EQUALS",// **=
    GT = "GT",// >
    LT = "LT",// <
    GTE = "GTE",// >=
    LTE = "LTE",// <=
    EQ = "EQ",// ==
    NEQ = "NEQ",// !=
    AND = "AND",// &&
    OR = "OR",// ||
    NOT = "NOT",// !
    WHILE = "WHILE",// @
    IF = "IF",// ?
    MATCH = "MATCH",// ?? (pattern matching)
    ELSE_IF = "ELSE_IF",// :?
    ELSE = "ELSE",// :
    SEMICOLON = "SEMICOLON",// ;
    BREAK = "BREAK",// >!
    CONTINUE = "CONTINUE",// >>
    THROW = "THROW",// >X
    NULL = "NULL",// _
    PIPE = "PIPE",// | (match arm)
    FAT_ARROW = "FAT_ARROW",// => (match result)
    AMPERSAND = "AMPERSAND",// & (match guard)
    FUNC = "FUNC",// Z
    ENUM = "ENUM",// E
    STRUCT = "STRUCT",// S
    COMMA = "COMMA",// ,
    LBRACKET = "LBRACKET",// [
    RBRACKET = "RBRACKET",// ]
    DOT_DOT = "DOT_DOT",// .. (range)
    DOT = "DOT",// . (method call)
    EXPORT = "EXPORT",// ->
    IMPORT = "IMPORT",// <-
    IMPORT_UNSAFE = "IMPORT_UNSAFE",// <-!
    LBRACE = "LBRACE",// {
    RBRACE = "RBRACE",// }
    STRING_LITERAL = "STRING_LITERAL",
    INTERP_STRING = "INTERP_STRING",// s"..." interpolated string
    NUMBER_LITERAL = "NUMBER_LITERAL",
    BOOL_LITERAL = "BOOL_LITERAL",
    CAST_STRING = "CAST_STRING",// s(
    CAST_INT = "CAST_INT",// i(
    CAST_FLOAT = "CAST_FLOAT",// f(
    CAST_BOOL = "CAST_BOOL",// b(
    TYPE_TUPLE_INT = "TYPE_TUPLE_INT",
    TYPE_TUPLE_FLOAT = "TYPE_TUPLE_FLOAT",
    TYPE_TUPLE_STRING = "TYPE_TUPLE_STRING",
    TYPE_TUPLE_BOOL = "TYPE_TUPLE_BOOL",
    CAST_TUPLE_INT = "CAST_TUPLE_INT",
    CAST_TUPLE_FLOAT = "CAST_TUPLE_FLOAT",
    CAST_TUPLE_STRING = "CAST_TUPLE_STRING",
    CAST_TUPLE_BOOL = "CAST_TUPLE_BOOL",
    PRINT = "PRINT",
    ERROR = "ERROR",// error() - console.error
    TRUE = "TRUE",
    FALSE = "FALSE",
    JS_BLOCK = "JS_BLOCK",// $js { ... }
    COMPTIME_START = "COMPTIME_START",// ${
    COMPTIME_FUNC = "COMPTIME_FUNC",// $Z
    IDENTIFIER = "IDENTIFIER",
    NEWLINE = "NEWLINE",
    EOF = "EOF"
}
export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
    tupleLength?: string;
}
export declare class Lexer {
    private source;
    private pos;
    private line;
    private column;
    constructor(source: string);
    tokenize(): Token[];
    private nextToken;
    private readString;
    private readInterpolatedString;
    private readJsBlock;
    private readCompTimeIdentifier;
    private readNumber;
    private readIdentifier;
    private skipWhitespace;
    private peek;
    private peekNext;
    private advance;
    private isAtEnd;
    private isDigit;
    private isAlpha;
    private isAlphaNumeric;
    private isReturnTypeBeforeFunc;
    private makeToken;
    private getTupleTypeToken;
    private getTupleCastToken;
}
