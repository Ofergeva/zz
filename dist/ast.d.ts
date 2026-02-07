export type PrimitiveType = "string" | "int" | "float" | "bool";
export type DataType = PrimitiveType | ArrayType | TupleType | EnumType | StructType | JType | TypeParameterType | TraitType;
export type Mutability = "immutable" | "mutable";
export type ArrayElementType = PrimitiveType | StructType | EnumType | JType | TupleType | TypeParameterType | TraitType | ArrayType;
export interface ArrayType {
    kind: "array";
    elementType: ArrayElementType;
    size?: number;
    isEmpty?: boolean;
}
export interface TupleType {
    kind: "tuple";
    elementType: PrimitiveType;
    length?: number;
}
export interface EnumType {
    kind: "enum";
    name: string;
}
export interface StructType {
    kind: "struct";
    name: string;
    typeArguments?: DataType[];
}
export interface JType {
    kind: "j";
}
export interface TypeParameterType {
    kind: "typeParameter";
    name: string;
}
export interface TypeParameterDecl {
    name: string;
    constraint?: string;
}
export interface TraitType {
    kind: "trait";
    name: string;
}
export declare function isArrayType(type: DataType): type is ArrayType;
export declare function isTupleType(type: DataType): type is TupleType;
export declare function isEnumType(type: DataType): type is EnumType;
export declare function isStructType(type: DataType): type is StructType;
export declare function isJType(type: DataType): type is JType;
export declare function isPrimitiveType(type: DataType): type is PrimitiveType;
export declare function isArrayElementType(type: DataType): type is ArrayElementType;
export declare function isTypeParameterType(type: DataType): type is TypeParameterType;
export declare function isTraitType(type: DataType): type is TraitType;
export interface ASTNode {
    type: string;
    line: number;
    column: number;
}
export interface Program extends ASTNode {
    type: "Program";
    statements: Statement[];
}
export type Statement = VariableDeclaration | PrintStatement | ErrorStatement | Assignment | WhileStatement | ForStatement | ForEachStatement | IfStatement | FunctionDeclaration | ExpressionStatement | IndexAssignment | FieldAssignment | BreakStatement | ContinueStatement | TryStatement | ImportStatement | IncrementStatement | CompoundAssignment | ThrowStatement | EnumDeclaration | StructDeclaration | MatchExpression | JSBlockStatement | CompTimeFunctionDeclaration | TraitDeclaration;
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
export type IncrementOperator = "++" | "--";
export interface IncrementStatement extends ASTNode {
    type: "IncrementStatement";
    name: string;
    operator: IncrementOperator;
}
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
export interface ErrorStatement extends ASTNode {
    type: "ErrorStatement";
    expression: Expression;
}
export type ArithmeticOperator = "+" | "-" | "*" | "/" | "**" | "%";
export type ComparisonOperator = ">" | "<" | ">=" | "<=" | "==" | "!=";
export type LogicalOperator = "&&" | "||";
export type BinaryOperator = ArithmeticOperator | ComparisonOperator | LogicalOperator;
export type UnaryOperator = "-" | "!";
export interface BreakStatement extends ASTNode {
    type: "BreakStatement";
}
export interface ContinueStatement extends ASTNode {
    type: "ContinueStatement";
}
export interface ThrowStatement extends ASTNode {
    type: "ThrowStatement";
    expression: Expression;
}
export interface TryStatement extends ASTNode {
    type: "TryStatement";
    tryBody: Statement[];
    catchVariable: string;
    catchBody: Statement[];
}
export type Expression = StringLiteral | NumberLiteral | BoolLiteral | NullLiteral | Identifier | BinaryExpression | UnaryExpression | InterpolatedString | CastExpression | FunctionCall | ArrayLiteral | TupleLiteral | RangeExpression | IndexAccess | MethodCall | MemberExpression | EnumAccess | StructInstantiation | MatchExpression | SpawnExpression | JLiteral | CompTimeExpression;
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
export type InterpolatedPart = {
    kind: "text";
    value: string;
} | {
    kind: "expr";
    value: Expression;
};
export interface InterpolatedString extends ASTNode {
    type: "InterpolatedString";
    parts: InterpolatedPart[];
}
export interface CastExpression extends ASTNode {
    type: "CastExpression";
    targetType: DataType;
    expression: Expression;
}
export interface WhileStatement extends ASTNode {
    type: "WhileStatement";
    condition: Expression;
    body: Statement[];
}
export interface ForStatement extends ASTNode {
    type: "ForStatement";
    variable: string;
    start: Expression;
    end: Expression;
    body: Statement[];
}
export interface ForEachStatement extends ASTNode {
    type: "ForEachStatement";
    variable: string;
    iterable: Expression;
    body: Statement[];
}
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
export interface Parameter {
    dataType: DataType;
    name: string;
}
export interface FunctionDeclaration extends ASTNode {
    type: "FunctionDeclaration";
    name: string;
    typeParameters: TypeParameterDecl[];
    parameters: Parameter[];
    returnType: DataType | "void";
    body: Statement[];
    returnExpression: Expression | null;
    exported: boolean;
}
export interface FunctionArgument {
    name?: string;
    value: Expression;
}
export interface FunctionCall extends ASTNode {
    type: "FunctionCall";
    name: string;
    arguments: FunctionArgument[];
    typeArguments?: DataType[];
}
export interface ExpressionStatement extends ASTNode {
    type: "ExpressionStatement";
    expression: Expression;
}
export interface ArrayLiteral extends ASTNode {
    type: "ArrayLiteral";
    elements: Expression[];
}
export interface TupleLiteral extends ASTNode {
    type: "TupleLiteral";
    elements: Expression[];
}
export interface RangeExpression extends ASTNode {
    type: "RangeExpression";
    start: Expression;
    end: Expression;
}
export interface IndexAccess extends ASTNode {
    type: "IndexAccess";
    array: Expression;
    index: Expression;
}
export interface MethodCall extends ASTNode {
    type: "MethodCall";
    object: Expression;
    method: string;
    arguments: Expression[];
}
export interface MemberExpression extends ASTNode {
    type: "MemberExpression";
    object: Expression;
    property: string;
}
export interface IndexAssignment extends ASTNode {
    type: "IndexAssignment";
    array: Expression;
    index: Expression;
    value: Expression;
}
export interface FieldAssignment extends ASTNode {
    type: "FieldAssignment";
    object: Expression;
    field: string;
    value: Expression;
}
export interface ImportSpecifier {
    name: string;
    alias?: string;
}
export interface ImportStatement extends ASTNode {
    type: "ImportStatement";
    specifiers: ImportSpecifier[];
    namespace?: string;
    source: string;
    isStdLib: boolean;
    isUnsafe: boolean;
}
export interface EnumDeclaration extends ASTNode {
    type: "EnumDeclaration";
    name: string;
    variants: string[];
    exported: boolean;
}
export interface EnumAccess extends ASTNode {
    type: "EnumAccess";
    enumName: string;
    variant: string;
}
export interface TraitMethodSignature {
    name: string;
    parameters: Parameter[];
    returnType: DataType | "void";
}
export interface TraitDeclaration extends ASTNode {
    type: "TraitDeclaration";
    name: string;
    methods: TraitMethodSignature[];
    exported: boolean;
}
export interface StructField {
    name: string;
    dataType: DataType;
}
export interface StructMethod {
    name: string;
    parameters: Parameter[];
    returnType: DataType | "void";
    body: Statement[];
    returnExpression: Expression | null;
    line: number;
    column: number;
}
export interface StructDeclaration extends ASTNode {
    type: "StructDeclaration";
    name: string;
    typeParameters: TypeParameterDecl[];
    fields: StructField[];
    methods: StructMethod[];
    exported: boolean;
    traitImplements: string[];
}
export interface StructInstantiation extends ASTNode {
    type: "StructInstantiation";
    structName: string;
    arguments: FunctionArgument[];
    typeArguments?: DataType[];
}
export interface JField {
    key: string;
    value: Expression;
}
export interface JLiteral extends ASTNode {
    type: "JLiteral";
    fields: JField[];
}
export type Pattern = EnumPattern | LiteralPattern | StructPattern | TuplePattern | WildcardPattern | BindingPattern | JPattern;
export interface EnumPattern {
    kind: "enum";
    enumName: string;
    variant: string;
}
export interface LiteralPattern {
    kind: "literal";
    value: Expression;
}
export interface StructPattern {
    kind: "struct";
    structName: string;
    fields: PatternField[];
}
export interface PatternField {
    binding?: string;
    pattern?: Pattern;
}
export interface TuplePattern {
    kind: "tuple";
    elements: PatternField[];
}
export interface WildcardPattern {
    kind: "wildcard";
}
export interface BindingPattern {
    kind: "binding";
    name: string;
}
export interface JPatternField {
    key: string;
    binding?: string;
    pattern?: Pattern;
}
export interface JPattern {
    kind: "j";
    fields: JPatternField[];
}
export interface MatchArm {
    pattern: Pattern;
    guard?: Expression;
    body: Statement[];
    resultExpression?: Expression;
    line: number;
    column: number;
}
export interface MatchExpression extends ASTNode {
    type: "MatchExpression";
    value: Expression;
    arms: MatchArm[];
}
export interface JSBlockStatement extends ASTNode {
    type: "JSBlockStatement";
    code: string;
}
export interface SpawnExpression extends ASTNode {
    type: "SpawnExpression";
    call: FunctionCall | MethodCall;
}
export type CompTimeValue = {
    kind: "int";
    value: number;
} | {
    kind: "float";
    value: number;
} | {
    kind: "string";
    value: string;
} | {
    kind: "bool";
    value: boolean;
} | {
    kind: "null";
} | {
    kind: "array";
    elementType: PrimitiveType;
    values: CompTimeValue[];
} | {
    kind: "tuple";
    elementType: PrimitiveType;
    values: CompTimeValue[];
} | {
    kind: "j";
    fields: {
        key: string;
        value: CompTimeValue;
    }[];
};
export interface CompTimeExpression extends ASTNode {
    type: "CompTimeExpression";
    expression: Expression;
    evaluatedValue?: CompTimeValue;
}
export interface CompTimeFunctionDeclaration extends ASTNode {
    type: "CompTimeFunctionDeclaration";
    name: string;
    parameters: Parameter[];
    returnType: DataType | "void";
    body: Statement[];
    returnExpression: Expression | null;
}
export interface ImportedModuleInfo {
    functions: Map<string, {
        parameters: Parameter[];
        returnType: DataType | "void";
        typeParameters?: TypeParameterDecl[];
    }>;
    variables: Map<string, {
        dataType: DataType;
        mutability: Mutability;
    }>;
    structs: Map<string, {
        fields: StructField[];
        typeParameters?: TypeParameterDecl[];
    }>;
    enums: Map<string, string[]>;
    traits: Map<string, {
        methods: TraitMethodSignature[];
    }>;
}
