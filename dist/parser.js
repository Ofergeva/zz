// Recursive Descent Parser for ZZ Language
import { TokenType, Lexer } from './lexer.js';
export class Parser {
    tokens;
    pos = 0;
    enumNames = new Set(); // Track known enum names for type resolution
    structNames = new Set(); // Track known struct names for type resolution
    constructor(tokens, externalTypes) {
        this.tokens = tokens;
        if (externalTypes?.structNames) {
            externalTypes.structNames.forEach(n => this.structNames.add(n));
        }
        if (externalTypes?.enumNames) {
            externalTypes.enumNames.forEach(n => this.enumNames.add(n));
        }
    }
    parse() {
        // First pass: collect all enum and struct names for type resolution
        this.collectTypeNames();
        const statements = [];
        while (!this.isAtEnd()) {
            this.skipNewlines();
            if (!this.isAtEnd()) {
                statements.push(this.parseStatement());
            }
        }
        return {
            type: 'Program',
            statements,
            line: 1,
            column: 1,
        };
    }
    // First pass to collect enum and struct names before parsing
    collectTypeNames() {
        const savedPos = this.pos;
        while (!this.isAtEnd()) {
            const token = this.peek();
            if (token.type === TokenType.ENUM) {
                this.advance(); // consume E
                const nameToken = this.peek();
                if (nameToken.type === TokenType.IDENTIFIER) {
                    this.enumNames.add(nameToken.value);
                }
            }
            else if (token.type === TokenType.STRUCT) {
                this.advance(); // consume S
                const nameToken = this.peek();
                if (nameToken.type === TokenType.IDENTIFIER) {
                    this.structNames.add(nameToken.value);
                }
            }
            this.advance();
        }
        this.pos = savedPos; // Reset position for actual parsing
    }
    parseStatement() {
        const token = this.peek();
        // Import statement: <- { name } = "./path" or <- name = "./path"
        // Unsafe import: <-! { name } = "npm-package"
        if (token.type === TokenType.IMPORT || token.type === TokenType.IMPORT_UNSAFE) {
            return this.parseImportStatement();
        }
        // Export: -> before function or variable declaration
        if (token.type === TokenType.EXPORT) {
            return this.parseExportedDeclaration();
        }
        // Function declaration with return type: i Z funcName(...) or i[] Z funcName(...)
        if (this.isTypeToken(token.type)) {
            // Check if this is a function declaration by looking ahead
            if (this.peekNext()?.type === TokenType.FUNC) {
                // Simple type return: i Z
                return this.parseFunctionDeclaration();
            }
            if (this.peekNext()?.type === TokenType.LBRACKET) {
                // Could be array return type or array variable declaration
                // Look ahead past the [] to see if Z follows
                let lookAhead = 2; // skip type and [
                if (this.tokens[this.pos + lookAhead]?.type === TokenType.NUMBER_LITERAL) {
                    lookAhead++; // skip optional size
                }
                if (this.tokens[this.pos + lookAhead]?.type === TokenType.RBRACKET) {
                    lookAhead++; // skip ]
                    if (this.tokens[this.pos + lookAhead]?.type === TokenType.FUNC) {
                        // This is a function with array return type
                        return this.parseFunctionDeclaration();
                    }
                }
            }
            // Otherwise it's a variable declaration
            return this.parseVariableDeclaration();
        }
        // Function declaration without return type (void): Z funcName(...)
        if (token.type === TokenType.FUNC) {
            return this.parseFunctionDeclaration();
        }
        // Enum declaration: E EnumName Variant1 Variant2 ... ;
        if (token.type === TokenType.ENUM) {
            return this.parseEnumDeclaration();
        }
        // Struct declaration: S StructName ... ;
        if (token.type === TokenType.STRUCT) {
            return this.parseStructDeclaration();
        }
        // Enum type variable declaration: Color#c = Color.Red
        if (token.type === TokenType.IDENTIFIER && this.enumNames.has(token.value)) {
            const nextToken = this.peekNext();
            if (nextToken?.type === TokenType.IMMUTABLE || nextToken?.type === TokenType.MUTABLE) {
                return this.parseEnumVariableDeclaration();
            }
            // Could be enum return type for function: Color Z getColor()
            if (nextToken?.type === TokenType.FUNC) {
                return this.parseFunctionDeclaration();
            }
        }
        // Struct type variable declaration: Person#p = Person(...)
        if (token.type === TokenType.IDENTIFIER && this.structNames.has(token.value)) {
            const nextToken = this.peekNext();
            if (nextToken?.type === TokenType.IMMUTABLE || nextToken?.type === TokenType.MUTABLE) {
                return this.parseStructVariableDeclaration();
            }
            // Could be struct return type for function: Person Z createPerson()
            if (nextToken?.type === TokenType.FUNC) {
                return this.parseFunctionDeclaration();
            }
        }
        // Print statement: print(expr)
        if (token.type === TokenType.PRINT) {
            return this.parsePrintStatement();
        }
        // Error statement: error(expr)
        if (token.type === TokenType.ERROR) {
            return this.parseErrorStatement();
        }
        // Throw statement: >X(expr)
        if (token.type === TokenType.THROW) {
            return this.parseThrowStatement();
        }
        // While statement: @(condition) ... ;
        if (token.type === TokenType.WHILE) {
            return this.parseWhileStatement();
        }
        // If statement: ?(condition) ... ; OR Try statement: ? ... :(e) ... ;
        if (token.type === TokenType.IF) {
            // Look ahead to see if there's a ( immediately after ?
            if (this.peekNext()?.type === TokenType.LPAREN) {
                return this.parseIfStatement();
            }
            else {
                // No parenthesis = try statement
                return this.parseTryStatement();
            }
        }
        // Match expression: ??(value) | pattern => body ;
        if (token.type === TokenType.MATCH) {
            return this.parseMatchExpression();
        }
        // Assignment: name = value
        if (token.type === TokenType.IDENTIFIER && this.peekNext()?.type === TokenType.EQUALS) {
            return this.parseAssignment();
        }
        // Increment/Decrement: name++ or name--
        if (token.type === TokenType.IDENTIFIER &&
            (this.peekNext()?.type === TokenType.PLUS_PLUS || this.peekNext()?.type === TokenType.MINUS_MINUS)) {
            return this.parseIncrementStatement();
        }
        // Compound assignment: name += value, name -= value, etc.
        if (token.type === TokenType.IDENTIFIER && this.isCompoundAssignmentToken(this.peekNext()?.type)) {
            return this.parseCompoundAssignment();
        }
        // Index assignment: arr[0] = value OR Field assignment: obj.field = value
        if (token.type === TokenType.IDENTIFIER && (this.peekNext()?.type === TokenType.LBRACKET || this.peekNext()?.type === TokenType.DOT)) {
            return this.parseAccessAssignmentOrExpression();
        }
        // Expression statement (e.g., function call)
        if (token.type === TokenType.IDENTIFIER && this.peekNext()?.type === TokenType.LPAREN) {
            return this.parseExpressionStatement();
        }
        // Expression statement with dot (e.g., arr.push(x))
        if (token.type === TokenType.IDENTIFIER && this.peekNext()?.type === TokenType.DOT) {
            return this.parseExpressionStatement();
        }
        // Break statement: >!
        if (token.type === TokenType.BREAK) {
            this.advance();
            this.expectEndOfStatement();
            return {
                type: 'BreakStatement',
                line: token.line,
                column: token.column,
            };
        }
        // Continue statement: >>
        if (token.type === TokenType.CONTINUE) {
            this.advance();
            this.expectEndOfStatement();
            return {
                type: 'ContinueStatement',
                line: token.line,
                column: token.column,
            };
        }
        // Raw JavaScript injection: $js { ... }
        if (token.type === TokenType.JS_BLOCK) {
            this.advance();
            this.skipNewlines();
            return {
                type: 'JSBlockStatement',
                code: token.value,
                line: token.line,
                column: token.column,
            };
        }
        throw new Error(`Unexpected token '${token.value}' at line ${token.line}, column ${token.column}`);
    }
    // Parse import statement: <- { name, alias=original } = "./path" or <- namespace = "./path"
    // Also handles unsafe imports: <-! { name } = "npm-package"
    parseImportStatement() {
        const importToken = this.advance(); // consume <- or <-!
        const isUnsafe = importToken.type === TokenType.IMPORT_UNSAFE;
        let specifiers = [];
        let namespace;
        // Check if it's a destructured import { ... } or namespace import
        if (this.peek().type === TokenType.LBRACE) {
            // Destructured import: <- { add, sub, plus=add } = "./path"
            this.advance(); // consume {
            while (this.peek().type !== TokenType.RBRACE) {
                const firstToken = this.expect([TokenType.IDENTIFIER]);
                if (this.peek().type === TokenType.EQUALS) {
                    // Aliased import: alias=original
                    this.advance(); // consume =
                    const originalToken = this.expect([TokenType.IDENTIFIER]);
                    specifiers.push({ name: originalToken.value, alias: firstToken.value });
                }
                else {
                    // Simple import: name
                    specifiers.push({ name: firstToken.value });
                }
                // Optional comma
                if (this.peek().type === TokenType.COMMA) {
                    this.advance();
                }
            }
            this.expect([TokenType.RBRACE]); // consume }
        }
        else if (this.peek().type === TokenType.IDENTIFIER) {
            // Namespace import: <- utils = "./path"
            const namespaceToken = this.advance();
            namespace = namespaceToken.value;
        }
        else {
            throw new Error(`Expected { or identifier after <- at line ${importToken.line}`);
        }
        // Expect = "path" or = std/module
        this.expect([TokenType.EQUALS]);
        let source;
        let isStdLib = false;
        if (this.peek().type === TokenType.STRING_LITERAL) {
            // Quoted path: <- { x } = "./path"
            source = this.advance().value;
        }
        else if (this.peek().type === TokenType.IDENTIFIER) {
            // Unquoted module path: <- { x } = std/string
            const parts = [this.advance().value];
            while (this.peek().type === TokenType.SLASH) {
                this.advance(); // consume /
                parts.push(this.expect([TokenType.IDENTIFIER]).value);
            }
            source = parts.join('/');
            isStdLib = true;
        }
        else {
            throw new Error(`Expected string path or module name after = in import at line ${importToken.line}`);
        }
        this.expectEndOfStatement();
        return {
            type: 'ImportStatement',
            specifiers,
            namespace,
            source,
            isStdLib,
            isUnsafe,
            line: importToken.line,
            column: importToken.column,
        };
    }
    // Parse exported declaration: -> before function, variable, enum, or struct
    parseExportedDeclaration() {
        const exportToken = this.advance(); // consume ->
        // Next must be a type token (for variable or function with return type), Z (for void function),
        // E (for enum declaration), S (for struct declaration), or enum/struct name (for variable/function)
        const nextToken = this.peek();
        // Enum declaration: ->E EnumName ...
        if (nextToken.type === TokenType.ENUM) {
            return this.parseEnumDeclaration(true);
        }
        // Struct declaration: ->S StructName ...
        if (nextToken.type === TokenType.STRUCT) {
            return this.parseStructDeclaration(true);
        }
        // Enum type variable or function: ->Color#c or ->Color Z getColor()
        if (nextToken.type === TokenType.IDENTIFIER && this.enumNames.has(nextToken.value)) {
            const peekNextToken = this.peekNext();
            if (peekNextToken?.type === TokenType.IMMUTABLE || peekNextToken?.type === TokenType.MUTABLE) {
                return this.parseEnumVariableDeclaration(true);
            }
            if (peekNextToken?.type === TokenType.FUNC) {
                return this.parseFunctionDeclaration(true);
            }
        }
        // Struct type variable or function: ->Person#p or ->Person Z createPerson()
        if (nextToken.type === TokenType.IDENTIFIER && this.structNames.has(nextToken.value)) {
            const peekNextToken = this.peekNext();
            if (peekNextToken?.type === TokenType.IMMUTABLE || peekNextToken?.type === TokenType.MUTABLE) {
                return this.parseStructVariableDeclaration(true);
            }
            if (peekNextToken?.type === TokenType.FUNC) {
                return this.parseFunctionDeclaration(true);
            }
        }
        if (this.isTypeToken(nextToken.type)) {
            // Could be variable declaration or function with return type
            if (this.peekNext()?.type === TokenType.FUNC) {
                return this.parseFunctionDeclaration(true);
            }
            // Check for array return type
            if (this.peekNext()?.type === TokenType.LBRACKET) {
                let lookAhead = 2;
                if (this.tokens[this.pos + lookAhead]?.type === TokenType.NUMBER_LITERAL) {
                    lookAhead++;
                }
                if (this.tokens[this.pos + lookAhead]?.type === TokenType.RBRACKET) {
                    lookAhead++;
                    if (this.tokens[this.pos + lookAhead]?.type === TokenType.FUNC) {
                        return this.parseFunctionDeclaration(true);
                    }
                }
            }
            // Variable declaration
            return this.parseVariableDeclaration(true);
        }
        if (nextToken.type === TokenType.FUNC) {
            // Void function
            return this.parseFunctionDeclaration(true);
        }
        throw new Error(`Expected variable or function declaration after -> at line ${exportToken.line}`);
    }
    parseVariableDeclaration(exported = false) {
        const typeToken = this.advance();
        let dataType;
        // Check for tuple type: ti5, tsN, etc.
        if (this.isTupleTypeToken(typeToken.type)) {
            const elementType = this.tupleTokenToElementType(typeToken);
            const length = typeToken.tupleLength === 'N' ? undefined : parseInt(typeToken.tupleLength, 10);
            dataType = {
                kind: 'tuple',
                elementType,
                length,
            };
        }
        else {
            dataType = this.tokenToDataType(typeToken.type);
            // Check for array type: i[], i[5], s[], etc.
            if (this.peek().type === TokenType.LBRACKET) {
                this.advance(); // consume [
                let size;
                // Check for optional size
                if (this.peek().type === TokenType.NUMBER_LITERAL) {
                    const sizeToken = this.advance();
                    size = parseInt(sizeToken.value, 10);
                }
                this.expect([TokenType.RBRACKET]);
                dataType = {
                    kind: 'array',
                    elementType: this.tokenToDataType(typeToken.type),
                    size,
                };
            }
        }
        const mutabilityToken = this.expect([TokenType.IMMUTABLE, TokenType.MUTABLE]);
        const mutability = mutabilityToken.type === TokenType.IMMUTABLE ? 'immutable' : 'mutable';
        const nameToken = this.expect([TokenType.IDENTIFIER]);
        const name = nameToken.value;
        this.expect([TokenType.EQUALS]);
        const value = this.parseExpression();
        this.expectEndOfStatement();
        return {
            type: 'VariableDeclaration',
            dataType,
            mutability,
            name,
            value,
            exported,
            line: typeToken.line,
            column: typeToken.column,
        };
    }
    parseAssignment() {
        const nameToken = this.advance();
        const name = nameToken.value;
        this.expect([TokenType.EQUALS]);
        const value = this.parseExpression();
        this.expectEndOfStatement();
        return {
            type: 'Assignment',
            name,
            value,
            line: nameToken.line,
            column: nameToken.column,
        };
    }
    parseIncrementStatement() {
        const nameToken = this.advance();
        const name = nameToken.value;
        const operatorToken = this.advance(); // consume ++ or --
        const operator = operatorToken.value;
        this.expectEndOfStatement();
        return {
            type: 'IncrementStatement',
            name,
            operator,
            line: nameToken.line,
            column: nameToken.column,
        };
    }
    parseCompoundAssignment() {
        const nameToken = this.advance();
        const name = nameToken.value;
        const operatorToken = this.advance(); // consume +=, -=, etc.
        const operator = operatorToken.value;
        const value = this.parseExpression();
        this.expectEndOfStatement();
        return {
            type: 'CompoundAssignment',
            name,
            operator,
            value,
            line: nameToken.line,
            column: nameToken.column,
        };
    }
    isCompoundAssignmentToken(type) {
        if (!type)
            return false;
        return [
            TokenType.PLUS_EQUALS,
            TokenType.MINUS_EQUALS,
            TokenType.STAR_EQUALS,
            TokenType.SLASH_EQUALS,
            TokenType.PERCENT_EQUALS,
            TokenType.STAR_STAR_EQUALS,
        ].includes(type);
    }
    parseAccessAssignmentOrExpression() {
        const startToken = this.peek();
        // Parse the expression (which will include index access or member access)
        const expr = this.parseExpression();
        // Check if this is an assignment
        if (this.peek().type === TokenType.EQUALS) {
            // This is an index assignment: arr[0] = value
            if (expr.type === 'IndexAccess') {
                this.advance(); // consume =
                const value = this.parseExpression();
                this.expectEndOfStatement();
                return {
                    type: 'IndexAssignment',
                    array: expr.array,
                    index: expr.index,
                    value,
                    line: startToken.line,
                    column: startToken.column,
                };
            }
            // This is a field assignment: obj.field = value
            if (expr.type === 'MemberExpression') {
                this.advance(); // consume =
                const value = this.parseExpression();
                this.expectEndOfStatement();
                return {
                    type: 'FieldAssignment',
                    object: expr.object,
                    field: expr.property,
                    value,
                    line: startToken.line,
                    column: startToken.column,
                };
            }
            throw new Error(`Expected index or field access for assignment at line ${startToken.line}`);
        }
        // Otherwise it's an expression statement
        this.expectEndOfStatement();
        return {
            type: 'ExpressionStatement',
            expression: expr,
            line: startToken.line,
            column: startToken.column,
        };
    }
    parsePrintStatement() {
        const printToken = this.advance();
        this.expect([TokenType.LPAREN]);
        const expression = this.parseExpression();
        this.expect([TokenType.RPAREN]);
        this.expectEndOfStatement();
        return {
            type: 'PrintStatement',
            expression,
            line: printToken.line,
            column: printToken.column,
        };
    }
    parseErrorStatement() {
        const errorToken = this.advance();
        this.expect([TokenType.LPAREN]);
        const expression = this.parseExpression();
        this.expect([TokenType.RPAREN]);
        this.expectEndOfStatement();
        return {
            type: 'ErrorStatement',
            expression,
            line: errorToken.line,
            column: errorToken.column,
        };
    }
    parseThrowStatement() {
        const throwToken = this.advance(); // consume >X
        this.expect([TokenType.LPAREN]);
        const expression = this.parseExpression();
        this.expect([TokenType.RPAREN]);
        this.expectEndOfStatement();
        return {
            type: 'ThrowStatement',
            expression,
            line: throwToken.line,
            column: throwToken.column,
        };
    }
    parseWhileStatement() {
        const loopToken = this.advance(); // consume @
        this.expect([TokenType.LPAREN]);
        // Check if this is a for loop: @(identifier#range) or @(i#range) where i could be TYPE_INT
        // Look ahead: (IDENTIFIER or TYPE token) followed by # (IMMUTABLE)
        const currentToken = this.peek();
        const isForLoopVar = (currentToken.type === TokenType.IDENTIFIER || this.isTypeToken(currentToken.type))
            && this.peekNext()?.type === TokenType.IMMUTABLE;
        if (isForLoopVar) {
            return this.parseForLoop(loopToken);
        }
        // Otherwise it's a while loop
        const condition = this.parseExpression();
        this.expect([TokenType.RPAREN]);
        this.skipNewlines();
        const body = this.parseBlock();
        return {
            type: 'WhileStatement',
            condition,
            body,
            line: loopToken.line,
            column: loopToken.column,
        };
    }
    parseForLoop(loopToken) {
        // Already consumed @ and (, now at identifier (or type token used as variable name)
        const varToken = this.advance(); // consume identifier/type
        const variable = varToken.value;
        this.expect([TokenType.IMMUTABLE]); // consume #
        // Parse the first expression after #
        const firstExpr = this.parseAdditive();
        if (this.peek().type === TokenType.DOT_DOT) {
            // Range loop: @(i#1..5)
            this.advance(); // consume ..
            const end = this.parseAdditive();
            this.expect([TokenType.RPAREN]);
            this.skipNewlines();
            const body = this.parseBlock();
            return {
                type: 'ForStatement',
                variable,
                start: firstExpr,
                end,
                body,
                line: loopToken.line,
                column: loopToken.column,
            };
        }
        else {
            // For-each loop: @(person#people)
            this.expect([TokenType.RPAREN]);
            this.skipNewlines();
            const body = this.parseBlock();
            return {
                type: 'ForEachStatement',
                variable,
                iterable: firstExpr,
                body,
                line: loopToken.line,
                column: loopToken.column,
            };
        }
    }
    parseIfStatement() {
        const ifToken = this.advance(); // consume ?
        this.expect([TokenType.LPAREN]);
        const condition = this.parseExpression();
        this.expect([TokenType.RPAREN]);
        this.skipNewlines();
        const ifBody = this.parseBlockUntilElseOrEnd();
        const ifBranch = { condition, body: ifBody };
        const elseIfBranches = [];
        let elseBranch = null;
        // Parse :? (else-if) branches
        while (this.peek().type === TokenType.ELSE_IF) {
            this.advance(); // consume :?
            this.expect([TokenType.LPAREN]);
            const elseIfCondition = this.parseExpression();
            this.expect([TokenType.RPAREN]);
            this.skipNewlines();
            const elseIfBody = this.parseBlockUntilElseOrEnd();
            elseIfBranches.push({ condition: elseIfCondition, body: elseIfBody });
        }
        // Parse : (else) branch
        if (this.peek().type === TokenType.ELSE) {
            this.advance(); // consume :
            this.skipNewlines();
            elseBranch = this.parseBlock();
        }
        else {
            // No else, just expect ;
            this.expect([TokenType.SEMICOLON]);
            this.skipNewlines();
        }
        return {
            type: 'IfStatement',
            ifBranch,
            elseIfBranches,
            elseBranch,
            line: ifToken.line,
            column: ifToken.column,
        };
    }
    parseTryStatement() {
        const tryToken = this.advance(); // consume ?
        this.skipNewlines();
        // Parse try body until we hit :( (catch)
        const tryBody = [];
        while (!(this.peek().type === TokenType.ELSE && this.peekNext()?.type === TokenType.LPAREN) &&
            this.peek().type !== TokenType.SEMICOLON &&
            !this.isAtEnd()) {
            this.skipNewlines();
            if ((this.peek().type === TokenType.ELSE && this.peekNext()?.type === TokenType.LPAREN) ||
                this.peek().type === TokenType.SEMICOLON)
                break;
            tryBody.push(this.parseStatement());
        }
        // Expect :( for catch
        this.expect([TokenType.ELSE]); // consume :
        this.expect([TokenType.LPAREN]); // consume (
        // Get the catch variable name
        const catchVarToken = this.expect([TokenType.IDENTIFIER]);
        const catchVariable = catchVarToken.value;
        this.expect([TokenType.RPAREN]); // consume )
        this.skipNewlines();
        // Parse catch body until ;
        const catchBody = this.parseBlock();
        return {
            type: 'TryStatement',
            tryBody,
            catchVariable,
            catchBody,
            line: tryToken.line,
            column: tryToken.column,
        };
    }
    parseMatchExpression() {
        const matchToken = this.advance(); // consume ??
        this.expect([TokenType.LPAREN]);
        const value = this.parseExpression();
        this.expect([TokenType.RPAREN]);
        this.skipNewlines();
        const arms = [];
        while (this.peek().type === TokenType.PIPE) {
            arms.push(this.parseMatchArm());
            this.skipNewlines();
        }
        this.expect([TokenType.SEMICOLON]);
        this.skipNewlines();
        return {
            type: 'MatchExpression',
            value,
            arms,
            line: matchToken.line,
            column: matchToken.column,
        };
    }
    parseMatchArm() {
        const pipeToken = this.advance(); // consume |
        this.skipNewlines();
        const pattern = this.parsePattern();
        // Check for guard: & condition
        let guard;
        if (this.peek().type === TokenType.AMPERSAND) {
            this.advance(); // consume &
            guard = this.parseExpression();
        }
        this.expect([TokenType.FAT_ARROW]);
        this.skipNewlines();
        // Parse body until next | or ;
        const body = [];
        let resultExpression;
        while (this.peek().type !== TokenType.PIPE &&
            this.peek().type !== TokenType.SEMICOLON &&
            !this.isAtEnd()) {
            this.skipNewlines();
            if (this.peek().type === TokenType.PIPE ||
                this.peek().type === TokenType.SEMICOLON)
                break;
            const token = this.peek();
            const nextType = this.peekNext()?.type;
            // Check if this looks like a statement
            const isStatement = (this.isTypeToken(token.type) && nextType !== TokenType.FUNC) ||
                token.type === TokenType.PRINT ||
                token.type === TokenType.ERROR ||
                token.type === TokenType.WHILE ||
                token.type === TokenType.IF ||
                token.type === TokenType.MATCH ||
                token.type === TokenType.FUNC ||
                token.type === TokenType.BREAK ||
                token.type === TokenType.CONTINUE ||
                token.type === TokenType.THROW ||
                token.type === TokenType.JS_BLOCK ||
                (token.type === TokenType.IDENTIFIER && nextType === TokenType.EQUALS) ||
                (token.type === TokenType.IDENTIFIER && (nextType === TokenType.PLUS_PLUS || nextType === TokenType.MINUS_MINUS)) ||
                (token.type === TokenType.IDENTIFIER && this.isCompoundAssignmentToken(nextType)) ||
                (token.type === TokenType.IDENTIFIER && this.enumNames.has(token.value) && nextType === TokenType.IMMUTABLE) ||
                (token.type === TokenType.IDENTIFIER && this.structNames.has(token.value) && nextType === TokenType.IMMUTABLE);
            if (isStatement) {
                body.push(this.parseStatement());
            }
            else {
                // Parse as expression (potential result value)
                const expr = this.parseExpression();
                this.skipNewlines();
                // Check if this is followed by | or ; (end of arm)
                if (this.peek().type === TokenType.PIPE ||
                    this.peek().type === TokenType.SEMICOLON) {
                    resultExpression = expr;
                }
                else {
                    // More statements follow
                    body.push({
                        type: 'ExpressionStatement',
                        expression: expr,
                        line: token.line,
                        column: token.column,
                    });
                }
            }
        }
        return {
            pattern,
            guard,
            body,
            resultExpression,
            line: pipeToken.line,
            column: pipeToken.column,
        };
    }
    parsePattern() {
        const token = this.peek();
        // Wildcard: _
        if (token.type === TokenType.NULL) {
            this.advance();
            return { kind: 'wildcard' };
        }
        // Literal: 42, "hello", true
        if (token.type === TokenType.NUMBER_LITERAL) {
            return { kind: 'literal', value: this.parseNumberLiteral() };
        }
        if (token.type === TokenType.STRING_LITERAL) {
            return { kind: 'literal', value: this.parseStringLiteral() };
        }
        if (token.type === TokenType.BOOL_LITERAL) {
            return { kind: 'literal', value: this.parseBoolLiteral() };
        }
        // Tuple pattern: (x, y, z)
        if (token.type === TokenType.LPAREN) {
            return this.parseTuplePattern();
        }
        // Identifier-based patterns
        if (token.type === TokenType.IDENTIFIER) {
            // Enum pattern: Color.Red
            if (this.enumNames.has(token.value)) {
                this.advance(); // consume enum name
                this.expect([TokenType.DOT]);
                const variantToken = this.expect([TokenType.IDENTIFIER]);
                return {
                    kind: 'enum',
                    enumName: token.value,
                    variant: variantToken.value,
                };
            }
            // Struct pattern: Point(x, y)
            if (this.structNames.has(token.value)) {
                return this.parseStructPattern();
            }
            // Binding pattern: variable name
            this.advance();
            return { kind: 'binding', name: token.value };
        }
        throw new Error(`Unexpected pattern at line ${token.line}, column ${token.column}`);
    }
    parseStructPattern() {
        const structNameToken = this.advance();
        const structName = structNameToken.value;
        this.expect([TokenType.LPAREN]);
        const fields = [];
        while (this.peek().type !== TokenType.RPAREN) {
            fields.push(this.parsePatternField());
            if (this.peek().type === TokenType.COMMA) {
                this.advance();
            }
        }
        this.expect([TokenType.RPAREN]);
        return {
            kind: 'struct',
            structName,
            fields,
        };
    }
    parseTuplePattern() {
        this.advance(); // consume (
        const elements = [];
        while (this.peek().type !== TokenType.RPAREN) {
            elements.push(this.parsePatternField());
            if (this.peek().type === TokenType.COMMA) {
                this.advance();
            }
        }
        this.expect([TokenType.RPAREN]);
        return {
            kind: 'tuple',
            elements,
        };
    }
    parsePatternField() {
        const token = this.peek();
        // Wildcard in field position: _
        if (token.type === TokenType.NULL) {
            this.advance();
            return { pattern: { kind: 'wildcard' } };
        }
        // Literal in field position: 42, "hello", true
        if (token.type === TokenType.NUMBER_LITERAL) {
            return { pattern: { kind: 'literal', value: this.parseNumberLiteral() } };
        }
        if (token.type === TokenType.STRING_LITERAL) {
            return { pattern: { kind: 'literal', value: this.parseStringLiteral() } };
        }
        if (token.type === TokenType.BOOL_LITERAL) {
            return { pattern: { kind: 'literal', value: this.parseBoolLiteral() } };
        }
        // Binding: variable name
        if (token.type === TokenType.IDENTIFIER) {
            this.advance();
            return { binding: token.value };
        }
        throw new Error(`Expected pattern field at line ${token.line}, column ${token.column}`);
    }
    parseEnumDeclaration(exported = false) {
        const enumToken = this.advance(); // consume E
        const nameToken = this.expect([TokenType.IDENTIFIER]);
        this.skipNewlines();
        const variants = [];
        while (this.peek().type !== TokenType.SEMICOLON) {
            const variantToken = this.expect([TokenType.IDENTIFIER]);
            variants.push(variantToken.value);
            this.skipNewlines();
        }
        this.expect([TokenType.SEMICOLON]);
        return {
            type: 'EnumDeclaration',
            name: nameToken.value,
            variants,
            exported,
            line: enumToken.line,
            column: enumToken.column,
        };
    }
    parseEnumVariableDeclaration(exported = false) {
        const typeToken = this.advance(); // consume enum name (e.g., Color)
        const enumName = typeToken.value;
        const dataType = { kind: 'enum', name: enumName };
        const mutabilityToken = this.expect([TokenType.IMMUTABLE, TokenType.MUTABLE]);
        const mutability = mutabilityToken.type === TokenType.IMMUTABLE ? 'immutable' : 'mutable';
        const nameToken = this.expect([TokenType.IDENTIFIER]);
        const name = nameToken.value;
        this.expect([TokenType.EQUALS]);
        const value = this.parseExpression();
        this.expectEndOfStatement();
        return {
            type: 'VariableDeclaration',
            dataType,
            mutability,
            name,
            value,
            exported,
            line: typeToken.line,
            column: typeToken.column,
        };
    }
    parseStructDeclaration(exported = false) {
        const structToken = this.advance(); // consume S
        const nameToken = this.expect([TokenType.IDENTIFIER]);
        this.skipNewlines();
        const fields = [];
        const methods = [];
        while (this.peek().type !== TokenType.SEMICOLON) {
            // Check if this is a method declaration (type Z or Z for void)
            if (this.isMethodStart()) {
                methods.push(this.parseStructMethod());
            }
            else if (this.isTypeToken(this.peek().type) || this.isStructOrEnumType(this.peek())) {
                // Field declaration: type#name
                fields.push(this.parseStructField());
            }
            else {
                throw new Error(`Unexpected token in struct body at line ${this.peek().line}`);
            }
            this.skipNewlines();
        }
        this.expect([TokenType.SEMICOLON]);
        return {
            type: 'StructDeclaration',
            name: nameToken.value,
            fields,
            methods,
            exported,
            line: structToken.line,
            column: structToken.column,
        };
    }
    isMethodStart() {
        const token = this.peek();
        const nextToken = this.peekNext();
        // Void method: Z methodName(
        if (token.type === TokenType.FUNC) {
            return true;
        }
        // Method with return type: type Z methodName( or type[] Z methodName(
        if (this.isTypeToken(token.type) || this.isStructOrEnumType(token)) {
            // Check if Z follows (possibly after [] for array types)
            let lookAhead = 1;
            if (this.tokens[this.pos + lookAhead]?.type === TokenType.LBRACKET) {
                lookAhead++; // skip [
                if (this.tokens[this.pos + lookAhead]?.type === TokenType.NUMBER_LITERAL) {
                    lookAhead++; // skip optional size
                }
                if (this.tokens[this.pos + lookAhead]?.type === TokenType.RBRACKET) {
                    lookAhead++; // skip ]
                }
            }
            return this.tokens[this.pos + lookAhead]?.type === TokenType.FUNC;
        }
        return false;
    }
    isStructOrEnumType(token) {
        return token.type === TokenType.IDENTIFIER &&
            (this.structNames.has(token.value) || this.enumNames.has(token.value));
    }
    parseStructField() {
        const typeToken = this.peek();
        let dataType;
        // Check for struct or enum type
        if (typeToken.type === TokenType.IDENTIFIER) {
            this.advance();
            if (this.structNames.has(typeToken.value)) {
                dataType = { kind: 'struct', name: typeToken.value };
            }
            else if (this.enumNames.has(typeToken.value)) {
                dataType = { kind: 'enum', name: typeToken.value };
            }
            else {
                throw new Error(`Unknown type '${typeToken.value}' at line ${typeToken.line}`);
            }
        }
        else if (this.isTupleTypeToken(typeToken.type)) {
            this.advance();
            const elementType = this.tupleTokenToElementType(typeToken);
            const length = typeToken.tupleLength === 'N' ? undefined : parseInt(typeToken.tupleLength, 10);
            dataType = { kind: 'tuple', elementType, length };
        }
        else {
            this.advance();
            dataType = this.tokenToDataType(typeToken.type);
            // Check for array type: i[], s[], etc.
            if (this.peek().type === TokenType.LBRACKET) {
                this.advance(); // consume [
                let size;
                if (this.peek().type === TokenType.NUMBER_LITERAL) {
                    const sizeToken = this.advance();
                    size = parseInt(sizeToken.value, 10);
                }
                this.expect([TokenType.RBRACKET]);
                dataType = { kind: 'array', elementType: dataType, size };
            }
        }
        this.expect([TokenType.IMMUTABLE]); // Fields use # (immutable declaration syntax)
        const nameToken = this.expect([TokenType.IDENTIFIER]);
        this.skipNewlines();
        return {
            name: nameToken.value,
            dataType,
        };
    }
    parseStructMethod() {
        const startToken = this.peek();
        let returnType = 'void';
        // Check for return type before Z
        if (this.peek().type !== TokenType.FUNC) {
            const typeToken = this.advance();
            // Check for struct or enum return type
            if (typeToken.type === TokenType.IDENTIFIER) {
                if (this.structNames.has(typeToken.value)) {
                    returnType = { kind: 'struct', name: typeToken.value };
                }
                else if (this.enumNames.has(typeToken.value)) {
                    returnType = { kind: 'enum', name: typeToken.value };
                }
            }
            else if (this.isTupleTypeToken(typeToken.type)) {
                const elementType = this.tupleTokenToElementType(typeToken);
                const length = typeToken.tupleLength === 'N' ? undefined : parseInt(typeToken.tupleLength, 10);
                returnType = { kind: 'tuple', elementType, length };
            }
            else {
                const baseType = this.tokenToDataType(typeToken.type);
                // Check for array return type
                if (this.peek().type === TokenType.LBRACKET) {
                    this.advance(); // consume [
                    let size;
                    if (this.peek().type === TokenType.NUMBER_LITERAL) {
                        const sizeToken = this.advance();
                        size = parseInt(sizeToken.value, 10);
                    }
                    this.expect([TokenType.RBRACKET]);
                    returnType = { kind: 'array', elementType: baseType, size };
                }
                else {
                    returnType = baseType;
                }
            }
        }
        // Consume Z
        this.expect([TokenType.FUNC]);
        // Method name
        const nameToken = this.expect([TokenType.IDENTIFIER]);
        // Parameters
        this.expect([TokenType.LPAREN]);
        const parameters = [];
        while (this.peek().type !== TokenType.RPAREN) {
            let paramType;
            const paramTypeToken = this.peek();
            // Check for struct parameter type
            if (paramTypeToken.type === TokenType.IDENTIFIER && this.structNames.has(paramTypeToken.value)) {
                this.advance();
                paramType = { kind: 'struct', name: paramTypeToken.value };
            }
            // Check for enum parameter type
            else if (paramTypeToken.type === TokenType.IDENTIFIER && this.enumNames.has(paramTypeToken.value)) {
                this.advance();
                paramType = { kind: 'enum', name: paramTypeToken.value };
            }
            // Check for tuple type
            else if (this.isTupleTypeToken(paramTypeToken.type)) {
                this.advance();
                const elementType = this.tupleTokenToElementType(paramTypeToken);
                const length = paramTypeToken.tupleLength === 'N' ? undefined : parseInt(paramTypeToken.tupleLength, 10);
                paramType = { kind: 'tuple', elementType, length };
            }
            // Check for primitive type
            else if (this.isTypeToken(paramTypeToken.type)) {
                this.advance();
                const baseType = this.tokenToDataType(paramTypeToken.type);
                paramType = baseType;
                // Check for array parameter
                if (this.peek().type === TokenType.LBRACKET) {
                    this.advance();
                    let size;
                    if (this.peek().type === TokenType.NUMBER_LITERAL) {
                        const sizeToken = this.advance();
                        size = parseInt(sizeToken.value, 10);
                    }
                    this.expect([TokenType.RBRACKET]);
                    paramType = { kind: 'array', elementType: baseType, size };
                }
            }
            else {
                throw new Error(`Expected type for parameter at line ${paramTypeToken.line}`);
            }
            this.expect([TokenType.IMMUTABLE]);
            const paramNameToken = this.expect([TokenType.IDENTIFIER]);
            parameters.push({ dataType: paramType, name: paramNameToken.value });
        }
        this.expect([TokenType.RPAREN]);
        this.skipNewlines();
        // Parse method body - statements until ;
        const body = [];
        let returnExpression = null;
        while (this.peek().type !== TokenType.SEMICOLON && !this.isAtEnd()) {
            this.skipNewlines();
            if (this.peek().type === TokenType.SEMICOLON)
                break;
            const token = this.peek();
            const nextType = this.peekNext()?.type;
            const isStatement = (this.isTypeToken(token.type) && nextType !== TokenType.FUNC) ||
                token.type === TokenType.PRINT ||
                token.type === TokenType.WHILE ||
                token.type === TokenType.IF ||
                token.type === TokenType.FUNC ||
                token.type === TokenType.JS_BLOCK ||
                (token.type === TokenType.IDENTIFIER && nextType === TokenType.EQUALS) ||
                (token.type === TokenType.IDENTIFIER && (nextType === TokenType.PLUS_PLUS || nextType === TokenType.MINUS_MINUS)) ||
                (token.type === TokenType.IDENTIFIER && this.isCompoundAssignmentToken(nextType));
            if (isStatement) {
                body.push(this.parseStatement());
            }
            else {
                const expr = this.parseExpression();
                this.skipNewlines();
                if (this.peek().type === TokenType.SEMICOLON) {
                    if (returnType !== 'void') {
                        returnExpression = expr;
                    }
                    else {
                        body.push({
                            type: 'ExpressionStatement',
                            expression: expr,
                            line: token.line,
                            column: token.column,
                        });
                    }
                }
                else {
                    body.push({
                        type: 'ExpressionStatement',
                        expression: expr,
                        line: token.line,
                        column: token.column,
                    });
                }
            }
        }
        this.expect([TokenType.SEMICOLON]);
        this.skipNewlines();
        return {
            name: nameToken.value,
            parameters,
            returnType,
            body,
            returnExpression,
            line: startToken.line,
            column: startToken.column,
        };
    }
    parseStructVariableDeclaration(exported = false) {
        const typeToken = this.advance(); // consume struct name (e.g., Person)
        const structName = typeToken.value;
        const dataType = { kind: 'struct', name: structName };
        const mutabilityToken = this.expect([TokenType.IMMUTABLE, TokenType.MUTABLE]);
        const mutability = mutabilityToken.type === TokenType.IMMUTABLE ? 'immutable' : 'mutable';
        const nameToken = this.expect([TokenType.IDENTIFIER]);
        const name = nameToken.value;
        this.expect([TokenType.EQUALS]);
        const value = this.parseExpression();
        this.expectEndOfStatement();
        return {
            type: 'VariableDeclaration',
            dataType,
            mutability,
            name,
            value,
            exported,
            line: typeToken.line,
            column: typeToken.column,
        };
    }
    parseFunctionDeclaration(exported = false) {
        let returnType = 'void';
        let startToken = this.peek();
        // Check for return type before Z
        if (this.isTypeToken(this.peek().type)) {
            const typeToken = this.advance();
            startToken = typeToken;
            // Check if it's a tuple type
            if (this.isTupleTypeToken(typeToken.type)) {
                const elementType = this.tupleTokenToElementType(typeToken);
                const length = typeToken.tupleLength === 'N' ? undefined : parseInt(typeToken.tupleLength, 10);
                returnType = { kind: 'tuple', elementType, length };
            }
            else {
                const baseType = this.tokenToDataType(typeToken.type);
                // Check for array return type: i[] Z, s[] Z, etc.
                if (this.peek().type === TokenType.LBRACKET) {
                    this.advance(); // consume [
                    let size;
                    // Check for optional size
                    if (this.peek().type === TokenType.NUMBER_LITERAL) {
                        const sizeToken = this.advance();
                        size = parseInt(sizeToken.value, 10);
                    }
                    this.expect([TokenType.RBRACKET]);
                    returnType = { kind: 'array', elementType: baseType, size };
                }
                else {
                    returnType = baseType;
                }
            }
        }
        // Check for enum return type: Color Z getColor()
        else if (this.peek().type === TokenType.IDENTIFIER && this.enumNames.has(this.peek().value)) {
            const typeToken = this.advance();
            startToken = typeToken;
            returnType = { kind: 'enum', name: typeToken.value };
        }
        // Check for struct return type: Person Z createPerson()
        else if (this.peek().type === TokenType.IDENTIFIER && this.structNames.has(this.peek().value)) {
            const typeToken = this.advance();
            startToken = typeToken;
            returnType = { kind: 'struct', name: typeToken.value };
        }
        // Consume Z
        this.expect([TokenType.FUNC]);
        // Function name
        const nameToken = this.expect([TokenType.IDENTIFIER]);
        const name = nameToken.value;
        // Parameters: (type#name type#name ...)
        this.expect([TokenType.LPAREN]);
        const parameters = [];
        while (this.peek().type !== TokenType.RPAREN) {
            // Each parameter is type#name, type[]#name, ti5#name, EnumName#name, or StructName#name
            let paramType;
            const paramTypeToken = this.peek();
            // Check for struct parameter type: Person#p
            if (paramTypeToken.type === TokenType.IDENTIFIER && this.structNames.has(paramTypeToken.value)) {
                this.advance();
                paramType = { kind: 'struct', name: paramTypeToken.value };
            }
            // Check for enum parameter type: Color#c
            else if (paramTypeToken.type === TokenType.IDENTIFIER && this.enumNames.has(paramTypeToken.value)) {
                this.advance();
                paramType = { kind: 'enum', name: paramTypeToken.value };
            }
            // Check for tuple type
            else if (this.isTupleTypeToken(paramTypeToken.type)) {
                this.advance();
                const elementType = this.tupleTokenToElementType(paramTypeToken);
                const length = paramTypeToken.tupleLength === 'N' ? undefined : parseInt(paramTypeToken.tupleLength, 10);
                paramType = { kind: 'tuple', elementType, length };
            }
            // Check for primitive type
            else if (this.isTypeToken(paramTypeToken.type)) {
                this.advance();
                const baseType = this.tokenToDataType(paramTypeToken.type);
                paramType = baseType;
                // Check for array parameter: i[]#name, s[]#name, etc.
                if (this.peek().type === TokenType.LBRACKET) {
                    this.advance(); // consume [
                    let size;
                    // Check for optional size
                    if (this.peek().type === TokenType.NUMBER_LITERAL) {
                        const sizeToken = this.advance();
                        size = parseInt(sizeToken.value, 10);
                    }
                    this.expect([TokenType.RBRACKET]);
                    paramType = { kind: 'array', elementType: baseType, size };
                }
            }
            else {
                throw new Error(`Expected type for parameter at line ${paramTypeToken.line}, got '${paramTypeToken.value}'`);
            }
            this.expect([TokenType.IMMUTABLE]); // Parameters are always immutable
            const paramNameToken = this.expect([TokenType.IDENTIFIER]);
            parameters.push({
                dataType: paramType,
                name: paramNameToken.value,
            });
        }
        this.expect([TokenType.RPAREN]);
        this.skipNewlines();
        // Parse function body - statements until ;
        // The last expression before ; is the return value (if function has return type)
        const body = [];
        let returnExpression = null;
        while (this.peek().type !== TokenType.SEMICOLON && !this.isAtEnd()) {
            this.skipNewlines();
            if (this.peek().type === TokenType.SEMICOLON)
                break;
            // Check if this looks like a statement or expression
            const token = this.peek();
            // These are clearly statements (not potential return expressions)
            const nextType = this.peekNext()?.type;
            const isStatement = (this.isTypeToken(token.type) && nextType !== TokenType.FUNC) ||
                token.type === TokenType.PRINT ||
                token.type === TokenType.WHILE ||
                token.type === TokenType.IF ||
                token.type === TokenType.FUNC ||
                token.type === TokenType.JS_BLOCK ||
                (token.type === TokenType.IDENTIFIER && nextType === TokenType.EQUALS) ||
                (token.type === TokenType.IDENTIFIER && (nextType === TokenType.PLUS_PLUS || nextType === TokenType.MINUS_MINUS)) ||
                (token.type === TokenType.IDENTIFIER && this.isCompoundAssignmentToken(nextType));
            if (isStatement) {
                body.push(this.parseStatement());
            }
            else {
                // Try to parse as expression (potential return value)
                const expr = this.parseExpression();
                // Check if this is followed by ; (end of function) or newline/more statements
                this.skipNewlines();
                if (this.peek().type === TokenType.SEMICOLON) {
                    // This is the return expression
                    if (returnType !== 'void') {
                        returnExpression = expr;
                    }
                    else {
                        // For void functions, wrap expression in ExpressionStatement
                        body.push({
                            type: 'ExpressionStatement',
                            expression: expr,
                            line: token.line,
                            column: token.column,
                        });
                    }
                }
                else {
                    // More statements follow, this was just an expression statement
                    body.push({
                        type: 'ExpressionStatement',
                        expression: expr,
                        line: token.line,
                        column: token.column,
                    });
                }
            }
        }
        this.expect([TokenType.SEMICOLON]);
        this.skipNewlines();
        return {
            type: 'FunctionDeclaration',
            name,
            parameters,
            returnType,
            body,
            returnExpression,
            exported,
            line: startToken.line,
            column: startToken.column,
        };
    }
    parseExpressionStatement() {
        const token = this.peek();
        const expression = this.parseExpression();
        this.expectEndOfStatement();
        return {
            type: 'ExpressionStatement',
            expression,
            line: token.line,
            column: token.column,
        };
    }
    // Parse statements until we hit ; (end of block)
    parseBlock() {
        const statements = [];
        while (this.peek().type !== TokenType.SEMICOLON && !this.isAtEnd()) {
            this.skipNewlines();
            if (this.peek().type === TokenType.SEMICOLON)
                break;
            statements.push(this.parseStatement());
        }
        this.expect([TokenType.SEMICOLON]);
        this.skipNewlines();
        return statements;
    }
    // Parse statements until we hit :?, :, or ;
    parseBlockUntilElseOrEnd() {
        const statements = [];
        while (this.peek().type !== TokenType.SEMICOLON &&
            this.peek().type !== TokenType.ELSE_IF &&
            this.peek().type !== TokenType.ELSE &&
            !this.isAtEnd()) {
            this.skipNewlines();
            if (this.peek().type === TokenType.SEMICOLON ||
                this.peek().type === TokenType.ELSE_IF ||
                this.peek().type === TokenType.ELSE)
                break;
            statements.push(this.parseStatement());
        }
        return statements;
    }
    // Expression parsing with operator precedence (lowest to highest):
    // 1. Logical OR: ||
    // 2. Logical AND: &&
    // 3. Equality: == !=
    // 4. Comparison: > < >= <=
    // 5. Range: .. (for arrays like 5..8)
    // 6. Additive: + -
    // 7. Multiplicative: * / %
    // 8. Exponent: **
    // 9. Unary: - !
    // 10. Primary: literals, identifiers, (expr)
    parseExpression() {
        return this.parseOr();
    }
    parseOr() {
        let left = this.parseAnd();
        while (this.peek().type === TokenType.OR) {
            const operatorToken = this.advance();
            const right = this.parseAnd();
            left = {
                type: 'BinaryExpression',
                operator: '||',
                left,
                right,
                line: operatorToken.line,
                column: operatorToken.column,
            };
        }
        return left;
    }
    parseAnd() {
        let left = this.parseEquality();
        while (this.peek().type === TokenType.AND) {
            const operatorToken = this.advance();
            const right = this.parseEquality();
            left = {
                type: 'BinaryExpression',
                operator: '&&',
                left,
                right,
                line: operatorToken.line,
                column: operatorToken.column,
            };
        }
        return left;
    }
    parseEquality() {
        let left = this.parseComparison();
        while (this.peek().type === TokenType.EQ || this.peek().type === TokenType.NEQ) {
            const operatorToken = this.advance();
            const operator = operatorToken.value;
            const right = this.parseComparison();
            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right,
                line: operatorToken.line,
                column: operatorToken.column,
            };
        }
        return left;
    }
    parseComparison() {
        let left = this.parseRange();
        while (this.peek().type === TokenType.GT ||
            this.peek().type === TokenType.LT ||
            this.peek().type === TokenType.GTE ||
            this.peek().type === TokenType.LTE) {
            const operatorToken = this.advance();
            const operator = operatorToken.value;
            const right = this.parseRange();
            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right,
                line: operatorToken.line,
                column: operatorToken.column,
            };
        }
        return left;
    }
    parseRange() {
        const left = this.parseAdditive();
        // Range expression: 5..8 creates [5, 6, 7, 8]
        if (this.peek().type === TokenType.DOT_DOT) {
            const operatorToken = this.advance();
            const right = this.parseAdditive();
            return {
                type: 'RangeExpression',
                start: left,
                end: right,
                line: operatorToken.line,
                column: operatorToken.column,
            };
        }
        return left;
    }
    parseAdditive() {
        let left = this.parseMultiplicative();
        while (this.peek().type === TokenType.PLUS || this.peek().type === TokenType.MINUS) {
            const operatorToken = this.advance();
            const operator = operatorToken.value;
            const right = this.parseMultiplicative();
            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right,
                line: operatorToken.line,
                column: operatorToken.column,
            };
        }
        return left;
    }
    parseMultiplicative() {
        let left = this.parseExponent();
        while (this.peek().type === TokenType.STAR ||
            this.peek().type === TokenType.SLASH ||
            this.peek().type === TokenType.PERCENT) {
            const operatorToken = this.advance();
            const operator = operatorToken.value;
            const right = this.parseExponent();
            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right,
                line: operatorToken.line,
                column: operatorToken.column,
            };
        }
        return left;
    }
    parseExponent() {
        const left = this.parseUnary();
        // Right-associative: 2 ** 3 ** 2 = 2 ** (3 ** 2)
        if (this.peek().type === TokenType.STAR_STAR) {
            const operatorToken = this.advance();
            const right = this.parseExponent(); // recursive for right-associativity
            return {
                type: 'BinaryExpression',
                operator: '**',
                left,
                right,
                line: operatorToken.line,
                column: operatorToken.column,
            };
        }
        return left;
    }
    parseUnary() {
        if (this.peek().type === TokenType.MINUS) {
            const operatorToken = this.advance();
            const operand = this.parseUnary();
            return {
                type: 'UnaryExpression',
                operator: '-',
                operand,
                line: operatorToken.line,
                column: operatorToken.column,
            };
        }
        if (this.peek().type === TokenType.NOT) {
            const operatorToken = this.advance();
            const operand = this.parseUnary();
            return {
                type: 'UnaryExpression',
                operator: '!',
                operand,
                line: operatorToken.line,
                column: operatorToken.column,
            };
        }
        return this.parsePrimary();
    }
    parsePrimary() {
        const token = this.peek();
        if (token.type === TokenType.STRING_LITERAL) {
            return this.parseStringLiteral();
        }
        if (token.type === TokenType.INTERP_STRING) {
            return this.parseInterpolatedString();
        }
        if (token.type === TokenType.NUMBER_LITERAL) {
            return this.parseNumberLiteral();
        }
        if (token.type === TokenType.BOOL_LITERAL) {
            return this.parseBoolLiteral();
        }
        // Null literal: _
        if (token.type === TokenType.NULL) {
            this.advance();
            return {
                type: 'NullLiteral',
                line: token.line,
                column: token.column,
            };
        }
        if (token.type === TokenType.IDENTIFIER) {
            return this.parseIdentifier();
        }
        // Cast expressions: s(expr), i(expr), f(expr), b(expr)
        if (this.isCastToken(token.type)) {
            return this.parseCastExpression();
        }
        // Parenthesized expression or tuple literal
        if (token.type === TokenType.LPAREN) {
            this.advance(); // consume (
            const firstExpr = this.parseExpression();
            // Check if this is a tuple (has comma) or just parenthesized expression
            if (this.peek().type === TokenType.COMMA) {
                // This is a tuple literal: (expr, expr, ...)
                const elements = [firstExpr];
                while (this.peek().type === TokenType.COMMA) {
                    this.advance(); // consume comma
                    elements.push(this.parseExpression());
                }
                this.expect([TokenType.RPAREN]);
                return {
                    type: 'TupleLiteral',
                    elements,
                    line: token.line,
                    column: token.column,
                };
            }
            // Just a parenthesized expression
            this.expect([TokenType.RPAREN]);
            return firstExpr;
        }
        // Array literal: [1, 2, 3]
        if (token.type === TokenType.LBRACKET) {
            return this.parseArrayLiteral();
        }
        // Match expression as expression: i#x = ??(val) | ... ;
        if (token.type === TokenType.MATCH) {
            return this.parseMatchExpression();
        }
        throw new Error(`Expected expression at line ${token.line}, column ${token.column}, got '${token.value}'`);
    }
    isCastToken(type) {
        return [
            TokenType.CAST_STRING, TokenType.CAST_INT, TokenType.CAST_FLOAT, TokenType.CAST_BOOL,
            TokenType.CAST_TUPLE_INT, TokenType.CAST_TUPLE_FLOAT, TokenType.CAST_TUPLE_STRING, TokenType.CAST_TUPLE_BOOL,
        ].includes(type);
    }
    isTupleCastToken(type) {
        return [
            TokenType.CAST_TUPLE_INT, TokenType.CAST_TUPLE_FLOAT, TokenType.CAST_TUPLE_STRING, TokenType.CAST_TUPLE_BOOL,
        ].includes(type);
    }
    tupleCastTokenToElementType(token) {
        switch (token.type) {
            case TokenType.CAST_TUPLE_INT: return 'int';
            case TokenType.CAST_TUPLE_FLOAT: return 'float';
            case TokenType.CAST_TUPLE_STRING: return 'string';
            case TokenType.CAST_TUPLE_BOOL: return 'bool';
            default: throw new Error(`Invalid tuple cast token: ${token.type}`);
        }
    }
    parseCastExpression() {
        const token = this.advance();
        let targetType;
        if (this.isTupleCastToken(token.type)) {
            const elementType = this.tupleCastTokenToElementType(token);
            const length = token.tupleLength === 'N' ? undefined : parseInt(token.tupleLength, 10);
            targetType = { kind: 'tuple', elementType, length };
        }
        else {
            switch (token.type) {
                case TokenType.CAST_STRING:
                    targetType = 'string';
                    break;
                case TokenType.CAST_INT:
                    targetType = 'int';
                    break;
                case TokenType.CAST_FLOAT:
                    targetType = 'float';
                    break;
                case TokenType.CAST_BOOL:
                    targetType = 'bool';
                    break;
                default: throw new Error(`Invalid cast token: ${token.type}`);
            }
        }
        // The ( was already consumed by the lexer
        const expression = this.parseExpression();
        this.expect([TokenType.RPAREN]);
        return {
            type: 'CastExpression',
            targetType,
            expression,
            line: token.line,
            column: token.column,
        };
    }
    parseInterpolatedString() {
        const token = this.advance();
        const raw = token.value;
        const parts = [];
        let i = 0;
        let textStart = 0;
        while (i < raw.length) {
            if (raw[i] === '{') {
                // Add text before this {
                if (i > textStart) {
                    parts.push({ kind: 'text', value: raw.slice(textStart, i) });
                }
                // Find matching }
                let braceDepth = 1;
                let j = i + 1;
                while (j < raw.length && braceDepth > 0) {
                    if (raw[j] === '{')
                        braceDepth++;
                    else if (raw[j] === '}')
                        braceDepth--;
                    j++;
                }
                // Extract expression content
                const exprContent = raw.slice(i + 1, j - 1);
                // Parse the expression
                const lexer = new Lexer(exprContent);
                const exprTokens = lexer.tokenize();
                const exprParser = new Parser(exprTokens);
                const expr = exprParser.parseExpression();
                parts.push({ kind: 'expr', value: expr });
                i = j;
                textStart = j;
            }
            else {
                i++;
            }
        }
        // Add remaining text
        if (textStart < raw.length) {
            parts.push({ kind: 'text', value: raw.slice(textStart) });
        }
        return {
            type: 'InterpolatedString',
            parts,
            line: token.line,
            column: token.column,
        };
    }
    parseStringLiteral() {
        const token = this.advance();
        return {
            type: 'StringLiteral',
            value: token.value,
            line: token.line,
            column: token.column,
        };
    }
    parseNumberLiteral() {
        const token = this.advance();
        const value = parseFloat(token.value);
        const isFloat = token.value.includes('.');
        return {
            type: 'NumberLiteral',
            value,
            isFloat,
            line: token.line,
            column: token.column,
        };
    }
    parseBoolLiteral() {
        const token = this.advance();
        return {
            type: 'BoolLiteral',
            value: token.value === 'true',
            line: token.line,
            column: token.column,
        };
    }
    parseIdentifier() {
        const token = this.advance();
        let expr = {
            type: 'Identifier',
            name: token.value,
            line: token.line,
            column: token.column,
        };
        // Handle postfix operations: function calls, struct instantiation, index access, method calls
        while (true) {
            if (this.peek().type === TokenType.LPAREN) {
                if (expr.type === 'Identifier') {
                    // Check if this is a struct instantiation: StructName(...)
                    if (this.structNames.has(expr.name)) {
                        expr = this.parseStructInstantiation(token);
                    }
                    else {
                        // Regular function call
                        expr = this.parseFunctionCall(token);
                    }
                }
                else {
                    break;
                }
            }
            else if (this.peek().type === TokenType.LBRACKET) {
                // Index access: arr[0]
                this.advance(); // consume [
                const index = this.parseExpression();
                this.expect([TokenType.RBRACKET]);
                expr = {
                    type: 'IndexAccess',
                    array: expr,
                    index,
                    line: token.line,
                    column: token.column,
                };
            }
            else if (this.peek().type === TokenType.DOT) {
                // Property access or method call: obj.prop or obj.method()
                this.advance(); // consume .
                const memberToken = this.expect([TokenType.IDENTIFIER]);
                // Check if it's a method call (followed by parentheses)
                if (this.peek().type === TokenType.LPAREN) {
                    this.advance(); // consume (
                    const args = [];
                    while (this.peek().type !== TokenType.RPAREN) {
                        args.push(this.parseExpression());
                        if (this.peek().type === TokenType.COMMA) {
                            this.advance();
                        }
                    }
                    this.expect([TokenType.RPAREN]);
                    expr = {
                        type: 'MethodCall',
                        object: expr,
                        method: memberToken.value,
                        arguments: args,
                        line: token.line,
                        column: token.column,
                    };
                }
                else {
                    // Check if this is an enum access: Color.Red
                    if (expr.type === 'Identifier' && this.enumNames.has(expr.name)) {
                        expr = {
                            type: 'EnumAccess',
                            enumName: expr.name,
                            variant: memberToken.value,
                            line: token.line,
                            column: token.column,
                        };
                    }
                    else {
                        // Property access (no parentheses) - could be struct field access
                        expr = {
                            type: 'MemberExpression',
                            object: expr,
                            property: memberToken.value,
                            line: token.line,
                            column: token.column,
                        };
                    }
                }
            }
            else {
                break;
            }
        }
        return expr;
    }
    parseStructInstantiation(nameToken) {
        this.advance(); // consume (
        const args = [];
        while (this.peek().type !== TokenType.RPAREN) {
            // Check for named argument: name=value
            if (this.peek().type === TokenType.IDENTIFIER && this.peekNext()?.type === TokenType.EQUALS) {
                const argNameToken = this.advance();
                this.advance(); // consume =
                const value = this.parseExpression();
                args.push({ name: argNameToken.value, value });
            }
            else {
                // Positional argument
                const value = this.parseExpression();
                args.push({ value });
            }
            // Optional comma between arguments
            if (this.peek().type === TokenType.COMMA) {
                this.advance();
            }
        }
        this.expect([TokenType.RPAREN]);
        return {
            type: 'StructInstantiation',
            structName: nameToken.value,
            arguments: args,
            line: nameToken.line,
            column: nameToken.column,
        };
    }
    parseArrayLiteral() {
        const token = this.advance(); // consume [
        const elements = [];
        while (this.peek().type !== TokenType.RBRACKET) {
            elements.push(this.parseExpression());
            if (this.peek().type === TokenType.COMMA) {
                this.advance();
            }
        }
        this.expect([TokenType.RBRACKET]);
        return {
            type: 'ArrayLiteral',
            elements,
            line: token.line,
            column: token.column,
        };
    }
    parseFunctionCall(nameToken) {
        this.advance(); // consume (
        const args = [];
        while (this.peek().type !== TokenType.RPAREN) {
            // Check for named argument: name=value
            if (this.peek().type === TokenType.IDENTIFIER && this.peekNext()?.type === TokenType.EQUALS) {
                const argNameToken = this.advance();
                this.advance(); // consume =
                const value = this.parseExpression();
                args.push({ name: argNameToken.value, value });
            }
            else {
                // Positional argument
                const value = this.parseExpression();
                args.push({ value });
            }
            // Optional comma between arguments
            if (this.peek().type === TokenType.COMMA) {
                this.advance();
            }
        }
        this.expect([TokenType.RPAREN]);
        return {
            type: 'FunctionCall',
            name: nameToken.value,
            arguments: args,
            line: nameToken.line,
            column: nameToken.column,
        };
    }
    // Helper methods
    isTypeToken(type) {
        return [
            TokenType.TYPE_STRING, TokenType.TYPE_INT, TokenType.TYPE_FLOAT, TokenType.TYPE_BOOL,
            TokenType.TYPE_TUPLE_INT, TokenType.TYPE_TUPLE_FLOAT, TokenType.TYPE_TUPLE_STRING, TokenType.TYPE_TUPLE_BOOL,
        ].includes(type);
    }
    isTupleTypeToken(type) {
        return [
            TokenType.TYPE_TUPLE_INT, TokenType.TYPE_TUPLE_FLOAT, TokenType.TYPE_TUPLE_STRING, TokenType.TYPE_TUPLE_BOOL,
        ].includes(type);
    }
    tupleTokenToElementType(token) {
        switch (token.type) {
            case TokenType.TYPE_TUPLE_INT: return 'int';
            case TokenType.TYPE_TUPLE_FLOAT: return 'float';
            case TokenType.TYPE_TUPLE_STRING: return 'string';
            case TokenType.TYPE_TUPLE_BOOL: return 'bool';
            default: throw new Error(`Invalid tuple type token: ${token.type}`);
        }
    }
    tokenToDataType(type) {
        switch (type) {
            case TokenType.TYPE_STRING: return 'string';
            case TokenType.TYPE_INT: return 'int';
            case TokenType.TYPE_FLOAT: return 'float';
            case TokenType.TYPE_BOOL: return 'bool';
            default: throw new Error(`Invalid type token: ${type}`);
        }
    }
    peek() {
        return this.tokens[this.pos];
    }
    peekNext() {
        return this.tokens[this.pos + 1];
    }
    advance() {
        return this.tokens[this.pos++];
    }
    expect(types) {
        const token = this.peek();
        if (!types.includes(token.type)) {
            const expected = types.map(t => t.toString()).join(' or ');
            throw new Error(`Expected ${expected} at line ${token.line}, column ${token.column}, got '${token.value}'`);
        }
        return this.advance();
    }
    expectEndOfStatement() {
        const token = this.peek();
        if (token.type !== TokenType.NEWLINE && token.type !== TokenType.EOF) {
            throw new Error(`Expected end of statement at line ${token.line}, column ${token.column}`);
        }
        this.skipNewlines();
    }
    skipNewlines() {
        while (this.peek()?.type === TokenType.NEWLINE) {
            this.advance();
        }
    }
    isAtEnd() {
        return this.peek()?.type === TokenType.EOF;
    }
}
