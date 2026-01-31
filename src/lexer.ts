// Lexer (Tokenizer) for ZZ Language

export enum TokenType {
  // Type prefixes
  TYPE_STRING = 'TYPE_STRING',   // s
  TYPE_INT = 'TYPE_INT',         // i
  TYPE_FLOAT = 'TYPE_FLOAT',     // f
  TYPE_BOOL = 'TYPE_BOOL',       // b

  // Mutability
  IMMUTABLE = 'IMMUTABLE',       // #
  MUTABLE = 'MUTABLE',           // ~

  // Operators
  EQUALS = 'EQUALS',             // =
  LPAREN = 'LPAREN',             // (
  RPAREN = 'RPAREN',             // )

  // Arithmetic operators
  PLUS = 'PLUS',                 // +
  MINUS = 'MINUS',               // -
  STAR = 'STAR',                 // *
  SLASH = 'SLASH',               // /
  STAR_STAR = 'STAR_STAR',       // **
  PERCENT = 'PERCENT',           // %

  // Increment/Decrement
  PLUS_PLUS = 'PLUS_PLUS',       // ++
  MINUS_MINUS = 'MINUS_MINUS',   // --

  // Compound assignment
  PLUS_EQUALS = 'PLUS_EQUALS',   // +=
  MINUS_EQUALS = 'MINUS_EQUALS', // -=
  STAR_EQUALS = 'STAR_EQUALS',   // *=
  SLASH_EQUALS = 'SLASH_EQUALS', // /=
  PERCENT_EQUALS = 'PERCENT_EQUALS', // %=
  STAR_STAR_EQUALS = 'STAR_STAR_EQUALS', // **=

  // Comparison operators
  GT = 'GT',                     // >
  LT = 'LT',                     // <
  GTE = 'GTE',                   // >=
  LTE = 'LTE',                   // <=
  EQ = 'EQ',                     // ==
  NEQ = 'NEQ',                   // !=

  // Logical operators
  AND = 'AND',                   // &&
  OR = 'OR',                     // ||
  NOT = 'NOT',                   // !

  // Control flow
  WHILE = 'WHILE',               // @
  IF = 'IF',                     // ?
  MATCH = 'MATCH',               // ?? (pattern matching)
  ELSE_IF = 'ELSE_IF',           // :?
  ELSE = 'ELSE',                 // :
  SEMICOLON = 'SEMICOLON',       // ;
  BREAK = 'BREAK',               // >!
  CONTINUE = 'CONTINUE',         // >>
  THROW = 'THROW',               // >X
  NULL = 'NULL',                 // _
  PIPE = 'PIPE',                 // | (match arm)
  FAT_ARROW = 'FAT_ARROW',       // => (match result)
  AMPERSAND = 'AMPERSAND',       // & (match guard)

  // Functions
  FUNC = 'FUNC',                 // Z
  ENUM = 'ENUM',                 // E
  STRUCT = 'STRUCT',             // S
  COMMA = 'COMMA',               // ,

  // Arrays
  LBRACKET = 'LBRACKET',         // [
  RBRACKET = 'RBRACKET',         // ]
  DOT_DOT = 'DOT_DOT',           // .. (range)
  DOT = 'DOT',                   // . (method call)

  // Modules
  EXPORT = 'EXPORT',             // ->
  IMPORT = 'IMPORT',             // <-
  LBRACE = 'LBRACE',             // {
  RBRACE = 'RBRACE',             // }

  // Literals
  STRING_LITERAL = 'STRING_LITERAL',
  INTERP_STRING = 'INTERP_STRING',  // s"..." interpolated string
  NUMBER_LITERAL = 'NUMBER_LITERAL',
  BOOL_LITERAL = 'BOOL_LITERAL',

  // Cast operators
  CAST_STRING = 'CAST_STRING',     // s(
  CAST_INT = 'CAST_INT',           // i(
  CAST_FLOAT = 'CAST_FLOAT',       // f(
  CAST_BOOL = 'CAST_BOOL',         // b(

  // Tuple types: ti5, tsN, etc.
  TYPE_TUPLE_INT = 'TYPE_TUPLE_INT',
  TYPE_TUPLE_FLOAT = 'TYPE_TUPLE_FLOAT',
  TYPE_TUPLE_STRING = 'TYPE_TUPLE_STRING',
  TYPE_TUPLE_BOOL = 'TYPE_TUPLE_BOOL',

  // Tuple casts: tiN(, tf3(, etc.
  CAST_TUPLE_INT = 'CAST_TUPLE_INT',
  CAST_TUPLE_FLOAT = 'CAST_TUPLE_FLOAT',
  CAST_TUPLE_STRING = 'CAST_TUPLE_STRING',
  CAST_TUPLE_BOOL = 'CAST_TUPLE_BOOL',

  // Keywords
  PRINT = 'PRINT',
  ERROR = 'ERROR',               // error() - console.error
  TRUE = 'TRUE',
  FALSE = 'FALSE',

  // JS injection
  JS_BLOCK = 'JS_BLOCK',           // $js { ... }

  // Other
  IDENTIFIER = 'IDENTIFIER',
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  tupleLength?: string;  // For tuple tokens: number string or 'N' for inferred
}

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }

    tokens.push(this.makeToken(TokenType.EOF, ''));
    return tokens;
  }

  private nextToken(): Token | null {
    this.skipWhitespace();

    if (this.isAtEnd()) return null;

    const char = this.peek();

    // Single character tokens
    if (char === '#') { this.advance(); return this.makeToken(TokenType.IMMUTABLE, '#'); }
    if (char === '~') { this.advance(); return this.makeToken(TokenType.MUTABLE, '~'); }
    if (char === '(') { this.advance(); return this.makeToken(TokenType.LPAREN, '('); }
    if (char === ')') { this.advance(); return this.makeToken(TokenType.RPAREN, ')'); }
    if (char === ';') { this.advance(); return this.makeToken(TokenType.SEMICOLON, ';'); }
    if (char === '@') { this.advance(); return this.makeToken(TokenType.WHILE, '@'); }
    if (char === ',') { this.advance(); return this.makeToken(TokenType.COMMA, ','); }
    if (char === '[') { this.advance(); return this.makeToken(TokenType.LBRACKET, '['); }
    if (char === ']') { this.advance(); return this.makeToken(TokenType.RBRACKET, ']'); }
    if (char === '{') { this.advance(); return this.makeToken(TokenType.LBRACE, '{'); }
    if (char === '}') { this.advance(); return this.makeToken(TokenType.RBRACE, '}'); }

    // . and .. (dot and range)
    if (char === '.') {
      this.advance();
      if (this.peek() === '.') {
        this.advance();
        return this.makeToken(TokenType.DOT_DOT, '..');
      }
      return this.makeToken(TokenType.DOT, '.');
    }

    // = , ==, and => (fat arrow)
    if (char === '=') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.EQ, '==');
      }
      if (this.peek() === '>') {
        this.advance();
        return this.makeToken(TokenType.FAT_ARROW, '=>');
      }
      return this.makeToken(TokenType.EQUALS, '=');
    }

    // ? (if) and ?? (pattern match)
    if (char === '?') {
      this.advance();
      if (this.peek() === '?') {
        this.advance();
        return this.makeToken(TokenType.MATCH, '??');
      }
      return this.makeToken(TokenType.IF, '?');
    }

    // : and :? (else and else-if)
    if (char === ':') {
      this.advance();
      if (this.peek() === '?') {
        this.advance();
        return this.makeToken(TokenType.ELSE_IF, ':?');
      }
      return this.makeToken(TokenType.ELSE, ':');
    }

    // >, >=, >! (break), >> (continue), >X (throw)
    if (char === '>') {
      this.advance();
      if (this.peek() === '!') {
        this.advance();
        return this.makeToken(TokenType.BREAK, '>!');
      }
      if (this.peek() === '>') {
        this.advance();
        return this.makeToken(TokenType.CONTINUE, '>>');
      }
      if (this.peek() === 'X') {
        this.advance();
        return this.makeToken(TokenType.THROW, '>X');
      }
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.GTE, '>=');
      }
      return this.makeToken(TokenType.GT, '>');
    }

    // <, <=, and <- (import)
    if (char === '<') {
      this.advance();
      if (this.peek() === '-') {
        this.advance();
        return this.makeToken(TokenType.IMPORT, '<-');
      }
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.LTE, '<=');
      }
      return this.makeToken(TokenType.LT, '<');
    }

    // ! and !=
    if (char === '!') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.NEQ, '!=');
      }
      return this.makeToken(TokenType.NOT, '!');
    }

    // & (guard), && (logical and)
    if (char === '&') {
      this.advance();
      if (this.peek() === '&') {
        this.advance();
        return this.makeToken(TokenType.AND, '&&');
      }
      return this.makeToken(TokenType.AMPERSAND, '&');
    }

    // | (match arm), || (logical or)
    if (char === '|') {
      this.advance();
      if (this.peek() === '|') {
        this.advance();
        return this.makeToken(TokenType.OR, '||');
      }
      return this.makeToken(TokenType.PIPE, '|');
    }

    // Arithmetic operators (check multi-char first)
    // + , ++, +=
    if (char === '+') {
      this.advance();
      if (this.peek() === '+') {
        this.advance();
        return this.makeToken(TokenType.PLUS_PLUS, '++');
      }
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.PLUS_EQUALS, '+=');
      }
      return this.makeToken(TokenType.PLUS, '+');
    }
    // -, --, -=, -> (export)
    if (char === '-') {
      this.advance();
      if (this.peek() === '-') {
        this.advance();
        return this.makeToken(TokenType.MINUS_MINUS, '--');
      }
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.MINUS_EQUALS, '-=');
      }
      if (this.peek() === '>') {
        this.advance();
        return this.makeToken(TokenType.EXPORT, '->');
      }
      return this.makeToken(TokenType.MINUS, '-');
    }
    // *, **, *=, **=
    if (char === '*') {
      this.advance();
      if (this.peek() === '*') {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return this.makeToken(TokenType.STAR_STAR_EQUALS, '**=');
        }
        return this.makeToken(TokenType.STAR_STAR, '**');
      }
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.STAR_EQUALS, '*=');
      }
      return this.makeToken(TokenType.STAR, '*');
    }
    // /, /=
    if (char === '/') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.SLASH_EQUALS, '/=');
      }
      return this.makeToken(TokenType.SLASH, '/');
    }
    // %, %=
    if (char === '%') {
      this.advance();
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.PERCENT_EQUALS, '%=');
      }
      return this.makeToken(TokenType.PERCENT, '%');
    }

    // Newline
    if (char === '\n') {
      this.advance();
      this.line++;
      this.column = 1;
      return this.makeToken(TokenType.NEWLINE, '\n');
    }

    // String literal
    if (char === '"') {
      return this.readString();
    }

    // Number literal
    if (this.isDigit(char)) {
      return this.readNumber();
    }

    // Null literal: standalone _
    if (char === '_' && !this.isAlphaNumeric(this.peekNext())) {
      this.advance();
      return this.makeToken(TokenType.NULL, '_');
    }

    // JS injection block: $js { ... }
    if (char === '$') {
      if (this.source[this.pos + 1] === 'j' && this.source[this.pos + 2] === 's') {
        return this.readJsBlock();
      }
      throw new Error(`Unexpected character '$' at line ${this.line}, column ${this.column}. Did you mean '$js { ... }'?`);
    }

    // Keywords and identifiers
    if (this.isAlpha(char)) {
      return this.readIdentifier();
    }

    throw new Error(`Unexpected character '${char}' at line ${this.line}, column ${this.column}`);
  }

  private readString(): Token {
    const startColumn = this.column;
    this.advance(); // consume opening quote

    let value = '';
    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\n') {
        throw new Error(`Unterminated string at line ${this.line}`);
      }
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.peek();
        if (escaped === 'n') value += '\n';
        else if (escaped === 't') value += '\t';
        else if (escaped === '"') value += '"';
        else if (escaped === '\\') value += '\\';
        else value += escaped;
      } else {
        value += this.peek();
      }
      this.advance();
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${this.line}`);
    }

    this.advance(); // consume closing quote
    return { type: TokenType.STRING_LITERAL, value, line: this.line, column: startColumn };
  }

  private readInterpolatedString(startColumn: number): Token {
    this.advance(); // consume opening quote

    let value = '';
    let braceDepth = 0;

    while (!this.isAtEnd() && (this.peek() !== '"' || braceDepth > 0)) {
      if (this.peek() === '\n') {
        throw new Error(`Unterminated interpolated string at line ${this.line}`);
      }

      if (this.peek() === '{') {
        braceDepth++;
        value += this.peek();
        this.advance();
      } else if (this.peek() === '}') {
        braceDepth--;
        value += this.peek();
        this.advance();
      } else if (this.peek() === '\\') {
        this.advance();
        const escaped = this.peek();
        if (escaped === 'n') value += '\n';
        else if (escaped === 't') value += '\t';
        else if (escaped === '"') value += '"';
        else if (escaped === '\\') value += '\\';
        else if (escaped === '{') value += '{';
        else if (escaped === '}') value += '}';
        else value += escaped;
        this.advance();
      } else {
        value += this.peek();
        this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated interpolated string at line ${this.line}`);
    }

    this.advance(); // consume closing quote
    return { type: TokenType.INTERP_STRING, value, line: this.line, column: startColumn };
  }

  private readJsBlock(): Token {
    const startLine = this.line;
    const startColumn = this.column;

    // Consume "$js"
    this.advance(); // $
    this.advance(); // j
    this.advance(); // s

    // Skip whitespace/newlines to find opening {
    while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t' || this.peek() === '\n' || this.peek() === '\r')) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
      }
      this.advance();
    }

    if (this.isAtEnd() || this.peek() !== '{') {
      throw new Error(`Expected '{' after $js at line ${startLine}, column ${startColumn}`);
    }
    this.advance(); // consume opening {

    let code = '';
    let braceDepth = 1;

    while (!this.isAtEnd() && braceDepth > 0) {
      const ch = this.peek();

      if (ch === '{') {
        braceDepth++;
      } else if (ch === '}') {
        braceDepth--;
        if (braceDepth === 0) break;
      }

      if (ch === '\n') {
        this.line++;
        this.column = 0;
      }

      code += ch;
      this.advance();
    }

    if (this.isAtEnd() && braceDepth > 0) {
      throw new Error(`Unterminated $js block starting at line ${startLine}, column ${startColumn}`);
    }

    this.advance(); // consume closing }

    return { type: TokenType.JS_BLOCK, value: code.trim(), line: startLine, column: startColumn };
  }

  private readNumber(): Token {
    const startColumn = this.column;
    let value = '';

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.peek();
      this.advance();
    }

    // Check for float
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.peek();
      this.advance();
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.peek();
        this.advance();
      }
    }

    return { type: TokenType.NUMBER_LITERAL, value, line: this.line, column: startColumn };
  }

  private readIdentifier(): Token {
    const startColumn = this.column;
    let value = '';

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.peek();
      this.advance();
    }

    // Check for tuple types: ti5, tsN, tf3, tb2, etc.
    // Pattern: t + (i|f|s|b) + (N | digits)
    const tupleMatch = value.match(/^t([ifsb])(N|\d+)$/);
    if (tupleMatch) {
      const elementTypeChar = tupleMatch[1];
      const lengthSpec = tupleMatch[2];
      const next = this.peek();
      const tupleTypeToken = this.getTupleTypeToken(elementTypeChar);
      const tupleCastToken = this.getTupleCastToken(elementTypeChar);

      // Tuple cast expression: tiN(, ti5(, etc.
      if (next === '(') {
        this.advance(); // consume (
        return { type: tupleCastToken, value: value + '(', line: this.line, column: startColumn, tupleLength: lengthSpec };
      }

      // Tuple type declaration: ti5#, tfN~, etc.
      if (next === '#' || next === '~') {
        return { type: tupleTypeToken, value, line: this.line, column: startColumn, tupleLength: lengthSpec };
      }

      // Tuple return type before function: ti3 Z, tsN Z
      if (this.isReturnTypeBeforeFunc()) {
        return { type: tupleTypeToken, value, line: this.line, column: startColumn, tupleLength: lengthSpec };
      }
    }

    // Check for type prefixes and special forms
    if (value.length === 1 && ['s', 'i', 'f', 'b'].includes(value)) {
      const next = this.peek();

      // Type declaration: s#, i~, etc.
      if (next === '#' || next === '~') {
        switch (value) {
          case 's': return { type: TokenType.TYPE_STRING, value, line: this.line, column: startColumn };
          case 'i': return { type: TokenType.TYPE_INT, value, line: this.line, column: startColumn };
          case 'f': return { type: TokenType.TYPE_FLOAT, value, line: this.line, column: startColumn };
          case 'b': return { type: TokenType.TYPE_BOOL, value, line: this.line, column: startColumn };
        }
      }

      // Return type before function: i Z, s Z, etc.
      if (this.isReturnTypeBeforeFunc()) {
        switch (value) {
          case 's': return { type: TokenType.TYPE_STRING, value, line: this.line, column: startColumn };
          case 'i': return { type: TokenType.TYPE_INT, value, line: this.line, column: startColumn };
          case 'f': return { type: TokenType.TYPE_FLOAT, value, line: this.line, column: startColumn };
          case 'b': return { type: TokenType.TYPE_BOOL, value, line: this.line, column: startColumn };
        }
      }

      // Interpolated string: s"..."
      if (value === 's' && next === '"') {
        return this.readInterpolatedString(startColumn);
      }

      // Cast expressions: s(, i(, f(, b(
      if (next === '(') {
        this.advance(); // consume the (
        switch (value) {
          case 's': return { type: TokenType.CAST_STRING, value: 's(', line: this.line, column: startColumn };
          case 'i': return { type: TokenType.CAST_INT, value: 'i(', line: this.line, column: startColumn };
          case 'f': return { type: TokenType.CAST_FLOAT, value: 'f(', line: this.line, column: startColumn };
          case 'b': return { type: TokenType.CAST_BOOL, value: 'b(', line: this.line, column: startColumn };
        }
      }

      // Array type: i[], s[], f[], b[]
      if (next === '[') {
        switch (value) {
          case 's': return { type: TokenType.TYPE_STRING, value, line: this.line, column: startColumn };
          case 'i': return { type: TokenType.TYPE_INT, value, line: this.line, column: startColumn };
          case 'f': return { type: TokenType.TYPE_FLOAT, value, line: this.line, column: startColumn };
          case 'b': return { type: TokenType.TYPE_BOOL, value, line: this.line, column: startColumn };
        }
      }
    }

    // Keywords
    if (value === 'print') {
      return { type: TokenType.PRINT, value, line: this.line, column: startColumn };
    }
    if (value === 'error') {
      return { type: TokenType.ERROR, value, line: this.line, column: startColumn };
    }
    if (value === 'true') {
      return { type: TokenType.BOOL_LITERAL, value, line: this.line, column: startColumn };
    }
    if (value === 'false') {
      return { type: TokenType.BOOL_LITERAL, value, line: this.line, column: startColumn };
    }
    if (value === 'Z') {
      return { type: TokenType.FUNC, value, line: this.line, column: startColumn };
    }
    if (value === 'E') {
      return { type: TokenType.ENUM, value, line: this.line, column: startColumn };
    }
    if (value === 'S') {
      return { type: TokenType.STRUCT, value, line: this.line, column: startColumn };
    }

    return { type: TokenType.IDENTIFIER, value, line: this.line, column: startColumn };
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '/' && this.peekNext() === '/') {
        // Skip line comments
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  private peek(): string {
    return this.source[this.pos];
  }

  private peekNext(): string {
    return this.source[this.pos + 1] || '';
  }

  private advance(): boolean {
    if (!this.isAtEnd()) {
      this.pos++;
      this.column++;
      return true;
    }
    return false;
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  // Check if we're at a position where a single letter type is followed by Z (for function return types)
  private isReturnTypeBeforeFunc(): boolean {
    let lookAhead = this.pos;
    // Skip whitespace
    while (lookAhead < this.source.length && (this.source[lookAhead] === ' ' || this.source[lookAhead] === '\t')) {
      lookAhead++;
    }
    // Check if the next non-whitespace is 'Z'
    return this.source[lookAhead] === 'Z' &&
           (lookAhead + 1 >= this.source.length || !this.isAlphaNumeric(this.source[lookAhead + 1]));
  }

  private makeToken(type: TokenType, value: string): Token {
    return { type, value, line: this.line, column: this.column - value.length };
  }

  private getTupleTypeToken(elementTypeChar: string): TokenType {
    switch (elementTypeChar) {
      case 'i': return TokenType.TYPE_TUPLE_INT;
      case 'f': return TokenType.TYPE_TUPLE_FLOAT;
      case 's': return TokenType.TYPE_TUPLE_STRING;
      case 'b': return TokenType.TYPE_TUPLE_BOOL;
      default: throw new Error(`Invalid tuple element type: ${elementTypeChar}`);
    }
  }

  private getTupleCastToken(elementTypeChar: string): TokenType {
    switch (elementTypeChar) {
      case 'i': return TokenType.CAST_TUPLE_INT;
      case 'f': return TokenType.CAST_TUPLE_FLOAT;
      case 's': return TokenType.CAST_TUPLE_STRING;
      case 'b': return TokenType.CAST_TUPLE_BOOL;
      default: throw new Error(`Invalid tuple element type: ${elementTypeChar}`);
    }
  }
}
