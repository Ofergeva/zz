import { Program } from "./ast.js";
export interface CodeGenOptions {
    sourceDir: string;
    outputDir: string;
    stdLibDir: string;
}
export declare class CodeGenerator {
    private functionParams;
    private structFields;
    private structMethods;
    private options?;
    private hasSpawn;
    constructor(options?: CodeGenOptions);
    generate(program: Program): string;
    private generateStatement;
    private generateEnumDeclaration;
    private generateStructDeclaration;
    private generateStructMethod;
    private replaceFieldsWithThis;
    private generateTryStatement;
    private generateImportStatement;
    private generateIndexAssignment;
    private generateFieldAssignment;
    private generateVariableDeclaration;
    private generateAssignment;
    private generateIncrementStatement;
    private generateCompoundAssignment;
    private generatePrintStatement;
    private generateErrorStatement;
    private generateThrowStatement;
    private generateWhileStatement;
    private generateForStatement;
    private generateForEachStatement;
    private generateIfStatement;
    private generateFunctionDeclaration;
    private generateFunctionCallCode;
    private generateExpression;
    private serializeCompTimeValue;
    private generateMethodCallCodeWithoutAwait;
    private generateMatchExpression;
    private generatePatternCondition;
    private substituteBindingsInGuard;
    private generatePatternBindings;
}
