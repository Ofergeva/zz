export type PrimitiveType = 'string' | 'int' | 'float' | 'bool';
export type DataType = PrimitiveType | ArrayType | TupleType | EnumType | StructType;
export type Mutability = 'immutable' | 'mutable';
export interface ArrayType {
    kind: 'array';
    elementType: PrimitiveType;
    size?: number;
}
export interface TupleType {
    kind: 'tuple';
    elementType: PrimitiveType;
    length?: number;
}
export interface EnumType {
    kind: 'enum';
    name: string;
}
export interface StructType {
    kind: 'struct';
    name: string;
}
export declare function isArrayType(type: DataType): type is ArrayType;
export declare function isTupleType(type: DataType): type is TupleType;
export declare function isEnumType(type: DataType): type is EnumType;
export declare function isStructType(type: DataType): type is StructType;
export declare function isPrimitiveType(type: DataType): type is PrimitiveType;
export interface ASTNode {
    type: string;
    line: number;
    column: number;
}
export interface Program extends ASTNode {
    type: 'Program';
    statements: Statement[];
}
export type Statement = VariableDeclaration | PrintStatement | ErrorStatement | Assignment | WhileStatement | ForStatement | IfStatement | FunctionDeclaration | ExpressionStatement | IndexAssignment | FieldAssignment | BreakStatement | ContinueStatement | TryStatement | ImportStatement | IncrementStatement | CompoundAssignment | ThrowStatement | EnumDeclaration | StructDeclaration;
export interface VariableDeclaration extends ASTNode {
    type: 'VariableDeclaration';
    dataType: DataType;
    mutability: Mutability;
    name: string;
    value: Expression;
    exported: boolean;
}
export interface Assignment extends ASTNode {
    type: 'Assignment';
    name: string;
    value: Expression;
}
export type IncrementOperator = '++' | '--';
export interface IncrementStatement extends ASTNode {
    type: 'IncrementStatement';
    name: string;
    operator: IncrementOperator;
}
export type CompoundOperator = '+=' | '-=' | '*=' | '/=' | '%=' | '**=';
export interface CompoundAssignment extends ASTNode {
    type: 'CompoundAssignment';
    name: string;
    operator: CompoundOperator;
    value: Expression;
}
export interface PrintStatement extends ASTNode {
    type: 'PrintStatement';
    expression: Expression;
}
export interface ErrorStatement extends ASTNode {
    type: 'ErrorStatement';
    expression: Expression;
}
export type ArithmeticOperator = '+' | '-' | '*' | '/' | '**' | '%';
export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';
export type LogicalOperator = '&&' | '||';
export type BinaryOperator = ArithmeticOperator | ComparisonOperator | LogicalOperator;
export type UnaryOperator = '-' | '!';
export interface BreakStatement extends ASTNode {
    type: 'BreakStatement';
}
export interface ContinueStatement extends ASTNode {
    type: 'ContinueStatement';
}
export interface ThrowStatement extends ASTNode {
    type: 'ThrowStatement';
    expression: Expression;
}
export interface TryStatement extends ASTNode {
    type: 'TryStatement';
    tryBody: Statement[];
    catchVariable: string;
    catchBody: Statement[];
}
export type Expression = StringLiteral | NumberLiteral | BoolLiteral | NullLiteral | Identifier | BinaryExpression | UnaryExpression | InterpolatedString | CastExpression | FunctionCall | ArrayLiteral | TupleLiteral | RangeExpression | IndexAccess | MethodCall | MemberExpression | EnumAccess | StructInstantiation;
export interface StringLiteral extends ASTNode {
    type: 'StringLiteral';
    value: string;
}
export interface NumberLiteral extends ASTNode {
    type: 'NumberLiteral';
    value: number;
    isFloat: boolean;
}
export interface BoolLiteral extends ASTNode {
    type: 'BoolLiteral';
    value: boolean;
}
export interface NullLiteral extends ASTNode {
    type: 'NullLiteral';
}
export interface Identifier extends ASTNode {
    type: 'Identifier';
    name: string;
}
export interface BinaryExpression extends ASTNode {
    type: 'BinaryExpression';
    operator: BinaryOperator;
    left: Expression;
    right: Expression;
}
export interface UnaryExpression extends ASTNode {
    type: 'UnaryExpression';
    operator: UnaryOperator;
    operand: Expression;
}
export type InterpolatedPart = {
    kind: 'text';
    value: string;
} | {
    kind: 'expr';
    value: Expression;
};
export interface InterpolatedString extends ASTNode {
    type: 'InterpolatedString';
    parts: InterpolatedPart[];
}
export interface CastExpression extends ASTNode {
    type: 'CastExpression';
    targetType: DataType;
    expression: Expression;
}
export interface WhileStatement extends ASTNode {
    type: 'WhileStatement';
    condition: Expression;
    body: Statement[];
}
export interface ForStatement extends ASTNode {
    type: 'ForStatement';
    variable: string;
    start: Expression;
    end: Expression;
    body: Statement[];
}
export interface IfBranch {
    condition: Expression;
    body: Statement[];
}
export interface IfStatement extends ASTNode {
    type: 'IfStatement';
    ifBranch: IfBranch;
    elseIfBranches: IfBranch[];
    elseBranch: Statement[] | null;
}
export interface Parameter {
    dataType: DataType;
    name: string;
}
export interface FunctionDeclaration extends ASTNode {
    type: 'FunctionDeclaration';
    name: string;
    parameters: Parameter[];
    returnType: DataType | 'void';
    body: Statement[];
    returnExpression: Expression | null;
    exported: boolean;
}
export interface FunctionArgument {
    name?: string;
    value: Expression;
}
export interface FunctionCall extends ASTNode {
    type: 'FunctionCall';
    name: string;
    arguments: FunctionArgument[];
}
export interface ExpressionStatement extends ASTNode {
    type: 'ExpressionStatement';
    expression: Expression;
}
export interface ArrayLiteral extends ASTNode {
    type: 'ArrayLiteral';
    elements: Expression[];
}
export interface TupleLiteral extends ASTNode {
    type: 'TupleLiteral';
    elements: Expression[];
}
export interface RangeExpression extends ASTNode {
    type: 'RangeExpression';
    start: Expression;
    end: Expression;
}
export interface IndexAccess extends ASTNode {
    type: 'IndexAccess';
    array: Expression;
    index: Expression;
}
export interface MethodCall extends ASTNode {
    type: 'MethodCall';
    object: Expression;
    method: string;
    arguments: Expression[];
}
export interface MemberExpression extends ASTNode {
    type: 'MemberExpression';
    object: Expression;
    property: string;
}
export interface IndexAssignment extends ASTNode {
    type: 'IndexAssignment';
    array: Expression;
    index: Expression;
    value: Expression;
}
export interface FieldAssignment extends ASTNode {
    type: 'FieldAssignment';
    object: Expression;
    field: string;
    value: Expression;
}
export interface ImportSpecifier {
    name: string;
    alias?: string;
}
export interface ImportStatement extends ASTNode {
    type: 'ImportStatement';
    specifiers: ImportSpecifier[];
    namespace?: string;
    source: string;
}
export interface EnumDeclaration extends ASTNode {
    type: 'EnumDeclaration';
    name: string;
    variants: string[];
    exported: boolean;
}
export interface EnumAccess extends ASTNode {
    type: 'EnumAccess';
    enumName: string;
    variant: string;
}
export interface StructField {
    name: string;
    dataType: DataType;
}
export interface StructMethod {
    name: string;
    parameters: Parameter[];
    returnType: DataType | 'void';
    body: Statement[];
    returnExpression: Expression | null;
    line: number;
    column: number;
}
export interface StructDeclaration extends ASTNode {
    type: 'StructDeclaration';
    name: string;
    fields: StructField[];
    methods: StructMethod[];
    exported: boolean;
}
export interface StructInstantiation extends ASTNode {
    type: 'StructInstantiation';
    structName: string;
    arguments: FunctionArgument[];
}
