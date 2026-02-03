// AST Node Types for ZZ Language

export type PrimitiveType = "string" | "int" | "float" | "bool";
export type DataType = PrimitiveType | ArrayType | TupleType | EnumType | StructType | JType;
export type Mutability = "immutable" | "mutable";

// Array type: element type + optional fixed size
export interface ArrayType {
	kind: "array";
	elementType: PrimitiveType;
	size?: number; // Optional fixed size (e.g., i[5])
}

// Tuple type: element type + optional length (undefined = inferred from value)
export interface TupleType {
	kind: "tuple";
	elementType: PrimitiveType;
	length?: number; // Optional length (e.g., ti5 has 5, tiN has undefined)
}

// Enum type: named set of variants
export interface EnumType {
	kind: "enum";
	name: string;
}

// Struct type: named struct with fields and methods
export interface StructType {
	kind: "struct";
	name: string;
}

// J type: JSON-like object with string keys and dynamic values
export interface JType {
	kind: "j";
}

// Helper to check if a type is an array
export function isArrayType(type: DataType): type is ArrayType {
	return typeof type === "object" && type.kind === "array";
}

// Helper to check if a type is a tuple
export function isTupleType(type: DataType): type is TupleType {
	return typeof type === "object" && type.kind === "tuple";
}

// Helper to check if a type is an enum
export function isEnumType(type: DataType): type is EnumType {
	return typeof type === "object" && type.kind === "enum";
}

// Helper to check if a type is a struct
export function isStructType(type: DataType): type is StructType {
	return typeof type === "object" && type.kind === "struct";
}

// Helper to check if a type is a J type
export function isJType(type: DataType): type is JType {
	return typeof type === "object" && type.kind === "j";
}

// Helper to check if a type is primitive
export function isPrimitiveType(type: DataType): type is PrimitiveType {
	return typeof type === "string";
}

// Base interface for all AST nodes
export interface ASTNode {
	type: string;
	line: number;
	column: number;
}

// Program - root node
export interface Program extends ASTNode {
	type: "Program";
	statements: Statement[];
}

// Statements
export type Statement =
	| VariableDeclaration
	| PrintStatement
	| ErrorStatement
	| Assignment
	| WhileStatement
	| ForStatement
	| ForEachStatement
	| IfStatement
	| FunctionDeclaration
	| ExpressionStatement
	| IndexAssignment
	| FieldAssignment
	| BreakStatement
	| ContinueStatement
	| TryStatement
	| ImportStatement
	| IncrementStatement
	| CompoundAssignment
	| ThrowStatement
	| EnumDeclaration
	| StructDeclaration
	| MatchExpression
	| JSBlockStatement;

export interface VariableDeclaration extends ASTNode {
	type: "VariableDeclaration";
	dataType: DataType;
	mutability: Mutability;
	name: string;
	value: Expression;
	exported: boolean;
}

export interface Assignment extends ASTNode {
	type: "Assignment";
	name: string;
	value: Expression;
}

// Increment/Decrement statement: x++ or x--
export type IncrementOperator = "++" | "--";

export interface IncrementStatement extends ASTNode {
	type: "IncrementStatement";
	name: string;
	operator: IncrementOperator;
}

// Compound assignment: x += 5, x -= 3, etc.
export type CompoundOperator = "+=" | "-=" | "*=" | "/=" | "%=" | "**=";

export interface CompoundAssignment extends ASTNode {
	type: "CompoundAssignment";
	name: string;
	operator: CompoundOperator;
	value: Expression;
}

export interface PrintStatement extends ASTNode {
	type: "PrintStatement";
	expression: Expression;
}

// Error statement: error(expression) -> console.error()
export interface ErrorStatement extends ASTNode {
	type: "ErrorStatement";
	expression: Expression;
}

// Operators
export type ArithmeticOperator = "+" | "-" | "*" | "/" | "**" | "%";
export type ComparisonOperator = ">" | "<" | ">=" | "<=" | "==" | "!=";
export type LogicalOperator = "&&" | "||";
export type BinaryOperator = ArithmeticOperator | ComparisonOperator | LogicalOperator;
export type UnaryOperator = "-" | "!";

// Break statement: >!
export interface BreakStatement extends ASTNode {
	type: "BreakStatement";
}

// Continue statement: >>
export interface ContinueStatement extends ASTNode {
	type: "ContinueStatement";
}

// Throw statement: >X(expression)
export interface ThrowStatement extends ASTNode {
	type: "ThrowStatement";
	expression: Expression;
}

// Try statement: ? ... :(e) ... ;
export interface TryStatement extends ASTNode {
	type: "TryStatement";
	tryBody: Statement[];
	catchVariable: string; // The error variable name
	catchBody: Statement[];
}

// Expressions
export type Expression =
	| StringLiteral
	| NumberLiteral
	| BoolLiteral
	| NullLiteral
	| Identifier
	| BinaryExpression
	| UnaryExpression
	| InterpolatedString
	| CastExpression
	| FunctionCall
	| ArrayLiteral
	| TupleLiteral
	| RangeExpression
	| IndexAccess
	| MethodCall
	| MemberExpression
	| EnumAccess
	| StructInstantiation
	| MatchExpression
	| SpawnExpression
	| JLiteral;

export interface StringLiteral extends ASTNode {
	type: "StringLiteral";
	value: string;
}

export interface NumberLiteral extends ASTNode {
	type: "NumberLiteral";
	value: number;
	isFloat: boolean;
}

export interface BoolLiteral extends ASTNode {
	type: "BoolLiteral";
	value: boolean;
}

export interface NullLiteral extends ASTNode {
	type: "NullLiteral";
}

export interface Identifier extends ASTNode {
	type: "Identifier";
	name: string;
}

export interface BinaryExpression extends ASTNode {
	type: "BinaryExpression";
	operator: BinaryOperator;
	left: Expression;
	right: Expression;
}

export interface UnaryExpression extends ASTNode {
	type: "UnaryExpression";
	operator: UnaryOperator;
	operand: Expression;
}

// Interpolated string: s"hello {name}, you are {age} years old"
// Parts alternate between string literals and expressions
export type InterpolatedPart = { kind: "text"; value: string } | { kind: "expr"; value: Expression };

export interface InterpolatedString extends ASTNode {
	type: "InterpolatedString";
	parts: InterpolatedPart[];
}

// Cast expression: s(expr), i(expr), f(expr), b(expr)
export interface CastExpression extends ASTNode {
	type: "CastExpression";
	targetType: DataType;
	expression: Expression;
}

// While statement: @(condition) ... ;
export interface WhileStatement extends ASTNode {
	type: "WhileStatement";
	condition: Expression;
	body: Statement[];
}

// For statement: @(i#1..5) ... ;
export interface ForStatement extends ASTNode {
	type: "ForStatement";
	variable: string; // Loop variable name
	start: Expression; // Range start
	end: Expression; // Range end
	body: Statement[];
}

// For-each statement: @(item#array) ... ;
export interface ForEachStatement extends ASTNode {
	type: "ForEachStatement";
	variable: string;
	iterable: Expression;
	body: Statement[];
}

// If statement: ?(condition) ... :?(condition) ... : ... ;
export interface IfBranch {
	condition: Expression;
	body: Statement[];
}

export interface IfStatement extends ASTNode {
	type: "IfStatement";
	ifBranch: IfBranch;
	elseIfBranches: IfBranch[];
	elseBranch: Statement[] | null;
}

// Function parameter: type#name (always immutable)
export interface Parameter {
	dataType: DataType;
	name: string;
}

// Function declaration: [returnType] Z name(params) body;
export interface FunctionDeclaration extends ASTNode {
	type: "FunctionDeclaration";
	name: string;
	parameters: Parameter[];
	returnType: DataType | "void";
	body: Statement[];
	returnExpression: Expression | null; // Last expression for implicit return
	exported: boolean;
}

// Function call argument (positional or named)
export interface FunctionArgument {
	name?: string; // If named argument
	value: Expression;
}

// Function call: name(args) or name(arg1, name=arg2)
export interface FunctionCall extends ASTNode {
	type: "FunctionCall";
	name: string;
	arguments: FunctionArgument[];
}

// Expression statement (for function calls used as statements)
export interface ExpressionStatement extends ASTNode {
	type: "ExpressionStatement";
	expression: Expression;
}

// Array literal: [1, 2, 3]
export interface ArrayLiteral extends ASTNode {
	type: "ArrayLiteral";
	elements: Expression[];
}

// Tuple literal: (1, 2, 3)
export interface TupleLiteral extends ASTNode {
	type: "TupleLiteral";
	elements: Expression[];
}

// Range expression: 5..8 creates [5, 6, 7, 8]
export interface RangeExpression extends ASTNode {
	type: "RangeExpression";
	start: Expression;
	end: Expression;
}

// Index access: arr[0]
export interface IndexAccess extends ASTNode {
	type: "IndexAccess";
	array: Expression;
	index: Expression;
}

// Method call: arr.len(), arr.push(x), arr.pop()
export interface MethodCall extends ASTNode {
	type: "MethodCall";
	object: Expression;
	method: string;
	arguments: Expression[];
}

// Member/property access: obj.property
export interface MemberExpression extends ASTNode {
	type: "MemberExpression";
	object: Expression;
	property: string;
}

// Index assignment: arr[0] = value
export interface IndexAssignment extends ASTNode {
	type: "IndexAssignment";
	array: Expression;
	index: Expression;
	value: Expression;
}

// Field assignment: obj.field = value
export interface FieldAssignment extends ASTNode {
	type: "FieldAssignment";
	object: Expression;
	field: string;
	value: Expression;
}

// Import specifier: { name } or { alias=name }
export interface ImportSpecifier {
	name: string; // Original name from module
	alias?: string; // Local name (if aliased)
}

// Import statement: <- { add, sub } = "./math" or <- utils = "./utils" or <- { x } = std/math
// Unsafe import: <-! { x } = "npm-package" (JS modules, no type safety)
export interface ImportStatement extends ASTNode {
	type: "ImportStatement";
	specifiers: ImportSpecifier[]; // Empty for namespace import
	namespace?: string; // For namespace import: <- utils = "./path"
	source: string; // Module path
	isStdLib: boolean; // true for unquoted std/xxx imports
	isUnsafe: boolean; // true for <-! imports (JS modules)
}

// Enum declaration: E Color Red Green Blue ;
export interface EnumDeclaration extends ASTNode {
	type: "EnumDeclaration";
	name: string;
	variants: string[];
	exported: boolean;
}

// Enum access: Color.Red
export interface EnumAccess extends ASTNode {
	type: "EnumAccess";
	enumName: string;
	variant: string;
}

// Struct field: type#name
export interface StructField {
	name: string;
	dataType: DataType;
}

// Struct method
export interface StructMethod {
	name: string;
	parameters: Parameter[];
	returnType: DataType | "void";
	body: Statement[];
	returnExpression: Expression | null;
	line: number;
	column: number;
}

// Struct declaration: S Person s#name i#age ... ;
export interface StructDeclaration extends ASTNode {
	type: "StructDeclaration";
	name: string;
	fields: StructField[];
	methods: StructMethod[];
	exported: boolean;
}

// Struct instantiation: Person("Alice", 30)
export interface StructInstantiation extends ASTNode {
	type: "StructInstantiation";
	structName: string;
	arguments: FunctionArgument[];
}

// J object field: key-value pair in a J literal
export interface JField {
	key: string;
	value: Expression;
}

// J literal: { key1: value1, key2: value2 }
export interface JLiteral extends ASTNode {
	type: "JLiteral";
	fields: JField[];
}

// Pattern matching types
export type Pattern = EnumPattern | LiteralPattern | StructPattern | TuplePattern | WildcardPattern | BindingPattern | JPattern;

// Enum pattern: Color.Red
export interface EnumPattern {
	kind: "enum";
	enumName: string;
	variant: string;
}

// Literal pattern: 42, "hello", true
export interface LiteralPattern {
	kind: "literal";
	value: Expression;
}

// Struct pattern: Point(x, y) or Point(0, y)
export interface StructPattern {
	kind: "struct";
	structName: string;
	fields: PatternField[];
}

// Pattern field: binding or nested pattern
export interface PatternField {
	binding?: string; // Variable name to bind
	pattern?: Pattern; // Nested pattern (e.g., literal 0)
}

// Tuple pattern: (x, y, z) or (0, y)
export interface TuplePattern {
	kind: "tuple";
	elements: PatternField[];
}

// Wildcard pattern: _
export interface WildcardPattern {
	kind: "wildcard";
}

// Binding pattern: n (captures value into variable n)
export interface BindingPattern {
	kind: "binding";
	name: string;
}

// J pattern field: key with binding or nested pattern
export interface JPatternField {
	key: string;
	binding?: string;
	pattern?: Pattern;
}

// J pattern: { key1: binding1, key2: value2 }
export interface JPattern {
	kind: "j";
	fields: JPatternField[];
}

// Match arm: | pattern => body
export interface MatchArm {
	pattern: Pattern;
	guard?: Expression; // Optional guard condition
	body: Statement[];
	resultExpression?: Expression; // Result for expression context
	line: number;
	column: number;
}

// Match expression: ??(value) | pattern => body ;
export interface MatchExpression extends ASTNode {
	type: "MatchExpression";
	value: Expression;
	arms: MatchArm[];
}

// Raw JavaScript injection: $js { code }
export interface JSBlockStatement extends ASTNode {
	type: "JSBlockStatement";
	code: string;
}

// Spawn expression: ~> functionCall() — non-blocking call wrapped in Spawn
export interface SpawnExpression extends ASTNode {
	type: "SpawnExpression";
	call: FunctionCall | MethodCall;
}

// Type information extracted from an imported .zz module
export interface ImportedModuleInfo {
	functions: Map<
		string,
		{
			parameters: Parameter[];
			returnType: DataType | "void";
		}
	>;
	variables: Map<
		string,
		{
			dataType: DataType;
			mutability: Mutability;
		}
	>;
	structs: Map<
		string,
		{
			fields: StructField[];
		}
	>;
	enums: Map<string, string[]>;
}
