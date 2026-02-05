// Recursive Descent Parser for ZZ Language

import { Token, TokenType, Lexer } from "./lexer.js";
import { ZZError } from "./errors.js";
import {
	Program,
	Statement,
	VariableDeclaration,
	Assignment,
	PrintStatement,
	ErrorStatement,
	WhileStatement,
	ForStatement,
	ForEachStatement,
	IfStatement,
	IfBranch,
	TryStatement,
	Expression,
	StringLiteral,
	NumberLiteral,
	BoolLiteral,
	NullLiteral,
	Identifier,
	BinaryExpression,
	UnaryExpression,
	InterpolatedString,
	InterpolatedPart,
	CastExpression,
	FunctionDeclaration,
	FunctionCall,
	FunctionArgument,
	ExpressionStatement,
	Parameter,
	DataType,
	PrimitiveType,
	ArrayType,
	TupleType,
	EnumType,
	StructType,
	Mutability,
	BinaryOperator,
	ArrayLiteral,
	TupleLiteral,
	RangeExpression,
	IndexAccess,
	MethodCall,
	IndexAssignment,
	FieldAssignment,
	BreakStatement,
	ContinueStatement,
	ThrowStatement,
	ImportStatement,
	ImportSpecifier,
	IncrementStatement,
	IncrementOperator,
	CompoundAssignment,
	CompoundOperator,
	EnumDeclaration,
	EnumAccess,
	StructDeclaration,
	StructField,
	StructMethod,
	StructInstantiation,
	MatchExpression,
	MatchArm,
	Pattern,
	PatternField,
	EnumPattern,
	LiteralPattern,
	StructPattern,
	TuplePattern,
	WildcardPattern,
	BindingPattern,
	JSBlockStatement,
	SpawnExpression,
	JType,
	JLiteral,
	JField,
	JPattern,
	JPatternField,
	CompTimeExpression,
	CompTimeFunctionDeclaration,
} from "./ast.js";

// Parser security limits
const MAX_PARSER_DEPTH = 500; // Maximum nesting depth for expressions and statements

export class Parser {
	private tokens: Token[];
	private pos: number = 0;
	private enumNames: Set<string> = new Set(); // Track known enum names for type resolution
	private structNames: Set<string> = new Set(); // Track known struct names for type resolution
	private parseDepth: number = 0; // Track recursion depth to prevent stack overflow

	constructor(tokens: Token[], externalTypes?: { structNames?: Set<string>; enumNames?: Set<string> }) {
		this.tokens = tokens;
		if (externalTypes?.structNames) {
			externalTypes.structNames.forEach((n) => this.structNames.add(n));
		}
		if (externalTypes?.enumNames) {
			externalTypes.enumNames.forEach((n) => this.enumNames.add(n));
		}
		// Pre-register Spawn as a known struct so Spawn#s = ~> func() works
		this.structNames.add("Spawn");
	}

	// Check and increment parse depth
	private enterParse(context: string): void {
		this.parseDepth++;
		if (this.parseDepth > MAX_PARSER_DEPTH) {
			const token = this.peek();
			throw new Error(
				`Maximum parse depth (${MAX_PARSER_DEPTH}) exceeded at line ${token?.line ?? 1}, column ${token?.column ?? 1}. ` +
				`The code may have too many levels of nesting in ${context}.`
			);
		}
	}

	// Decrement parse depth
	private exitParse(): void {
		this.parseDepth--;
	}

	parse(): Program {
		// First pass: collect all enum and struct names for type resolution
		this.collectTypeNames();

		const statements: Statement[] = [];

		while (!this.isAtEnd()) {
			this.skipNewlines();
			if (!this.isAtEnd()) {
				statements.push(this.parseStatement());
			}
		}

		return {
			type: "Program",
			statements,
			line: 1,
			column: 1,
		};
	}

	// First pass to collect enum and struct names before parsing
	private collectTypeNames(): void {
		const savedPos = this.pos;
		while (!this.isAtEnd()) {
			const token = this.peek();
			if (token.type === TokenType.ENUM) {
				this.advance(); // consume E
				const nameToken = this.peek();
				if (nameToken.type === TokenType.IDENTIFIER) {
					this.enumNames.add(nameToken.value);
				}
			} else if (token.type === TokenType.STRUCT) {
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

	private parseStatement(): Statement {
		this.enterParse("statement");
		try {
			return this.parseStatementInner();
		} finally {
			this.exitParse();
		}
	}

	private parseStatementInner(): Statement {
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

		// Enum type variable declaration: Color#c = Color.Red or Color[]#colors = [...]
		// Or enum return type for function: Color Z getColor() or Color[] Z getColors()
		if (token.type === TokenType.IDENTIFIER && this.enumNames.has(token.value)) {
			const nextToken = this.peekNext();
			if (nextToken?.type === TokenType.IMMUTABLE || nextToken?.type === TokenType.MUTABLE) {
				return this.parseEnumVariableDeclaration();
			}
			// Check for array of enum: Color[]#colors vs Color[] Z getColors()
			if (nextToken?.type === TokenType.LBRACKET) {
				// Look ahead past the [] to see if it's a variable or function
				let lookAhead = 2;
				if (this.tokens[this.pos + lookAhead]?.type === TokenType.NUMBER_LITERAL) {
					lookAhead++;
				}
				if (this.tokens[this.pos + lookAhead]?.type === TokenType.RBRACKET) {
					lookAhead++;
					const afterBracket = this.tokens[this.pos + lookAhead]?.type;
					if (afterBracket === TokenType.FUNC) {
						return this.parseFunctionDeclaration();
					}
				}
				return this.parseEnumVariableDeclaration();
			}
			// Could be enum return type for function: Color Z getColor()
			if (nextToken?.type === TokenType.FUNC) {
				return this.parseFunctionDeclaration();
			}
		}

		// Struct type variable declaration: Person#p = Person(...) or Person[]#people = [...]
		// Or struct return type for function: Person Z createPerson() or Person[] Z getPoints()
		if (token.type === TokenType.IDENTIFIER && this.structNames.has(token.value)) {
			const nextToken = this.peekNext();
			if (nextToken?.type === TokenType.IMMUTABLE || nextToken?.type === TokenType.MUTABLE) {
				return this.parseStructVariableDeclaration();
			}
			// Check for array of struct: Person[]#people vs Person[] Z getPoints()
			if (nextToken?.type === TokenType.LBRACKET) {
				// Look ahead past the [] to see if it's a variable or function
				let lookAhead = 2;
				if (this.tokens[this.pos + lookAhead]?.type === TokenType.NUMBER_LITERAL) {
					lookAhead++;
				}
				if (this.tokens[this.pos + lookAhead]?.type === TokenType.RBRACKET) {
					lookAhead++;
					const afterBracket = this.tokens[this.pos + lookAhead]?.type;
					if (afterBracket === TokenType.FUNC) {
						return this.parseFunctionDeclaration();
					}
				}
				return this.parseStructVariableDeclaration();
			}
			// Could be struct return type for function: Person Z createPerson()
			if (nextToken?.type === TokenType.FUNC) {
				return this.parseFunctionDeclaration();
			}
		}

		// J type variable declaration: J#config = { ... } or J Z getConfig() or J[]#configs = [...]
		// Or J return type for function: J Z getConfig() or J[] Z getConfigs()
		if (token.type === TokenType.TYPE_J) {
			const nextToken = this.peekNext();
			if (nextToken?.type === TokenType.IMMUTABLE || nextToken?.type === TokenType.MUTABLE) {
				return this.parseVariableDeclaration();
			}
			// Check for array of J: J[]#configs vs J[] Z getConfigs()
			if (nextToken?.type === TokenType.LBRACKET) {
				// Look ahead past the [] to see if it's a variable or function
				let lookAhead = 2;
				if (this.tokens[this.pos + lookAhead]?.type === TokenType.NUMBER_LITERAL) {
					lookAhead++;
				}
				if (this.tokens[this.pos + lookAhead]?.type === TokenType.RBRACKET) {
					lookAhead++;
					const afterBracket = this.tokens[this.pos + lookAhead]?.type;
					if (afterBracket === TokenType.FUNC) {
						return this.parseFunctionDeclaration();
					}
				}
				return this.parseVariableDeclaration();
			}
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
			} else {
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
		if (
			token.type === TokenType.IDENTIFIER &&
			(this.peekNext()?.type === TokenType.PLUS_PLUS || this.peekNext()?.type === TokenType.MINUS_MINUS)
		) {
			return this.parseIncrementStatement();
		}

		// Compound assignment: name += value, name -= value, etc.
		if (token.type === TokenType.IDENTIFIER && this.isCompoundAssignmentToken(this.peekNext()?.type)) {
			return this.parseCompoundAssignment();
		}

		// Index assignment: arr[0] = value OR Field assignment: obj.field = value
		if (
			token.type === TokenType.IDENTIFIER &&
			(this.peekNext()?.type === TokenType.LBRACKET || this.peekNext()?.type === TokenType.DOT)
		) {
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
				type: "BreakStatement",
				line: token.line,
				column: token.column,
			} as BreakStatement;
		}

		// Continue statement: >>
		if (token.type === TokenType.CONTINUE) {
			this.advance();
			this.expectEndOfStatement();
			return {
				type: "ContinueStatement",
				line: token.line,
				column: token.column,
			} as ContinueStatement;
		}

		// Spawn expression: ~> functionCall()
		if (token.type === TokenType.SPAWN) {
			return this.parseSpawnStatement();
		}

		// Raw JavaScript injection: $js { ... }
		if (token.type === TokenType.JS_BLOCK) {
			this.advance();
			this.skipNewlines();
			return {
				type: "JSBlockStatement",
				code: token.value,
				line: token.line,
				column: token.column,
			} as JSBlockStatement;
		}

		// Compile-time function declaration: $Z name(params) body;
		if (token.type === TokenType.COMPTIME_FUNC) {
			return this.parseCompTimeFunctionDeclaration();
		}

		throw new ZZError(`Unexpected token '${token.value}'`, token.line, token.column);
	}

	// Parse import statement: <- { name, alias=original } = "./path" or <- namespace = "./path"
	// Also handles unsafe imports: <-! { name } = "npm-package"
	private parseImportStatement(): ImportStatement {
		const importToken = this.advance(); // consume <- or <-!
		const isUnsafe = importToken.type === TokenType.IMPORT_UNSAFE;

		let specifiers: ImportSpecifier[] = [];
		let namespace: string | undefined;

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
				} else {
					// Simple import: name
					specifiers.push({ name: firstToken.value });
				}

				// Optional comma
				if (this.peek().type === TokenType.COMMA) {
					this.advance();
				}
			}

			this.expect([TokenType.RBRACE]); // consume }
		} else if (this.peek().type === TokenType.IDENTIFIER) {
			// Namespace import: <- utils = "./path"
			const namespaceToken = this.advance();
			namespace = namespaceToken.value;
		} else {
			throw new ZZError(`Expected { or identifier after <-`, importToken.line, importToken.column);
		}

		// Expect = "path" or = std/module
		this.expect([TokenType.EQUALS]);

		let source: string;
		let isStdLib = false;

		if (this.peek().type === TokenType.STRING_LITERAL) {
			// Quoted path: <- { x } = "./path"
			source = this.advance().value;
		} else if (this.peek().type === TokenType.IDENTIFIER) {
			// Unquoted module path: <- { x } = std/string
			const parts: string[] = [this.advance().value];
			while (this.peek().type === TokenType.SLASH) {
				this.advance(); // consume /
				parts.push(this.expect([TokenType.IDENTIFIER]).value);
			}
			source = parts.join("/");
			isStdLib = true;
		} else {
			throw new ZZError(`Expected string path or module name after = in import`, importToken.line, importToken.column);
		}

		this.expectEndOfStatement();

		return {
			type: "ImportStatement",
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
	private parseExportedDeclaration(): VariableDeclaration | FunctionDeclaration | EnumDeclaration | StructDeclaration {
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

		// Enum type variable or function: ->Color#c or ->Color Z getColor() or ->Color[]#colors or ->Color[] Z getColors()
		if (nextToken.type === TokenType.IDENTIFIER && this.enumNames.has(nextToken.value)) {
			const peekNextToken = this.peekNext();
			if (peekNextToken?.type === TokenType.IMMUTABLE || peekNextToken?.type === TokenType.MUTABLE) {
				return this.parseEnumVariableDeclaration(true);
			}
			// Check for array of enum: Color[]#colors vs Color[] Z getColors()
			if (peekNextToken?.type === TokenType.LBRACKET) {
				// Look ahead past the [] to see if it's a variable or function
				let lookAhead = 2;
				if (this.tokens[this.pos + lookAhead]?.type === TokenType.NUMBER_LITERAL) {
					lookAhead++;
				}
				if (this.tokens[this.pos + lookAhead]?.type === TokenType.RBRACKET) {
					lookAhead++;
					const afterBracket = this.tokens[this.pos + lookAhead]?.type;
					if (afterBracket === TokenType.FUNC) {
						return this.parseFunctionDeclaration(true);
					}
				}
				return this.parseEnumVariableDeclaration(true);
			}
			if (peekNextToken?.type === TokenType.FUNC) {
				return this.parseFunctionDeclaration(true);
			}
		}

		// Struct type variable or function: ->Person#p or ->Person Z createPerson() or ->Person[]#people or ->Person[] Z getPeople()
		if (nextToken.type === TokenType.IDENTIFIER && this.structNames.has(nextToken.value)) {
			const peekNextToken = this.peekNext();
			if (peekNextToken?.type === TokenType.IMMUTABLE || peekNextToken?.type === TokenType.MUTABLE) {
				return this.parseStructVariableDeclaration(true);
			}
			// Check for array of struct: Person[]#people vs Person[] Z getPeople()
			if (peekNextToken?.type === TokenType.LBRACKET) {
				// Look ahead past the [] to see if it's a variable or function
				let lookAhead = 2;
				if (this.tokens[this.pos + lookAhead]?.type === TokenType.NUMBER_LITERAL) {
					lookAhead++;
				}
				if (this.tokens[this.pos + lookAhead]?.type === TokenType.RBRACKET) {
					lookAhead++;
					const afterBracket = this.tokens[this.pos + lookAhead]?.type;
					if (afterBracket === TokenType.FUNC) {
						return this.parseFunctionDeclaration(true);
					}
				}
				return this.parseStructVariableDeclaration(true);
			}
			if (peekNextToken?.type === TokenType.FUNC) {
				return this.parseFunctionDeclaration(true);
			}
		}

		// J type variable or function: ->J#config or ->J Z getConfig() or ->J[]#configs or ->J[] Z getConfigs()
		if (nextToken.type === TokenType.TYPE_J) {
			const peekNextToken = this.peekNext();
			if (peekNextToken?.type === TokenType.IMMUTABLE || peekNextToken?.type === TokenType.MUTABLE) {
				return this.parseVariableDeclaration(true);
			}
			// Check for array of J: J[]#configs vs J[] Z getConfigs()
			if (peekNextToken?.type === TokenType.LBRACKET) {
				// Look ahead past the [] to see if it's a variable or function
				let lookAhead = 2;
				if (this.tokens[this.pos + lookAhead]?.type === TokenType.NUMBER_LITERAL) {
					lookAhead++;
				}
				if (this.tokens[this.pos + lookAhead]?.type === TokenType.RBRACKET) {
					lookAhead++;
					const afterBracket = this.tokens[this.pos + lookAhead]?.type;
					if (afterBracket === TokenType.FUNC) {
						return this.parseFunctionDeclaration(true);
					}
				}
				return this.parseVariableDeclaration(true);
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

	private parseVariableDeclaration(exported: boolean = false): VariableDeclaration {
		const typeToken = this.advance();
		let dataType: DataType;

		// Check for J type or J array: J#config or J[]#configs
		if (typeToken.type === TokenType.TYPE_J) {
			if (this.peek().type === TokenType.LBRACKET) {
				this.advance(); // consume [
				let size: number | undefined;
				if (this.peek().type === TokenType.NUMBER_LITERAL) {
					const sizeToken = this.advance();
					size = parseInt(sizeToken.value, 10);
				}
				this.expect([TokenType.RBRACKET]);
				dataType = { kind: "array", elementType: { kind: "j" }, size };
			} else {
				dataType = { kind: "j" } as JType;
			}
		}
		// Check for tuple type or tuple array: ti5#t or ti5[]#tuples
		else if (this.isTupleTypeToken(typeToken.type)) {
			const tupleElementType = this.tupleTokenToElementType(typeToken);
			const tupleLength = typeToken.tupleLength === "N" ? undefined : parseInt(typeToken.tupleLength!, 10);
			const tupleType: TupleType = {
				kind: "tuple",
				elementType: tupleElementType,
				length: tupleLength,
			};

			// Check for array of tuples: ti3[]#coords
			if (this.peek().type === TokenType.LBRACKET) {
				this.advance(); // consume [
				let size: number | undefined;
				if (this.peek().type === TokenType.NUMBER_LITERAL) {
					const sizeToken = this.advance();
					size = parseInt(sizeToken.value, 10);
				}
				this.expect([TokenType.RBRACKET]);
				dataType = { kind: "array", elementType: tupleType, size };
			} else {
				dataType = tupleType;
			}
		} else {
			dataType = this.tokenToDataType(typeToken.type);

			// Check for array type: i[], i[5], s[], etc.
			if (this.peek().type === TokenType.LBRACKET) {
				this.advance(); // consume [
				let size: number | undefined;

				// Check for optional size
				if (this.peek().type === TokenType.NUMBER_LITERAL) {
					const sizeToken = this.advance();
					size = parseInt(sizeToken.value, 10);
				}

				this.expect([TokenType.RBRACKET]);

				dataType = {
					kind: "array",
					elementType: this.tokenToDataType(typeToken.type),
					size,
				};
			}
		}

		const mutabilityToken = this.expect([TokenType.IMMUTABLE, TokenType.MUTABLE]);
		const mutability: Mutability = mutabilityToken.type === TokenType.IMMUTABLE ? "immutable" : "mutable";

		const nameToken = this.expect([TokenType.IDENTIFIER]);
		const name = nameToken.value;

		this.expect([TokenType.EQUALS]);

		const value = this.parseExpression();

		this.expectEndOfStatement();

		return {
			type: "VariableDeclaration",
			dataType,
			mutability,
			name,
			value,
			exported,
			line: typeToken.line,
			column: typeToken.column,
		};
	}

	private parseAssignment(): Assignment {
		const nameToken = this.advance();
		const name = nameToken.value;

		this.expect([TokenType.EQUALS]);

		const value = this.parseExpression();

		this.expectEndOfStatement();

		return {
			type: "Assignment",
			name,
			value,
			line: nameToken.line,
			column: nameToken.column,
		};
	}

	private parseIncrementStatement(): IncrementStatement {
		const nameToken = this.advance();
		const name = nameToken.value;

		const operatorToken = this.advance(); // consume ++ or --
		const operator = operatorToken.value as IncrementOperator;

		this.expectEndOfStatement();

		return {
			type: "IncrementStatement",
			name,
			operator,
			line: nameToken.line,
			column: nameToken.column,
		};
	}

	private parseCompoundAssignment(): CompoundAssignment {
		const nameToken = this.advance();
		const name = nameToken.value;

		const operatorToken = this.advance(); // consume +=, -=, etc.
		const operator = operatorToken.value as CompoundOperator;

		const value = this.parseExpression();

		this.expectEndOfStatement();

		return {
			type: "CompoundAssignment",
			name,
			operator,
			value,
			line: nameToken.line,
			column: nameToken.column,
		};
	}

	private isCompoundAssignmentToken(type: TokenType | undefined): boolean {
		if (!type) return false;
		return [
			TokenType.PLUS_EQUALS,
			TokenType.MINUS_EQUALS,
			TokenType.STAR_EQUALS,
			TokenType.SLASH_EQUALS,
			TokenType.PERCENT_EQUALS,
			TokenType.STAR_STAR_EQUALS,
		].includes(type);
	}

	private parseAccessAssignmentOrExpression(): Statement {
		const startToken = this.peek();

		// Parse the expression (which will include index access or member access)
		const expr = this.parseExpression();

		// Check if this is an assignment
		if (this.peek().type === TokenType.EQUALS) {
			// This is an index assignment: arr[0] = value
			if (expr.type === "IndexAccess") {
				this.advance(); // consume =
				const value = this.parseExpression();
				this.expectEndOfStatement();

				return {
					type: "IndexAssignment",
					array: expr.array,
					index: expr.index,
					value,
					line: startToken.line,
					column: startToken.column,
				};
			}

			// This is a field assignment: obj.field = value
			if (expr.type === "MemberExpression") {
				this.advance(); // consume =
				const value = this.parseExpression();
				this.expectEndOfStatement();

				return {
					type: "FieldAssignment",
					object: expr.object,
					field: expr.property,
					value,
					line: startToken.line,
					column: startToken.column,
				} as FieldAssignment;
			}

			throw new Error(`Expected index or field access for assignment at line ${startToken.line}`);
		}

		// Otherwise it's an expression statement
		this.expectEndOfStatement();
		return {
			type: "ExpressionStatement",
			expression: expr,
			line: startToken.line,
			column: startToken.column,
		};
	}

	private parsePrintStatement(): PrintStatement {
		const printToken = this.advance();

		this.expect([TokenType.LPAREN]);
		const expression = this.parseExpression();
		this.expect([TokenType.RPAREN]);

		this.expectEndOfStatement();

		return {
			type: "PrintStatement",
			expression,
			line: printToken.line,
			column: printToken.column,
		};
	}

	private parseErrorStatement(): ErrorStatement {
		const errorToken = this.advance();

		this.expect([TokenType.LPAREN]);
		const expression = this.parseExpression();
		this.expect([TokenType.RPAREN]);

		this.expectEndOfStatement();

		return {
			type: "ErrorStatement",
			expression,
			line: errorToken.line,
			column: errorToken.column,
		};
	}

	private parseThrowStatement(): ThrowStatement {
		const throwToken = this.advance(); // consume >X

		this.expect([TokenType.LPAREN]);
		const expression = this.parseExpression();
		this.expect([TokenType.RPAREN]);

		this.expectEndOfStatement();

		return {
			type: "ThrowStatement",
			expression,
			line: throwToken.line,
			column: throwToken.column,
		};
	}

	private parseWhileStatement(): WhileStatement | ForStatement | ForEachStatement {
		const loopToken = this.advance(); // consume @

		this.expect([TokenType.LPAREN]);

		// Check if this is a for loop: @(identifier#range) or @(i#range) where i could be TYPE_INT
		// Look ahead: (IDENTIFIER or TYPE token) followed by # (IMMUTABLE)
		const currentToken = this.peek();
		const isForLoopVar =
			(currentToken.type === TokenType.IDENTIFIER || this.isTypeToken(currentToken.type)) &&
			this.peekNext()?.type === TokenType.IMMUTABLE;

		if (isForLoopVar) {
			return this.parseForLoop(loopToken);
		}

		// Otherwise it's a while loop
		const condition = this.parseExpression();
		this.expect([TokenType.RPAREN]);

		this.skipNewlines();

		const body = this.parseBlock();

		return {
			type: "WhileStatement",
			condition,
			body,
			line: loopToken.line,
			column: loopToken.column,
		};
	}

	private parseForLoop(loopToken: Token): ForStatement | ForEachStatement {
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
				type: "ForStatement",
				variable,
				start: firstExpr,
				end,
				body,
				line: loopToken.line,
				column: loopToken.column,
			};
		} else {
			// For-each loop: @(person#people)
			this.expect([TokenType.RPAREN]);
			this.skipNewlines();
			const body = this.parseBlock();

			return {
				type: "ForEachStatement",
				variable,
				iterable: firstExpr,
				body,
				line: loopToken.line,
				column: loopToken.column,
			};
		}
	}

	private parseIfStatement(): IfStatement {
		const ifToken = this.advance(); // consume ?

		this.expect([TokenType.LPAREN]);
		const condition = this.parseExpression();
		this.expect([TokenType.RPAREN]);

		this.skipNewlines();

		const ifBody = this.parseBlockUntilElseOrEnd();
		const ifBranch: IfBranch = { condition, body: ifBody };

		const elseIfBranches: IfBranch[] = [];
		let elseBranch: Statement[] | null = null;

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
		} else {
			// No else, just expect ;
			this.expect([TokenType.SEMICOLON]);
			this.skipNewlines();
		}

		return {
			type: "IfStatement",
			ifBranch,
			elseIfBranches,
			elseBranch,
			line: ifToken.line,
			column: ifToken.column,
		};
	}

	private parseTryStatement(): TryStatement {
		const tryToken = this.advance(); // consume ?
		this.skipNewlines();

		// Parse try body until we hit :( (catch)
		const tryBody: Statement[] = [];
		while (
			!(this.peek().type === TokenType.ELSE && this.peekNext()?.type === TokenType.LPAREN) &&
			this.peek().type !== TokenType.SEMICOLON &&
			!this.isAtEnd()
		) {
			this.skipNewlines();
			if (
				(this.peek().type === TokenType.ELSE && this.peekNext()?.type === TokenType.LPAREN) ||
				this.peek().type === TokenType.SEMICOLON
			)
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
			type: "TryStatement",
			tryBody,
			catchVariable,
			catchBody,
			line: tryToken.line,
			column: tryToken.column,
		};
	}

	private parseMatchExpression(): MatchExpression {
		const matchToken = this.advance(); // consume ??

		this.expect([TokenType.LPAREN]);
		const value = this.parseExpression();
		this.expect([TokenType.RPAREN]);
		this.skipNewlines();

		const arms: MatchArm[] = [];
		while (this.peek().type === TokenType.PIPE) {
			arms.push(this.parseMatchArm());
			this.skipNewlines();
		}

		this.expect([TokenType.SEMICOLON]);
		this.skipNewlines();

		return {
			type: "MatchExpression",
			value,
			arms,
			line: matchToken.line,
			column: matchToken.column,
		};
	}

	private parseMatchArm(): MatchArm {
		const pipeToken = this.advance(); // consume |
		this.skipNewlines();

		const pattern = this.parsePattern();

		// Check for guard: & condition
		let guard: Expression | undefined;
		if (this.peek().type === TokenType.AMPERSAND) {
			this.advance(); // consume &
			guard = this.parseExpression();
		}

		this.expect([TokenType.FAT_ARROW]);
		this.skipNewlines();

		// Parse body until next | or ;
		const body: Statement[] = [];
		let resultExpression: Expression | undefined;

		while (this.peek().type !== TokenType.PIPE && this.peek().type !== TokenType.SEMICOLON && !this.isAtEnd()) {
			this.skipNewlines();
			if (this.peek().type === TokenType.PIPE || this.peek().type === TokenType.SEMICOLON) break;

			const token = this.peek();
			const nextType = this.peekNext()?.type;

			// Check if this looks like a statement
			const isStatement =
				(this.isTypeToken(token.type) && nextType !== TokenType.FUNC) ||
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
				(token.type === TokenType.IDENTIFIER &&
					(nextType === TokenType.PLUS_PLUS || nextType === TokenType.MINUS_MINUS)) ||
				(token.type === TokenType.IDENTIFIER && this.isCompoundAssignmentToken(nextType)) ||
				(token.type === TokenType.IDENTIFIER && this.enumNames.has(token.value) && nextType === TokenType.IMMUTABLE) ||
				(token.type === TokenType.IDENTIFIER && this.structNames.has(token.value) && nextType === TokenType.IMMUTABLE);

			if (isStatement) {
				body.push(this.parseStatement());
			} else {
				// Parse as expression (potential result value)
				const expr = this.parseExpression();
				this.skipNewlines();

				// Check if this is followed by | or ; (end of arm)
				if (this.peek().type === TokenType.PIPE || this.peek().type === TokenType.SEMICOLON) {
					resultExpression = expr;
				} else {
					// More statements follow
					body.push({
						type: "ExpressionStatement",
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

	private parseSpawnExpression(): Expression {
		const spawnToken = this.advance(); // consume ~>
		const nameToken = this.expect([TokenType.IDENTIFIER]);

		// Parse the function call
		this.expect([TokenType.LPAREN]);
		const args: FunctionArgument[] = [];
		while (this.peek().type !== TokenType.RPAREN) {
			if (this.peek().type === TokenType.IDENTIFIER && this.peekNext()?.type === TokenType.EQUALS) {
				const argNameToken = this.advance();
				this.advance(); // consume =
				const value = this.parseExpression();
				args.push({ name: argNameToken.value, value });
			} else {
				const value = this.parseExpression();
				args.push({ value });
			}
			if (this.peek().type === TokenType.COMMA) {
				this.advance();
			}
		}
		this.expect([TokenType.RPAREN]);

		const call: FunctionCall = {
			type: "FunctionCall",
			name: nameToken.value,
			arguments: args,
			line: nameToken.line,
			column: nameToken.column,
		};

		let expr: Expression = {
			type: "SpawnExpression",
			call,
			line: spawnToken.line,
			column: spawnToken.column,
		} as SpawnExpression;

		// Handle method chaining: ~> func().onError(handler)
		while (this.peek().type === TokenType.DOT) {
			this.advance(); // consume .
			const methodToken = this.expect([TokenType.IDENTIFIER]);
			this.expect([TokenType.LPAREN]);
			const methodArgs: Expression[] = [];
			while (this.peek().type !== TokenType.RPAREN) {
				methodArgs.push(this.parseExpression());
				if (this.peek().type === TokenType.COMMA) {
					this.advance();
				}
			}
			this.expect([TokenType.RPAREN]);
			expr = {
				type: "MethodCall",
				object: expr,
				method: methodToken.value,
				arguments: methodArgs,
				line: methodToken.line,
				column: methodToken.column,
			} as MethodCall;
		}

		return expr;
	}

	private parsePattern(): Pattern {
		const token = this.peek();

		// Wildcard: _
		if (token.type === TokenType.NULL) {
			this.advance();
			return { kind: "wildcard" };
		}

		// Literal: 42, "hello", true
		if (token.type === TokenType.NUMBER_LITERAL) {
			return { kind: "literal", value: this.parseNumberLiteral() };
		}

		if (token.type === TokenType.STRING_LITERAL) {
			return { kind: "literal", value: this.parseStringLiteral() };
		}

		if (token.type === TokenType.BOOL_LITERAL) {
			return { kind: "literal", value: this.parseBoolLiteral() };
		}

		// Tuple pattern: (x, y, z)
		if (token.type === TokenType.LPAREN) {
			return this.parseTuplePattern();
		}

		// J pattern: { key: binding, key2: value }
		if (token.type === TokenType.LBRACE) {
			return this.parseJPattern();
		}

		// Identifier-based patterns
		if (token.type === TokenType.IDENTIFIER) {
			// Enum pattern: Color.Red
			if (this.enumNames.has(token.value)) {
				this.advance(); // consume enum name
				this.expect([TokenType.DOT]);
				const variantToken = this.expect([TokenType.IDENTIFIER]);
				return {
					kind: "enum",
					enumName: token.value,
					variant: variantToken.value,
				} as EnumPattern;
			}

			// Struct pattern: Point(x, y)
			if (this.structNames.has(token.value)) {
				return this.parseStructPattern();
			}

			// Binding pattern: variable name
			this.advance();
			return { kind: "binding", name: token.value } as BindingPattern;
		}

		throw new Error(`Unexpected pattern at line ${token.line}, column ${token.column}`);
	}

	private parseStructPattern(): StructPattern {
		const structNameToken = this.advance();
		const structName = structNameToken.value;

		this.expect([TokenType.LPAREN]);

		const fields: PatternField[] = [];
		while (this.peek().type !== TokenType.RPAREN) {
			fields.push(this.parsePatternField());
			if (this.peek().type === TokenType.COMMA) {
				this.advance();
			}
		}

		this.expect([TokenType.RPAREN]);

		return {
			kind: "struct",
			structName,
			fields,
		};
	}

	private parseTuplePattern(): TuplePattern {
		this.advance(); // consume (

		const elements: PatternField[] = [];
		while (this.peek().type !== TokenType.RPAREN) {
			elements.push(this.parsePatternField());
			if (this.peek().type === TokenType.COMMA) {
				this.advance();
			}
		}

		this.expect([TokenType.RPAREN]);

		return {
			kind: "tuple",
			elements,
		};
	}

	private parsePatternField(): PatternField {
		const token = this.peek();

		// Wildcard in field position: _
		if (token.type === TokenType.NULL) {
			this.advance();
			return { pattern: { kind: "wildcard" } };
		}

		// Literal in field position: 42, "hello", true
		if (token.type === TokenType.NUMBER_LITERAL) {
			return { pattern: { kind: "literal", value: this.parseNumberLiteral() } };
		}

		if (token.type === TokenType.STRING_LITERAL) {
			return { pattern: { kind: "literal", value: this.parseStringLiteral() } };
		}

		if (token.type === TokenType.BOOL_LITERAL) {
			return { pattern: { kind: "literal", value: this.parseBoolLiteral() } };
		}

		// Binding: variable name
		if (token.type === TokenType.IDENTIFIER) {
			this.advance();
			return { binding: token.value };
		}

		throw new Error(`Expected pattern field at line ${token.line}, column ${token.column}`);
	}

	private parseJLiteral(): JLiteral {
		const token = this.advance(); // consume {
		this.skipNewlines();

		const fields: JField[] = [];

		while (this.peek().type !== TokenType.RBRACE) {
			const keyToken = this.expect([TokenType.IDENTIFIER]);

			this.expect([TokenType.ELSE]); // : lexes as ELSE token

			// Skip newlines before value (for multi-line formatting)
			this.skipNewlines();

			const value = this.parseExpression();

			fields.push({ key: keyToken.value, value });

			// Skip newlines after value
			this.skipNewlines();

			// Optional comma between fields
			if (this.peek().type === TokenType.COMMA) {
				this.advance();
				this.skipNewlines();
			}
		}

		this.expect([TokenType.RBRACE]); // consume }

		return {
			type: "JLiteral",
			fields,
			line: token.line,
			column: token.column,
		};
	}

	private parseJPattern(): JPattern {
		this.advance(); // consume {
		this.skipNewlines();

		const fields: JPatternField[] = [];

		while (this.peek().type !== TokenType.RBRACE) {
			const keyToken = this.expect([TokenType.IDENTIFIER]);

			this.expect([TokenType.ELSE]); // : lexes as ELSE token

			const valueToken = this.peek();

			if (valueToken.type === TokenType.NULL) {
				this.advance();
				fields.push({ key: keyToken.value, pattern: { kind: "wildcard" } });
			} else if (valueToken.type === TokenType.NUMBER_LITERAL) {
				fields.push({ key: keyToken.value, pattern: { kind: "literal", value: this.parseNumberLiteral() } });
			} else if (valueToken.type === TokenType.STRING_LITERAL) {
				fields.push({ key: keyToken.value, pattern: { kind: "literal", value: this.parseStringLiteral() } });
			} else if (valueToken.type === TokenType.BOOL_LITERAL) {
				fields.push({ key: keyToken.value, pattern: { kind: "literal", value: this.parseBoolLiteral() } });
			} else if (valueToken.type === TokenType.LBRACE) {
				// Nested J pattern
				fields.push({ key: keyToken.value, pattern: this.parseJPattern() });
			} else if (valueToken.type === TokenType.IDENTIFIER) {
				this.advance();
				fields.push({ key: keyToken.value, binding: valueToken.value });
			} else {
				throw new Error(`Expected pattern value for J field '${keyToken.value}' at line ${valueToken.line}`);
			}

			if (this.peek().type === TokenType.COMMA) {
				this.advance();
			}
			this.skipNewlines();
		}

		this.expect([TokenType.RBRACE]);

		return {
			kind: "j",
			fields,
		};
	}

	private parseEnumDeclaration(exported: boolean = false): EnumDeclaration {
		const enumToken = this.advance(); // consume E
		const nameToken = this.expect([TokenType.IDENTIFIER]);
		this.skipNewlines();

		const variants: string[] = [];
		while (this.peek().type !== TokenType.SEMICOLON) {
			const variantToken = this.expect([TokenType.IDENTIFIER]);
			variants.push(variantToken.value);
			this.skipNewlines();
		}
		this.expect([TokenType.SEMICOLON]);

		return {
			type: "EnumDeclaration",
			name: nameToken.value,
			variants,
			exported,
			line: enumToken.line,
			column: enumToken.column,
		};
	}

	private parseEnumVariableDeclaration(exported: boolean = false): VariableDeclaration {
		const typeToken = this.advance(); // consume enum name (e.g., Color)
		const enumName = typeToken.value;

		// Check for array of enum: Color[]#colors
		let dataType: DataType;
		if (this.peek().type === TokenType.LBRACKET) {
			this.advance(); // consume [
			let size: number | undefined;
			if (this.peek().type === TokenType.NUMBER_LITERAL) {
				const sizeToken = this.advance();
				size = parseInt(sizeToken.value, 10);
			}
			this.expect([TokenType.RBRACKET]);
			dataType = { kind: "array", elementType: { kind: "enum", name: enumName }, size };
		} else {
			dataType = { kind: "enum", name: enumName };
		}

		const mutabilityToken = this.expect([TokenType.IMMUTABLE, TokenType.MUTABLE]);
		const mutability: Mutability = mutabilityToken.type === TokenType.IMMUTABLE ? "immutable" : "mutable";

		const nameToken = this.expect([TokenType.IDENTIFIER]);
		const name = nameToken.value;

		this.expect([TokenType.EQUALS]);
		const value = this.parseExpression();
		this.expectEndOfStatement();

		return {
			type: "VariableDeclaration",
			dataType,
			mutability,
			name,
			value,
			exported,
			line: typeToken.line,
			column: typeToken.column,
		};
	}

	private parseStructDeclaration(exported: boolean = false): StructDeclaration {
		const structToken = this.advance(); // consume S
		const nameToken = this.expect([TokenType.IDENTIFIER]);
		this.skipNewlines();

		const fields: StructField[] = [];
		const methods: StructMethod[] = [];

		while (this.peek().type !== TokenType.SEMICOLON) {
			// Check if this is a method declaration (type Z or Z for void)
			if (this.isMethodStart()) {
				methods.push(this.parseStructMethod());
			} else if (this.isTypeToken(this.peek().type) || this.isStructOrEnumType(this.peek())) {
				// Field declaration: type#name
				fields.push(this.parseStructField());
			} else {
				throw new Error(`Unexpected token in struct body at line ${this.peek().line}`);
			}
			this.skipNewlines();
		}
		this.expect([TokenType.SEMICOLON]);

		return {
			type: "StructDeclaration",
			name: nameToken.value,
			fields,
			methods,
			exported,
			line: structToken.line,
			column: structToken.column,
		};
	}

	private isMethodStart(): boolean {
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

	private isStructOrEnumType(token: Token): boolean {
		return (
			token.type === TokenType.IDENTIFIER && (this.structNames.has(token.value) || this.enumNames.has(token.value))
		);
	}

	private parseStructField(): StructField {
		const typeToken = this.peek();
		let dataType: DataType;

		// Check for struct or enum type
		if (typeToken.type === TokenType.IDENTIFIER) {
			this.advance();
			if (this.structNames.has(typeToken.value)) {
				dataType = { kind: "struct", name: typeToken.value };
			} else if (this.enumNames.has(typeToken.value)) {
				dataType = { kind: "enum", name: typeToken.value };
			} else {
				throw new Error(`Unknown type '${typeToken.value}' at line ${typeToken.line}`);
			}
		} else if (typeToken.type === TokenType.TYPE_J) {
			this.advance();
			dataType = { kind: "j" } as JType;
		} else if (this.isTupleTypeToken(typeToken.type)) {
			this.advance();
			const elementType = this.tupleTokenToElementType(typeToken);
			const length = typeToken.tupleLength === "N" ? undefined : parseInt(typeToken.tupleLength!, 10);
			dataType = { kind: "tuple", elementType, length };
		} else {
			this.advance();
			dataType = this.tokenToDataType(typeToken.type);

			// Check for array type: i[], s[], etc.
			if (this.peek().type === TokenType.LBRACKET) {
				this.advance(); // consume [
				let size: number | undefined;
				if (this.peek().type === TokenType.NUMBER_LITERAL) {
					const sizeToken = this.advance();
					size = parseInt(sizeToken.value, 10);
				}
				this.expect([TokenType.RBRACKET]);
				dataType = { kind: "array", elementType: dataType as PrimitiveType, size };
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

	private parseStructMethod(): StructMethod {
		const startToken = this.peek();
		let returnType: DataType | "void" = "void";

		// Check for return type before Z
		if (this.peek().type !== TokenType.FUNC) {
			const typeToken = this.advance();

			// Check for struct or enum return type
			if (typeToken.type === TokenType.IDENTIFIER) {
				if (this.structNames.has(typeToken.value)) {
					returnType = { kind: "struct", name: typeToken.value };
				} else if (this.enumNames.has(typeToken.value)) {
					returnType = { kind: "enum", name: typeToken.value };
				}
			} else if (typeToken.type === TokenType.TYPE_J) {
				returnType = { kind: "j" } as JType;
			} else if (this.isTupleTypeToken(typeToken.type)) {
				const elementType = this.tupleTokenToElementType(typeToken);
				const length = typeToken.tupleLength === "N" ? undefined : parseInt(typeToken.tupleLength!, 10);
				returnType = { kind: "tuple", elementType, length };
			} else {
				const baseType = this.tokenToDataType(typeToken.type);

				// Check for array return type
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance(); // consume [
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						const sizeToken = this.advance();
						size = parseInt(sizeToken.value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					returnType = { kind: "array", elementType: baseType, size };
				} else {
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
		const parameters: Parameter[] = [];

		while (this.peek().type !== TokenType.RPAREN) {
			let paramType: DataType;
			const paramTypeToken = this.peek();

			// Check for struct parameter type: Person#p or Person[]#people
			if (paramTypeToken.type === TokenType.IDENTIFIER && this.structNames.has(paramTypeToken.value)) {
				this.advance();
				const structType: StructType = { kind: "struct", name: paramTypeToken.value };
				// Check for array of struct
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance(); // consume [
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: structType, size };
				} else {
					paramType = structType;
				}
			}
			// Check for enum parameter type: Color#c or Color[]#colors
			else if (paramTypeToken.type === TokenType.IDENTIFIER && this.enumNames.has(paramTypeToken.value)) {
				this.advance();
				const enumType: EnumType = { kind: "enum", name: paramTypeToken.value };
				// Check for array of enum
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance(); // consume [
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: enumType, size };
				} else {
					paramType = enumType;
				}
			}
			// Check for J parameter type: J#config or J[]#configs
			else if (paramTypeToken.type === TokenType.TYPE_J) {
				this.advance();
				// Check for array of J
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance(); // consume [
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: { kind: "j" }, size };
				} else {
					paramType = { kind: "j" } as JType;
				}
			}
			// Check for tuple type: ti3#t or ti3[]#tuples
			else if (this.isTupleTypeToken(paramTypeToken.type)) {
				this.advance();
				const tupleElementType = this.tupleTokenToElementType(paramTypeToken);
				const tupleLength = paramTypeToken.tupleLength === "N" ? undefined : parseInt(paramTypeToken.tupleLength!, 10);
				const tupleType: TupleType = { kind: "tuple", elementType: tupleElementType, length: tupleLength };
				// Check for array of tuples
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance(); // consume [
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: tupleType, size };
				} else {
					paramType = tupleType;
				}
			}
			// Check for primitive type
			else if (this.isTypeToken(paramTypeToken.type)) {
				this.advance();
				const baseType = this.tokenToDataType(paramTypeToken.type);
				paramType = baseType;

				// Check for array parameter
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance();
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						const sizeToken = this.advance();
						size = parseInt(sizeToken.value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: baseType, size };
				}
			} else {
				throw new Error(`Expected type for parameter at line ${paramTypeToken.line}`);
			}

			this.expect([TokenType.IMMUTABLE]);
			const paramNameToken = this.expect([TokenType.IDENTIFIER]);
			parameters.push({ dataType: paramType, name: paramNameToken.value });
		}

		this.expect([TokenType.RPAREN]);
		this.skipNewlines();

		// Parse method body - statements until ;
		const body: Statement[] = [];
		let returnExpression: Expression | null = null;

		while (this.peek().type !== TokenType.SEMICOLON && !this.isAtEnd()) {
			this.skipNewlines();
			if (this.peek().type === TokenType.SEMICOLON) break;

			const token = this.peek();
			const nextType = this.peekNext()?.type;
			const isStatement =
				(this.isTypeToken(token.type) && nextType !== TokenType.FUNC) ||
				token.type === TokenType.PRINT ||
				token.type === TokenType.ERROR ||
				token.type === TokenType.WHILE ||
				token.type === TokenType.IF ||
				token.type === TokenType.FUNC ||
				token.type === TokenType.THROW ||
				token.type === TokenType.BREAK ||
				token.type === TokenType.CONTINUE ||
				token.type === TokenType.SPAWN ||
				token.type === TokenType.JS_BLOCK ||
				(token.type === TokenType.IDENTIFIER && nextType === TokenType.EQUALS) ||
				(token.type === TokenType.IDENTIFIER &&
					(nextType === TokenType.PLUS_PLUS || nextType === TokenType.MINUS_MINUS)) ||
				(token.type === TokenType.IDENTIFIER && this.isCompoundAssignmentToken(nextType));

			if (isStatement) {
				body.push(this.parseStatement());
			} else {
				const expr = this.parseExpression();
				this.skipNewlines();
				if (this.peek().type === TokenType.SEMICOLON) {
					if (returnType !== "void") {
						returnExpression = expr;
					} else {
						body.push({
							type: "ExpressionStatement",
							expression: expr,
							line: token.line,
							column: token.column,
						});
					}
				} else {
					body.push({
						type: "ExpressionStatement",
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

	private parseStructVariableDeclaration(exported: boolean = false): VariableDeclaration {
		const typeToken = this.advance(); // consume struct name (e.g., Person)
		const structName = typeToken.value;

		// Check for array of struct: Person[]#people
		let dataType: DataType;
		if (this.peek().type === TokenType.LBRACKET) {
			this.advance(); // consume [
			let size: number | undefined;
			if (this.peek().type === TokenType.NUMBER_LITERAL) {
				const sizeToken = this.advance();
				size = parseInt(sizeToken.value, 10);
			}
			this.expect([TokenType.RBRACKET]);
			dataType = { kind: "array", elementType: { kind: "struct", name: structName }, size };
		} else {
			dataType = { kind: "struct", name: structName };
		}

		const mutabilityToken = this.expect([TokenType.IMMUTABLE, TokenType.MUTABLE]);
		const mutability: Mutability = mutabilityToken.type === TokenType.IMMUTABLE ? "immutable" : "mutable";

		const nameToken = this.expect([TokenType.IDENTIFIER]);
		const name = nameToken.value;

		this.expect([TokenType.EQUALS]);
		const value = this.parseExpression();
		this.expectEndOfStatement();

		return {
			type: "VariableDeclaration",
			dataType,
			mutability,
			name,
			value,
			exported,
			line: typeToken.line,
			column: typeToken.column,
		};
	}

	private parseFunctionDeclaration(exported: boolean = false): FunctionDeclaration {
		let returnType: DataType | "void" = "void";
		let startToken = this.peek();

		// Check for return type before Z
		// Check for J return type: J Z or J[] Z
		if (this.peek().type === TokenType.TYPE_J) {
			const typeToken = this.advance();
			startToken = typeToken;
			// Check for array of J: J[] Z
			if (this.peek().type === TokenType.LBRACKET) {
				this.advance();
				let size: number | undefined;
				if (this.peek().type === TokenType.NUMBER_LITERAL) {
					size = parseInt(this.advance().value, 10);
				}
				this.expect([TokenType.RBRACKET]);
				returnType = { kind: "array", elementType: { kind: "j" }, size };
			} else {
				returnType = { kind: "j" } as JType;
			}
		} else if (this.isTypeToken(this.peek().type)) {
			const typeToken = this.advance();
			startToken = typeToken;

			// Check if it's a tuple type: ti3 Z or ti3[] Z
			if (this.isTupleTypeToken(typeToken.type)) {
				const tupleElementType = this.tupleTokenToElementType(typeToken);
				const tupleLength = typeToken.tupleLength === "N" ? undefined : parseInt(typeToken.tupleLength!, 10);
				const tupleType: TupleType = { kind: "tuple", elementType: tupleElementType, length: tupleLength };
				// Check for array of tuples: ti3[] Z
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance();
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					returnType = { kind: "array", elementType: tupleType, size };
				} else {
					returnType = tupleType;
				}
			} else {
				const baseType = this.tokenToDataType(typeToken.type);

				// Check for array return type: i[] Z, s[] Z, etc.
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance(); // consume [
					let size: number | undefined;

					// Check for optional size
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						const sizeToken = this.advance();
						size = parseInt(sizeToken.value, 10);
					}

					this.expect([TokenType.RBRACKET]);
					returnType = { kind: "array", elementType: baseType, size };
				} else {
					returnType = baseType;
				}
			}
		}
		// Check for enum return type: Color Z or Color[] Z
		else if (this.peek().type === TokenType.IDENTIFIER && this.enumNames.has(this.peek().value)) {
			const typeToken = this.advance();
			startToken = typeToken;
			const enumType: EnumType = { kind: "enum", name: typeToken.value };
			// Check for array of enum: Color[] Z
			if (this.peek().type === TokenType.LBRACKET) {
				this.advance();
				let size: number | undefined;
				if (this.peek().type === TokenType.NUMBER_LITERAL) {
					size = parseInt(this.advance().value, 10);
				}
				this.expect([TokenType.RBRACKET]);
				returnType = { kind: "array", elementType: enumType, size };
			} else {
				returnType = enumType;
			}
		}
		// Check for struct return type: Person Z or Person[] Z
		else if (this.peek().type === TokenType.IDENTIFIER && this.structNames.has(this.peek().value)) {
			const typeToken = this.advance();
			startToken = typeToken;
			const structType: StructType = { kind: "struct", name: typeToken.value };
			// Check for array of struct: Person[] Z
			if (this.peek().type === TokenType.LBRACKET) {
				this.advance();
				let size: number | undefined;
				if (this.peek().type === TokenType.NUMBER_LITERAL) {
					size = parseInt(this.advance().value, 10);
				}
				this.expect([TokenType.RBRACKET]);
				returnType = { kind: "array", elementType: structType, size };
			} else {
				returnType = structType;
			}
		}

		// Consume Z
		this.expect([TokenType.FUNC]);

		// Function name
		const nameToken = this.expect([TokenType.IDENTIFIER]);
		const name = nameToken.value;

		// Parameters: (type#name type#name ...)
		this.expect([TokenType.LPAREN]);
		const parameters: Parameter[] = [];

		while (this.peek().type !== TokenType.RPAREN) {
			// Each parameter is type#name, type[]#name, ti5#name, EnumName#name, or StructName#name
			let paramType: DataType;
			const paramTypeToken = this.peek();

			// Check for struct parameter type: Person#p or Person[]#people
			if (paramTypeToken.type === TokenType.IDENTIFIER && this.structNames.has(paramTypeToken.value)) {
				this.advance();
				const structType: StructType = { kind: "struct", name: paramTypeToken.value };
				// Check for array of struct
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance(); // consume [
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: structType, size };
				} else {
					paramType = structType;
				}
			}
			// Check for enum parameter type: Color#c or Color[]#colors
			else if (paramTypeToken.type === TokenType.IDENTIFIER && this.enumNames.has(paramTypeToken.value)) {
				this.advance();
				const enumType: EnumType = { kind: "enum", name: paramTypeToken.value };
				// Check for array of enum
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance(); // consume [
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: enumType, size };
				} else {
					paramType = enumType;
				}
			}
			// Check for J parameter type: J#config or J[]#configs
			else if (paramTypeToken.type === TokenType.TYPE_J) {
				this.advance();
				// Check for array of J
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance(); // consume [
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: { kind: "j" }, size };
				} else {
					paramType = { kind: "j" } as JType;
				}
			}
			// Check for tuple type: ti3#t or ti3[]#tuples
			else if (this.isTupleTypeToken(paramTypeToken.type)) {
				this.advance();
				const tupleElementType = this.tupleTokenToElementType(paramTypeToken);
				const tupleLength = paramTypeToken.tupleLength === "N" ? undefined : parseInt(paramTypeToken.tupleLength!, 10);
				const tupleType: TupleType = { kind: "tuple", elementType: tupleElementType, length: tupleLength };
				// Check for array of tuples
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance(); // consume [
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: tupleType, size };
				} else {
					paramType = tupleType;
				}
			}
			// Check for primitive type
			else if (this.isTypeToken(paramTypeToken.type)) {
				this.advance();
				const baseType = this.tokenToDataType(paramTypeToken.type);
				paramType = baseType;

				// Check for array parameter: i[]#name, s[]#name, etc.
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance(); // consume [
					let size: number | undefined;

					// Check for optional size
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						const sizeToken = this.advance();
						size = parseInt(sizeToken.value, 10);
					}

					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: baseType, size };
				}
			} else {
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
		const body: Statement[] = [];
		let returnExpression: Expression | null = null;

		while (this.peek().type !== TokenType.SEMICOLON && !this.isAtEnd()) {
			this.skipNewlines();
			if (this.peek().type === TokenType.SEMICOLON) break;

			// Check if this looks like a statement or expression
			const token = this.peek();

			// These are clearly statements (not potential return expressions)
			const nextType = this.peekNext()?.type;
			// Check for struct/enum array variable: StructName[]~var or StructName[]#var
			const isStructArrayDecl =
				token.type === TokenType.IDENTIFIER &&
				this.structNames.has(token.value) &&
				nextType === TokenType.LBRACKET &&
				this.isArrayVariableDeclaration();
			const isEnumArrayDecl =
				token.type === TokenType.IDENTIFIER &&
				this.enumNames.has(token.value) &&
				nextType === TokenType.LBRACKET &&
				this.isArrayVariableDeclaration();
			const isStatement =
				(this.isTypeToken(token.type) && nextType !== TokenType.FUNC) ||
				token.type === TokenType.PRINT ||
				token.type === TokenType.ERROR ||
				token.type === TokenType.WHILE ||
				token.type === TokenType.IF ||
				token.type === TokenType.FUNC ||
				token.type === TokenType.THROW ||
				token.type === TokenType.BREAK ||
				token.type === TokenType.CONTINUE ||
				token.type === TokenType.SPAWN ||
				token.type === TokenType.JS_BLOCK ||
				(token.type === TokenType.IDENTIFIER && nextType === TokenType.EQUALS) ||
				(token.type === TokenType.IDENTIFIER &&
					(nextType === TokenType.PLUS_PLUS || nextType === TokenType.MINUS_MINUS)) ||
				(token.type === TokenType.IDENTIFIER && this.isCompoundAssignmentToken(nextType)) ||
				(token.type === TokenType.IDENTIFIER &&
					this.structNames.has(token.value) &&
					(nextType === TokenType.IMMUTABLE || nextType === TokenType.MUTABLE)) ||
				(token.type === TokenType.IDENTIFIER &&
					this.enumNames.has(token.value) &&
					(nextType === TokenType.IMMUTABLE || nextType === TokenType.MUTABLE)) ||
				isStructArrayDecl ||
				isEnumArrayDecl;

			if (isStatement) {
				body.push(this.parseStatement());
			} else {
				// Try to parse as expression (potential return value)
				const expr = this.parseExpression();

				// Check if this is followed by ; (end of function) or newline/more statements
				this.skipNewlines();
				if (this.peek().type === TokenType.SEMICOLON) {
					// This is the return expression
					if (returnType !== "void") {
						returnExpression = expr;
					} else {
						// For void functions, wrap expression in ExpressionStatement
						body.push({
							type: "ExpressionStatement",
							expression: expr,
							line: token.line,
							column: token.column,
						});
					}
				} else {
					// More statements follow, this was just an expression statement
					body.push({
						type: "ExpressionStatement",
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
			type: "FunctionDeclaration",
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

	private parseExpressionStatement(): ExpressionStatement {
		const token = this.peek();
		const expression = this.parseExpression();
		this.expectEndOfStatement();

		return {
			type: "ExpressionStatement",
			expression,
			line: token.line,
			column: token.column,
		};
	}

	private parseSpawnStatement(): ExpressionStatement {
		const spawnToken = this.advance(); // consume ~>
		const nameToken = this.expect([TokenType.IDENTIFIER]);

		// Parse the function call
		this.expect([TokenType.LPAREN]); // expect (
		const args: FunctionArgument[] = [];
		while (this.peek().type !== TokenType.RPAREN) {
			if (this.peek().type === TokenType.IDENTIFIER && this.peekNext()?.type === TokenType.EQUALS) {
				const argNameToken = this.advance();
				this.advance(); // consume =
				const value = this.parseExpression();
				args.push({ name: argNameToken.value, value });
			} else {
				const value = this.parseExpression();
				args.push({ value });
			}
			if (this.peek().type === TokenType.COMMA) {
				this.advance();
			}
		}
		this.expect([TokenType.RPAREN]); // consume )

		const call: FunctionCall = {
			type: "FunctionCall",
			name: nameToken.value,
			arguments: args,
			line: nameToken.line,
			column: nameToken.column,
		};

		let expr: Expression = {
			type: "SpawnExpression",
			call,
			line: spawnToken.line,
			column: spawnToken.column,
		} as SpawnExpression;

		// Handle method chaining: ~> func().onError(handler)
		while (this.peek().type === TokenType.DOT) {
			this.advance(); // consume .
			const methodToken = this.expect([TokenType.IDENTIFIER]);
			this.expect([TokenType.LPAREN]);
			const methodArgs: Expression[] = [];
			while (this.peek().type !== TokenType.RPAREN) {
				methodArgs.push(this.parseExpression());
				if (this.peek().type === TokenType.COMMA) {
					this.advance();
				}
			}
			this.expect([TokenType.RPAREN]);
			expr = {
				type: "MethodCall",
				object: expr,
				method: methodToken.value,
				arguments: methodArgs,
				line: methodToken.line,
				column: methodToken.column,
			} as MethodCall;
		}

		this.expectEndOfStatement();

		return {
			type: "ExpressionStatement",
			expression: expr,
			line: spawnToken.line,
			column: spawnToken.column,
		} as ExpressionStatement;
	}

	// Parse statements until we hit ; (end of block)
	private parseBlock(): Statement[] {
		const statements: Statement[] = [];

		while (this.peek().type !== TokenType.SEMICOLON && !this.isAtEnd()) {
			this.skipNewlines();
			if (this.peek().type === TokenType.SEMICOLON) break;
			statements.push(this.parseStatement());
		}

		this.expect([TokenType.SEMICOLON]);
		this.skipNewlines();

		return statements;
	}

	// Parse statements until we hit :?, :, or ;
	private parseBlockUntilElseOrEnd(): Statement[] {
		const statements: Statement[] = [];

		while (
			this.peek().type !== TokenType.SEMICOLON &&
			this.peek().type !== TokenType.ELSE_IF &&
			this.peek().type !== TokenType.ELSE &&
			!this.isAtEnd()
		) {
			this.skipNewlines();
			if (
				this.peek().type === TokenType.SEMICOLON ||
				this.peek().type === TokenType.ELSE_IF ||
				this.peek().type === TokenType.ELSE
			)
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

	parseExpression(): Expression {
		this.enterParse("expression");
		try {
			return this.parseOr();
		} finally {
			this.exitParse();
		}
	}

	private parseOr(): Expression {
		let left = this.parseAnd();

		while (this.peek().type === TokenType.OR) {
			const operatorToken = this.advance();
			const right = this.parseAnd();
			left = {
				type: "BinaryExpression",
				operator: "||" as BinaryOperator,
				left,
				right,
				line: operatorToken.line,
				column: operatorToken.column,
			};
		}

		return left;
	}

	private parseAnd(): Expression {
		let left = this.parseEquality();

		while (this.peek().type === TokenType.AND) {
			const operatorToken = this.advance();
			const right = this.parseEquality();
			left = {
				type: "BinaryExpression",
				operator: "&&" as BinaryOperator,
				left,
				right,
				line: operatorToken.line,
				column: operatorToken.column,
			};
		}

		return left;
	}

	private parseEquality(): Expression {
		let left = this.parseComparison();

		while (this.peek().type === TokenType.EQ || this.peek().type === TokenType.NEQ) {
			const operatorToken = this.advance();
			const operator = operatorToken.value as BinaryOperator;
			const right = this.parseComparison();
			left = {
				type: "BinaryExpression",
				operator,
				left,
				right,
				line: operatorToken.line,
				column: operatorToken.column,
			};
		}

		return left;
	}

	private parseComparison(): Expression {
		let left = this.parseRange();

		while (
			this.peek().type === TokenType.GT ||
			this.peek().type === TokenType.LT ||
			this.peek().type === TokenType.GTE ||
			this.peek().type === TokenType.LTE
		) {
			const operatorToken = this.advance();
			const operator = operatorToken.value as BinaryOperator;
			const right = this.parseRange();
			left = {
				type: "BinaryExpression",
				operator,
				left,
				right,
				line: operatorToken.line,
				column: operatorToken.column,
			};
		}

		return left;
	}

	private parseRange(): Expression {
		const left = this.parseAdditive();

		// Range expression: 5..8 creates [5, 6, 7, 8]
		if (this.peek().type === TokenType.DOT_DOT) {
			const operatorToken = this.advance();
			const right = this.parseAdditive();
			return {
				type: "RangeExpression",
				start: left,
				end: right,
				line: operatorToken.line,
				column: operatorToken.column,
			};
		}

		return left;
	}

	private parseAdditive(): Expression {
		let left = this.parseMultiplicative();

		while (this.peek().type === TokenType.PLUS || this.peek().type === TokenType.MINUS) {
			const operatorToken = this.advance();
			const operator = operatorToken.value as BinaryOperator;
			const right = this.parseMultiplicative();
			left = {
				type: "BinaryExpression",
				operator,
				left,
				right,
				line: operatorToken.line,
				column: operatorToken.column,
			};
		}

		return left;
	}

	private parseMultiplicative(): Expression {
		let left = this.parseExponent();

		while (
			this.peek().type === TokenType.STAR ||
			this.peek().type === TokenType.SLASH ||
			this.peek().type === TokenType.PERCENT
		) {
			const operatorToken = this.advance();
			const operator = operatorToken.value as BinaryOperator;
			const right = this.parseExponent();
			left = {
				type: "BinaryExpression",
				operator,
				left,
				right,
				line: operatorToken.line,
				column: operatorToken.column,
			};
		}

		return left;
	}

	private parseExponent(): Expression {
		const left = this.parseUnary();

		// Right-associative: 2 ** 3 ** 2 = 2 ** (3 ** 2)
		if (this.peek().type === TokenType.STAR_STAR) {
			const operatorToken = this.advance();
			const right = this.parseExponent(); // recursive for right-associativity
			return {
				type: "BinaryExpression",
				operator: "**",
				left,
				right,
				line: operatorToken.line,
				column: operatorToken.column,
			};
		}

		return left;
	}

	private parseUnary(): Expression {
		if (this.peek().type === TokenType.MINUS) {
			const operatorToken = this.advance();
			const operand = this.parseUnary();
			return {
				type: "UnaryExpression",
				operator: "-",
				operand,
				line: operatorToken.line,
				column: operatorToken.column,
			};
		}

		if (this.peek().type === TokenType.NOT) {
			const operatorToken = this.advance();
			const operand = this.parseUnary();
			return {
				type: "UnaryExpression",
				operator: "!",
				operand,
				line: operatorToken.line,
				column: operatorToken.column,
			};
		}

		return this.parsePrimary();
	}

	private parsePrimary(): Expression {
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
				type: "NullLiteral",
				line: token.line,
				column: token.column,
			} as NullLiteral;
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
				const elements: Expression[] = [firstExpr];
				while (this.peek().type === TokenType.COMMA) {
					this.advance(); // consume comma
					elements.push(this.parseExpression());
				}
				this.expect([TokenType.RPAREN]);
				return {
					type: "TupleLiteral",
					elements,
					line: token.line,
					column: token.column,
				} as TupleLiteral;
			}

			// Just a parenthesized expression
			this.expect([TokenType.RPAREN]);
			return firstExpr;
		}

		// Array literal: [1, 2, 3]
		if (token.type === TokenType.LBRACKET) {
			return this.parseArrayLiteral();
		}

		// J literal: { key: value, key2: value2 }
		if (token.type === TokenType.LBRACE) {
			return this.parseJLiteral();
		}

		// Match expression as expression: i#x = ??(val) | ... ;
		if (token.type === TokenType.MATCH) {
			return this.parseMatchExpression();
		}

		// Spawn expression: ~> functionCall()
		if (token.type === TokenType.SPAWN) {
			return this.parseSpawnExpression();
		}

		// Compile-time expression: ${expr}
		if (token.type === TokenType.COMPTIME_START) {
			return this.parseCompTimeExpression();
		}

		throw new ZZError(`Expected expression, got '${token.value}'`, token.line, token.column);
	}

	private isCastToken(type: TokenType): boolean {
		return [
			TokenType.CAST_STRING,
			TokenType.CAST_INT,
			TokenType.CAST_FLOAT,
			TokenType.CAST_BOOL,
			TokenType.CAST_TUPLE_INT,
			TokenType.CAST_TUPLE_FLOAT,
			TokenType.CAST_TUPLE_STRING,
			TokenType.CAST_TUPLE_BOOL,
		].includes(type);
	}

	private isTupleCastToken(type: TokenType): boolean {
		return [
			TokenType.CAST_TUPLE_INT,
			TokenType.CAST_TUPLE_FLOAT,
			TokenType.CAST_TUPLE_STRING,
			TokenType.CAST_TUPLE_BOOL,
		].includes(type);
	}

	private tupleCastTokenToElementType(token: Token): PrimitiveType {
		switch (token.type) {
			case TokenType.CAST_TUPLE_INT:
				return "int";
			case TokenType.CAST_TUPLE_FLOAT:
				return "float";
			case TokenType.CAST_TUPLE_STRING:
				return "string";
			case TokenType.CAST_TUPLE_BOOL:
				return "bool";
			default:
				throw new Error(`Invalid tuple cast token: ${token.type}`);
		}
	}

	private parseCastExpression(): CastExpression {
		const token = this.advance();
		let targetType: DataType;

		if (this.isTupleCastToken(token.type)) {
			const elementType = this.tupleCastTokenToElementType(token);
			const length = token.tupleLength === "N" ? undefined : parseInt(token.tupleLength!, 10);
			targetType = { kind: "tuple", elementType, length };
		} else {
			switch (token.type) {
				case TokenType.CAST_STRING:
					targetType = "string";
					break;
				case TokenType.CAST_INT:
					targetType = "int";
					break;
				case TokenType.CAST_FLOAT:
					targetType = "float";
					break;
				case TokenType.CAST_BOOL:
					targetType = "bool";
					break;
				default:
					throw new Error(`Invalid cast token: ${token.type}`);
			}
		}

		// The ( was already consumed by the lexer
		const expression = this.parseExpression();
		this.expect([TokenType.RPAREN]);

		return {
			type: "CastExpression",
			targetType,
			expression,
			line: token.line,
			column: token.column,
		};
	}

	private parseInterpolatedString(): InterpolatedString {
		const token = this.advance();
		const raw = token.value;
		const parts: InterpolatedPart[] = [];

		let i = 0;
		let textStart = 0;

		while (i < raw.length) {
			if (raw[i] === "{") {
				// Add text before this {
				if (i > textStart) {
					parts.push({ kind: "text", value: raw.slice(textStart, i) });
				}

				// Find matching }
				let braceDepth = 1;
				let j = i + 1;
				while (j < raw.length && braceDepth > 0) {
					if (raw[j] === "{") braceDepth++;
					else if (raw[j] === "}") braceDepth--;
					j++;
				}

				// Extract expression content
				const exprContent = raw.slice(i + 1, j - 1);

				// Parse the expression
				const lexer = new Lexer(exprContent);
				const exprTokens = lexer.tokenize();
				const exprParser = new Parser(exprTokens);
				const expr = exprParser.parseExpression();

				parts.push({ kind: "expr", value: expr });

				i = j;
				textStart = j;
			} else {
				i++;
			}
		}

		// Add remaining text
		if (textStart < raw.length) {
			parts.push({ kind: "text", value: raw.slice(textStart) });
		}

		return {
			type: "InterpolatedString",
			parts,
			line: token.line,
			column: token.column,
		};
	}

	private parseStringLiteral(): StringLiteral {
		const token = this.advance();
		return {
			type: "StringLiteral",
			value: token.value,
			line: token.line,
			column: token.column,
		};
	}

	private parseNumberLiteral(): NumberLiteral {
		const token = this.advance();
		const value = parseFloat(token.value);
		const isFloat = token.value.includes(".");
		return {
			type: "NumberLiteral",
			value,
			isFloat,
			line: token.line,
			column: token.column,
		};
	}

	private parseBoolLiteral(): BoolLiteral {
		const token = this.advance();
		return {
			type: "BoolLiteral",
			value: token.value === "true",
			line: token.line,
			column: token.column,
		};
	}

	private parseIdentifier(): Expression {
		const token = this.advance();

		let expr: Expression = {
			type: "Identifier",
			name: token.value,
			line: token.line,
			column: token.column,
		};

		// Handle postfix operations: function calls, struct instantiation, index access, method calls
		while (true) {
			if (this.peek().type === TokenType.LPAREN) {
				if (expr.type === "Identifier") {
					// Check if this is a struct instantiation: StructName(...)
					if (this.structNames.has((expr as Identifier).name)) {
						expr = this.parseStructInstantiation(token);
					} else {
						// Regular function call
						expr = this.parseFunctionCall(token);
					}
				} else {
					break;
				}
			} else if (this.peek().type === TokenType.LBRACKET) {
				// Index access: arr[0]
				this.advance(); // consume [
				const index = this.parseExpression();
				this.expect([TokenType.RBRACKET]);
				expr = {
					type: "IndexAccess",
					array: expr,
					index,
					line: token.line,
					column: token.column,
				};
			} else if (this.peek().type === TokenType.DOT) {
				// Property access or method call: obj.prop or obj.method()
				this.advance(); // consume .
				const memberToken = this.expect([TokenType.IDENTIFIER]);

				// Check if it's a method call (followed by parentheses)
				if (this.peek().type === TokenType.LPAREN) {
					this.advance(); // consume (
					const args: Expression[] = [];
					while (this.peek().type !== TokenType.RPAREN) {
						args.push(this.parseExpression());
						if (this.peek().type === TokenType.COMMA) {
							this.advance();
						}
					}
					this.expect([TokenType.RPAREN]);

					expr = {
						type: "MethodCall",
						object: expr,
						method: memberToken.value,
						arguments: args,
						line: token.line,
						column: token.column,
					};
				} else {
					// Check if this is an enum access: Color.Red
					if (expr.type === "Identifier" && this.enumNames.has((expr as Identifier).name)) {
						expr = {
							type: "EnumAccess",
							enumName: (expr as Identifier).name,
							variant: memberToken.value,
							line: token.line,
							column: token.column,
						} as EnumAccess;
					} else {
						// Property access (no parentheses) - could be struct field access
						expr = {
							type: "MemberExpression",
							object: expr,
							property: memberToken.value,
							line: token.line,
							column: token.column,
						};
					}
				}
			} else {
				break;
			}
		}

		return expr;
	}

	private parseStructInstantiation(nameToken: Token): StructInstantiation {
		this.advance(); // consume (

		const args: FunctionArgument[] = [];

		while (this.peek().type !== TokenType.RPAREN) {
			// Check for named argument: name=value
			if (this.peek().type === TokenType.IDENTIFIER && this.peekNext()?.type === TokenType.EQUALS) {
				const argNameToken = this.advance();
				this.advance(); // consume =
				const value = this.parseExpression();
				args.push({ name: argNameToken.value, value });
			} else {
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
			type: "StructInstantiation",
			structName: nameToken.value,
			arguments: args,
			line: nameToken.line,
			column: nameToken.column,
		};
	}

	private parseArrayLiteral(): ArrayLiteral {
		const token = this.advance(); // consume [
		const elements: Expression[] = [];

		// Skip newlines for multi-line arrays
		this.skipNewlines();

		while (this.peek().type !== TokenType.RBRACKET) {
			elements.push(this.parseExpression());

			// Skip newlines after expression
			this.skipNewlines();

			if (this.peek().type === TokenType.COMMA) {
				this.advance();
				// Skip newlines after comma
				this.skipNewlines();
			}
		}

		this.expect([TokenType.RBRACKET]);

		return {
			type: "ArrayLiteral",
			elements,
			line: token.line,
			column: token.column,
		};
	}

	private parseFunctionCall(nameToken: Token): FunctionCall {
		this.advance(); // consume (

		const args: FunctionArgument[] = [];

		while (this.peek().type !== TokenType.RPAREN) {
			// Check for named argument: name=value
			if (this.peek().type === TokenType.IDENTIFIER && this.peekNext()?.type === TokenType.EQUALS) {
				const argNameToken = this.advance();
				this.advance(); // consume =
				const value = this.parseExpression();
				args.push({ name: argNameToken.value, value });
			} else {
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
			type: "FunctionCall",
			name: nameToken.value,
			arguments: args,
			line: nameToken.line,
			column: nameToken.column,
		};
	}

	// Helper methods

	private isTypeToken(type: TokenType): boolean {
		return [
			TokenType.TYPE_STRING,
			TokenType.TYPE_INT,
			TokenType.TYPE_FLOAT,
			TokenType.TYPE_BOOL,
			TokenType.TYPE_J,
			TokenType.TYPE_TUPLE_INT,
			TokenType.TYPE_TUPLE_FLOAT,
			TokenType.TYPE_TUPLE_STRING,
			TokenType.TYPE_TUPLE_BOOL,
		].includes(type);
	}

	private isTupleTypeToken(type: TokenType): boolean {
		return [
			TokenType.TYPE_TUPLE_INT,
			TokenType.TYPE_TUPLE_FLOAT,
			TokenType.TYPE_TUPLE_STRING,
			TokenType.TYPE_TUPLE_BOOL,
		].includes(type);
	}

	private tupleTokenToElementType(token: Token): PrimitiveType {
		switch (token.type) {
			case TokenType.TYPE_TUPLE_INT:
				return "int";
			case TokenType.TYPE_TUPLE_FLOAT:
				return "float";
			case TokenType.TYPE_TUPLE_STRING:
				return "string";
			case TokenType.TYPE_TUPLE_BOOL:
				return "bool";
			default:
				throw new Error(`Invalid tuple type token: ${token.type}`);
		}
	}

	private tokenToDataType(type: TokenType): PrimitiveType {
		switch (type) {
			case TokenType.TYPE_STRING:
				return "string";
			case TokenType.TYPE_INT:
				return "int";
			case TokenType.TYPE_FLOAT:
				return "float";
			case TokenType.TYPE_BOOL:
				return "bool";
			default:
				throw new Error(`Invalid type token: ${type}`);
		}
	}

	// Parse compile-time expression: ${expr}
	private parseCompTimeExpression(): CompTimeExpression {
		const token = this.peek();
		this.advance(); // consume ${ (already tokenized as COMPTIME_START)

		const expression = this.parseExpression();

		this.expect([TokenType.RBRACE]); // consume }

		return {
			type: "CompTimeExpression",
			expression,
			line: token.line,
			column: token.column,
		};
	}

	// Parse compile-time function declaration: $Z name(params) body;
	private parseCompTimeFunctionDeclaration(): CompTimeFunctionDeclaration {
		const startToken = this.advance(); // consume $Z
		let returnType: DataType | "void" = "void";

		// Check for return type before function name
		// $Z is followed optionally by a return type, then the function name
		// e.g., $Z i factorial(i#n) or $Z myFunc()
		if (this.peek().type === TokenType.TYPE_J) {
			this.advance();
			returnType = { kind: "j" } as JType;
		} else if (this.isTypeToken(this.peek().type)) {
			const typeToken = this.advance();
			if (this.isTupleTypeToken(typeToken.type)) {
				const elementType = this.tupleTokenToElementType(typeToken);
				const length = typeToken.tupleLength === "N" ? undefined : parseInt(typeToken.tupleLength!, 10);
				returnType = { kind: "tuple", elementType, length };
			} else {
				const baseType = this.tokenToDataType(typeToken.type);
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance();
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					returnType = { kind: "array", elementType: baseType, size };
				} else {
					returnType = baseType;
				}
			}
		} else if (this.peek().type === TokenType.IDENTIFIER && this.enumNames.has(this.peek().value)) {
			returnType = { kind: "enum", name: this.advance().value };
		} else if (this.peek().type === TokenType.IDENTIFIER && this.structNames.has(this.peek().value)) {
			returnType = { kind: "struct", name: this.advance().value };
		} else if (this.peek().type === TokenType.IDENTIFIER) {
			// Handle case where single-letter type (i, s, f, b) is tokenized as IDENTIFIER
			// This happens because the lexer doesn't know it's followed by a function name
			const token = this.peek();
			if (["i", "s", "f", "b"].includes(token.value) && token.value.length === 1) {
				this.advance();
				switch (token.value) {
					case "i": returnType = "int"; break;
					case "s": returnType = "string"; break;
					case "f": returnType = "float"; break;
					case "b": returnType = "bool"; break;
				}
			}
		}

		// Function name
		const nameToken = this.expect([TokenType.IDENTIFIER]);
		const name = nameToken.value;

		// Parameters
		this.expect([TokenType.LPAREN]);
		const parameters: Parameter[] = [];

		while (this.peek().type !== TokenType.RPAREN) {
			let paramType: DataType;
			const paramTypeToken = this.peek();

			// Check for struct parameter type: Person#p or Person[]#people
			if (paramTypeToken.type === TokenType.IDENTIFIER && this.structNames.has(paramTypeToken.value)) {
				this.advance();
				const structType: StructType = { kind: "struct", name: paramTypeToken.value };
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance();
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: structType, size };
				} else {
					paramType = structType;
				}
			}
			// Check for enum parameter type: Color#c or Color[]#colors
			else if (paramTypeToken.type === TokenType.IDENTIFIER && this.enumNames.has(paramTypeToken.value)) {
				this.advance();
				const enumType: EnumType = { kind: "enum", name: paramTypeToken.value };
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance();
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: enumType, size };
				} else {
					paramType = enumType;
				}
			}
			// Check for J parameter type: J#config or J[]#configs
			else if (paramTypeToken.type === TokenType.TYPE_J) {
				this.advance();
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance();
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: { kind: "j" }, size };
				} else {
					paramType = { kind: "j" } as JType;
				}
			}
			// Check for tuple type: ti3#t or ti3[]#tuples
			else if (this.isTupleTypeToken(paramTypeToken.type)) {
				this.advance();
				const tupleElementType = this.tupleTokenToElementType(paramTypeToken);
				const tupleLength = paramTypeToken.tupleLength === "N" ? undefined : parseInt(paramTypeToken.tupleLength!, 10);
				const tupleType: TupleType = { kind: "tuple", elementType: tupleElementType, length: tupleLength };
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance();
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: tupleType, size };
				} else {
					paramType = tupleType;
				}
			}
			// Check for primitive type
			else if (this.isTypeToken(paramTypeToken.type)) {
				this.advance();
				const baseType = this.tokenToDataType(paramTypeToken.type);
				paramType = baseType;
				if (this.peek().type === TokenType.LBRACKET) {
					this.advance();
					let size: number | undefined;
					if (this.peek().type === TokenType.NUMBER_LITERAL) {
						size = parseInt(this.advance().value, 10);
					}
					this.expect([TokenType.RBRACKET]);
					paramType = { kind: "array", elementType: baseType, size };
				}
			} else {
				throw new Error(`Expected parameter type at line ${paramTypeToken.line}, column ${paramTypeToken.column}`);
			}

			this.expect([TokenType.IMMUTABLE]); // Compile-time function params are always immutable
			const paramNameToken = this.expect([TokenType.IDENTIFIER]);
			parameters.push({ dataType: paramType, name: paramNameToken.value });
		}

		this.expect([TokenType.RPAREN]);
		this.skipNewlines();

		// Function body
		const body: Statement[] = [];
		let returnExpression: Expression | null = null;

		while (this.peek().type !== TokenType.SEMICOLON) {
			this.skipNewlines();
			if (this.peek().type === TokenType.SEMICOLON) break;

			// Check if this could be a return expression (last thing before ;)
			const savedPos = this.pos;
			const potentialExpr = this.tryParseExpression();

			if (potentialExpr && this.peek().type === TokenType.SEMICOLON) {
				returnExpression = potentialExpr;
			} else {
				this.pos = savedPos;
				body.push(this.parseStatement());
			}
		}

		this.expect([TokenType.SEMICOLON]);
		this.skipNewlines();

		return {
			type: "CompTimeFunctionDeclaration",
			name,
			parameters,
			returnType,
			body,
			returnExpression,
			line: startToken.line,
			column: startToken.column,
		};
	}

	// Try to parse an expression, return null if it fails
	private tryParseExpression(): Expression | null {
		try {
			return this.parseExpression();
		} catch {
			return null;
		}
	}

	private peek(): Token {
		// Return EOF token if past the end to prevent undefined errors
		if (this.pos >= this.tokens.length) {
			return { type: TokenType.EOF, value: "", line: 0, column: 0 };
		}
		return this.tokens[this.pos];
	}

	private peekNext(): Token | undefined {
		return this.tokens[this.pos + 1];
	}

	private advance(): Token {
		// Return EOF token if past the end to prevent undefined errors
		if (this.pos >= this.tokens.length) {
			return { type: TokenType.EOF, value: "", line: 0, column: 0 };
		}
		return this.tokens[this.pos++];
	}

	private expect(types: TokenType[]): Token {
		const token = this.peek();
		if (!types.includes(token.type)) {
			const expected = types.map((t) => t.toString()).join(" or ");
			throw new ZZError(`Expected ${expected}, got '${token.value}'`, token.line, token.column);
		}
		return this.advance();
	}

	private expectEndOfStatement(): void {
		const token = this.peek();
		if (token.type !== TokenType.NEWLINE && token.type !== TokenType.EOF) {
			throw new ZZError(`Expected end of statement`, token.line, token.column);
		}
		this.skipNewlines();
	}

	private skipNewlines(): void {
		while (this.peek()?.type === TokenType.NEWLINE) {
			this.advance();
		}
	}

	// Check if current position starts an array variable declaration (Type[]#var or Type[]~var)
	// vs an array return type for function (Type[] Z funcName)
	private isArrayVariableDeclaration(): boolean {
		// We're at Type, next is [
		// Look for pattern: [ optionalSize ] # or ~ (variable decl)
		// vs: [ optionalSize ] Z (function return type)
		let lookAhead = 2; // Start after Type and [
		if (this.tokens[this.pos + lookAhead]?.type === TokenType.NUMBER_LITERAL) {
			lookAhead++; // Skip optional array size
		}
		if (this.tokens[this.pos + lookAhead]?.type === TokenType.RBRACKET) {
			lookAhead++; // Skip ]
			const afterBracket = this.tokens[this.pos + lookAhead]?.type;
			// It's a variable declaration if followed by # or ~
			return afterBracket === TokenType.IMMUTABLE || afterBracket === TokenType.MUTABLE;
		}
		return false;
	}

	private isAtEnd(): boolean {
		return this.peek()?.type === TokenType.EOF;
	}
}
