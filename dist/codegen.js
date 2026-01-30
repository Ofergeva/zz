// JavaScript Code Generator for ZZ Language
import { isArrayType, isTupleType, } from './ast.js';
export class CodeGenerator {
    // Store function parameter info for named argument reordering
    functionParams = new Map();
    // Store struct field info for constructor argument reordering
    structFields = new Map();
    // Store struct method names to distinguish from UFCS
    structMethods = new Map();
    generate(program) {
        this.functionParams.clear();
        this.structFields.clear();
        this.structMethods.clear();
        // First pass: collect struct info
        for (const statement of program.statements) {
            if (statement.type === 'StructDeclaration') {
                this.structFields.set(statement.name, statement.fields.map(f => f.name));
                const methods = new Set(statement.methods.map(m => m.name));
                this.structMethods.set(statement.name, methods);
            }
        }
        const lines = [];
        for (const statement of program.statements) {
            lines.push(this.generateStatement(statement));
        }
        return lines.join('\n');
    }
    generateStatement(statement) {
        switch (statement.type) {
            case 'VariableDeclaration':
                return this.generateVariableDeclaration(statement);
            case 'Assignment':
                return this.generateAssignment(statement);
            case 'PrintStatement':
                return this.generatePrintStatement(statement);
            case 'ErrorStatement':
                return this.generateErrorStatement(statement);
            case 'ThrowStatement':
                return this.generateThrowStatement(statement);
            case 'WhileStatement':
                return this.generateWhileStatement(statement);
            case 'ForStatement':
                return this.generateForStatement(statement);
            case 'IfStatement':
                return this.generateIfStatement(statement);
            case 'FunctionDeclaration':
                return this.generateFunctionDeclaration(statement);
            case 'ExpressionStatement':
                return this.generateExpression(statement.expression) + ';';
            case 'IndexAssignment':
                return this.generateIndexAssignment(statement);
            case 'FieldAssignment':
                return this.generateFieldAssignment(statement);
            case 'BreakStatement':
                return 'break;';
            case 'ContinueStatement':
                return 'continue;';
            case 'TryStatement':
                return this.generateTryStatement(statement);
            case 'ImportStatement':
                return this.generateImportStatement(statement);
            case 'IncrementStatement':
                return this.generateIncrementStatement(statement);
            case 'CompoundAssignment':
                return this.generateCompoundAssignment(statement);
            case 'EnumDeclaration':
                return this.generateEnumDeclaration(statement);
            case 'StructDeclaration':
                return this.generateStructDeclaration(statement);
        }
    }
    generateEnumDeclaration(decl) {
        const variants = decl.variants.map(v => `${v}: '${v}'`).join(', ');
        const prefix = decl.exported ? 'export ' : '';
        return `${prefix}const ${decl.name} = Object.freeze({ ${variants} });`;
    }
    generateStructDeclaration(decl) {
        const prefix = decl.exported ? 'export ' : '';
        const fieldNames = decl.fields.map(f => f.name).join(', ');
        // Constructor
        const constructorBody = decl.fields
            .map(f => `    this.${f.name} = ${f.name};`)
            .join('\n');
        // Methods
        const methods = decl.methods.map(m => this.generateStructMethod(m, decl)).join('\n');
        return `${prefix}class ${decl.name} {
  constructor(${fieldNames}) {
${constructorBody}
  }
${methods}
}`;
    }
    generateStructMethod(method, structDecl) {
        const params = method.parameters.map(p => p.name).join(', ');
        const isNonVoid = method.returnType !== 'void';
        // Generate body statements
        const bodyLines = method.body.map(s => {
            // Replace field access with this.field
            const stmt = this.generateStatement(s);
            return '    ' + this.replaceFieldsWithThis(stmt, structDecl);
        });
        // Add return statement if there's a final return expression
        if (method.returnExpression) {
            const returnExpr = this.generateExpression(method.returnExpression);
            const withThis = this.replaceFieldsWithThis(returnExpr, structDecl);
            bodyLines.push('    return ' + withThis + ';');
        }
        const body = bodyLines.join('\n');
        return `  ${method.name}(${params}) {\n${body}\n  }`;
    }
    replaceFieldsWithThis(code, structDecl) {
        // Replace field names with this.field
        // Be careful to only replace standalone identifiers, not parts of other words
        let result = code;
        for (const field of structDecl.fields) {
            // Match the field name as a standalone identifier (not part of another word)
            // Use negative lookbehind and lookahead to avoid matching parts of other identifiers
            const regex = new RegExp(`(?<![a-zA-Z0-9_\\.])${field.name}(?![a-zA-Z0-9_])`, 'g');
            result = result.replace(regex, `this.${field.name}`);
        }
        return result;
    }
    generateTryStatement(stmt) {
        const tryBody = stmt.tryBody.map(s => '  ' + this.generateStatement(s)).join('\n');
        const catchBody = stmt.catchBody.map(s => '  ' + this.generateStatement(s)).join('\n');
        return `try {\n${tryBody}\n} catch (${stmt.catchVariable}) {\n${catchBody}\n}`;
    }
    generateImportStatement(stmt) {
        // Add .js extension to the source path
        const sourcePath = stmt.source.endsWith('.js') ? stmt.source : stmt.source + '.js';
        if (stmt.namespace) {
            // Namespace import: import * as name from "path"
            return `import * as ${stmt.namespace} from "${sourcePath}";`;
        }
        // Destructured import: import { a, b as c } from "path"
        const specifiers = stmt.specifiers.map(spec => {
            if (spec.alias) {
                return `${spec.name} as ${spec.alias}`;
            }
            return spec.name;
        }).join(', ');
        return `import { ${specifiers} } from "${sourcePath}";`;
    }
    generateIndexAssignment(stmt) {
        const array = this.generateExpression(stmt.array);
        const index = this.generateExpression(stmt.index);
        const value = this.generateExpression(stmt.value);
        return `${array}[${index}] = ${value};`;
    }
    generateFieldAssignment(stmt) {
        const object = this.generateExpression(stmt.object);
        const value = this.generateExpression(stmt.value);
        return `${object}.${stmt.field} = ${value};`;
    }
    generateVariableDeclaration(decl) {
        const exportPrefix = decl.exported ? 'export ' : '';
        const keyword = decl.mutability === 'immutable' ? 'const' : 'let';
        const value = this.generateExpression(decl.value);
        return `${exportPrefix}${keyword} ${decl.name} = ${value};`;
    }
    generateAssignment(assignment) {
        const value = this.generateExpression(assignment.value);
        return `${assignment.name} = ${value};`;
    }
    generateIncrementStatement(stmt) {
        return `${stmt.name}${stmt.operator};`;
    }
    generateCompoundAssignment(stmt) {
        const value = this.generateExpression(stmt.value);
        return `${stmt.name} ${stmt.operator} ${value};`;
    }
    generatePrintStatement(print) {
        const value = this.generateExpression(print.expression);
        return `console.log(${value});`;
    }
    generateErrorStatement(error) {
        const value = this.generateExpression(error.expression);
        return `console.error(${value});`;
    }
    generateThrowStatement(stmt) {
        const value = this.generateExpression(stmt.expression);
        return `throw ${value};`;
    }
    generateWhileStatement(stmt) {
        const condition = this.generateExpression(stmt.condition);
        const body = stmt.body.map(s => '  ' + this.generateStatement(s)).join('\n');
        return `while (${condition}) {\n${body}\n}`;
    }
    generateForStatement(stmt) {
        const start = this.generateExpression(stmt.start);
        const end = this.generateExpression(stmt.end);
        const v = stmt.variable;
        const body = stmt.body.map(s => '  ' + this.generateStatement(s)).join('\n');
        // Handle both forward (1..5) and reverse (5..1) loops
        return `for (let __start = ${start}, __end = ${end}, ${v} = __start; __start <= __end ? ${v} <= __end : ${v} >= __end; __start <= __end ? ${v}++ : ${v}--) {\n${body}\n}`;
    }
    generateIfStatement(stmt) {
        const lines = [];
        // if branch
        const ifCondition = this.generateExpression(stmt.ifBranch.condition);
        const ifBody = stmt.ifBranch.body.map(s => '  ' + this.generateStatement(s)).join('\n');
        lines.push(`if (${ifCondition}) {\n${ifBody}\n}`);
        // else-if branches
        for (const branch of stmt.elseIfBranches) {
            const condition = this.generateExpression(branch.condition);
            const body = branch.body.map(s => '  ' + this.generateStatement(s)).join('\n');
            lines.push(` else if (${condition}) {\n${body}\n}`);
        }
        // else branch
        if (stmt.elseBranch) {
            const body = stmt.elseBranch.map(s => '  ' + this.generateStatement(s)).join('\n');
            lines.push(` else {\n${body}\n}`);
        }
        return lines.join('');
    }
    generateFunctionDeclaration(decl) {
        // Store parameter names for named argument resolution
        this.functionParams.set(decl.name, decl.parameters.map(p => p.name));
        const exportPrefix = decl.exported ? 'export ' : '';
        const params = decl.parameters.map(p => p.name).join(', ');
        const isNonVoid = decl.returnType !== 'void';
        // Generate body statements, converting expression statements to returns in non-void functions
        const bodyLines = decl.body.map(s => {
            if (isNonVoid && s.type === 'ExpressionStatement') {
                return '  return ' + this.generateExpression(s.expression) + ';';
            }
            return '  ' + this.generateStatement(s);
        });
        // Add return statement if there's a final return expression
        if (decl.returnExpression) {
            bodyLines.push('  return ' + this.generateExpression(decl.returnExpression) + ';');
        }
        const body = bodyLines.join('\n');
        return `${exportPrefix}function ${decl.name}(${params}) {\n${body}\n}`;
    }
    generateExpression(expr) {
        switch (expr.type) {
            case 'StringLiteral':
                return JSON.stringify(expr.value);
            case 'NumberLiteral':
                return expr.value.toString();
            case 'BoolLiteral':
                return expr.value.toString();
            case 'NullLiteral':
                return 'null';
            case 'Identifier':
                return expr.name;
            case 'BinaryExpression': {
                const left = this.generateExpression(expr.left);
                const right = this.generateExpression(expr.right);
                return `(${left} ${expr.operator} ${right})`;
            }
            case 'UnaryExpression': {
                const operand = this.generateExpression(expr.operand);
                return `(${expr.operator}${operand})`;
            }
            case 'InterpolatedString': {
                // Generate JS template literal
                let result = '`';
                for (const part of expr.parts) {
                    if (part.kind === 'text') {
                        // Escape backticks and ${} in text
                        result += part.value
                            .replace(/\\/g, '\\\\')
                            .replace(/`/g, '\\`')
                            .replace(/\$/g, '\\$');
                    }
                    else {
                        result += '${' + this.generateExpression(part.value) + '}';
                    }
                }
                result += '`';
                return result;
            }
            case 'CastExpression': {
                const inner = this.generateExpression(expr.expression);
                // Tuple cast: tiN(value) or tiN([1,2,3])
                if (isTupleType(expr.targetType)) {
                    // Convert to frozen array: single value becomes [value], array becomes copy
                    return `Object.freeze(Array.isArray(${inner}) ? [...${inner}] : [${inner}])`;
                }
                // Array cast from tuple: i[]((1,2,3))
                if (isArrayType(expr.targetType)) {
                    // Spread the tuple/array into a new mutable array
                    return `[...${inner}]`;
                }
                // Primitive casts
                switch (expr.targetType) {
                    case 'string':
                        return `String(${inner})`;
                    case 'int':
                        return `Math.trunc(Number(${inner}))`;
                    case 'float':
                        return `Number(${inner})`;
                    case 'bool':
                        return `Boolean(${inner})`;
                }
                return inner; // fallback
            }
            case 'FunctionCall': {
                const paramNames = this.functionParams.get(expr.name);
                if (paramNames) {
                    // Reorder arguments based on parameter names
                    const argMap = new Map();
                    const positionalArgs = [];
                    for (const arg of expr.arguments) {
                        if (arg.name) {
                            argMap.set(arg.name, this.generateExpression(arg.value));
                        }
                        else {
                            positionalArgs.push(this.generateExpression(arg.value));
                        }
                    }
                    // Build final argument list in parameter order
                    const finalArgs = [];
                    for (let i = 0; i < paramNames.length; i++) {
                        const paramName = paramNames[i];
                        if (i < positionalArgs.length) {
                            finalArgs.push(positionalArgs[i]);
                        }
                        else if (argMap.has(paramName)) {
                            finalArgs.push(argMap.get(paramName));
                        }
                    }
                    return `${expr.name}(${finalArgs.join(', ')})`;
                }
                else {
                    // Unknown function (e.g., built-in), just pass args in order
                    const args = expr.arguments.map(arg => this.generateExpression(arg.value)).join(', ');
                    return `${expr.name}(${args})`;
                }
            }
            case 'ArrayLiteral': {
                const elements = expr.elements.map(e => this.generateExpression(e)).join(', ');
                return `[${elements}]`;
            }
            case 'TupleLiteral': {
                const elements = expr.elements.map(e => this.generateExpression(e)).join(', ');
                return `Object.freeze([${elements}])`;
            }
            case 'RangeExpression': {
                // Generate a range array: 5..8 => Array.from({length: 8-5+1}, (_, i) => 5 + i)
                const start = this.generateExpression(expr.start);
                const end = this.generateExpression(expr.end);
                return `Array.from({length: (${end}) - (${start}) + 1}, (_, i) => (${start}) + i)`;
            }
            case 'IndexAccess': {
                const array = this.generateExpression(expr.array);
                const index = this.generateExpression(expr.index);
                return `${array}[${index}]`;
            }
            case 'MethodCall': {
                const object = this.generateExpression(expr.object);
                const args = expr.arguments.map(a => this.generateExpression(a)).join(', ');
                // Built-in methods map to JS equivalents
                const builtinMethods = ['len', 'push', 'pop', 'at'];
                if (builtinMethods.includes(expr.method)) {
                    switch (expr.method) {
                        case 'len':
                            return `${object}.length`;
                        case 'push':
                            return `${object}.push(${args})`;
                        case 'pop':
                            return `${object}.pop()`;
                        case 'at':
                            return `${object}.charAt(${args})`;
                    }
                }
                // Check if this is a struct method (keep as method call, not UFCS)
                for (const [, methods] of this.structMethods) {
                    if (methods.has(expr.method)) {
                        // Struct method: object.method(args)
                        if (args) {
                            return `${object}.${expr.method}(${args})`;
                        }
                        else {
                            return `${object}.${expr.method}()`;
                        }
                    }
                }
                // UFCS: non-builtin methods become function calls
                // str.upper() → upper(str)
                // str.split(",") → split(str, ",")
                if (args) {
                    return `${expr.method}(${object}, ${args})`;
                }
                else {
                    return `${expr.method}(${object})`;
                }
            }
            case 'MemberExpression': {
                const object = this.generateExpression(expr.object);
                return `${object}.${expr.property}`;
            }
            case 'EnumAccess': {
                return `${expr.enumName}.${expr.variant}`;
            }
            case 'StructInstantiation': {
                const fieldNames = this.structFields.get(expr.structName);
                if (fieldNames) {
                    // Reorder arguments based on field names
                    const argMap = new Map();
                    const positionalArgs = [];
                    for (const arg of expr.arguments) {
                        if (arg.name) {
                            argMap.set(arg.name, this.generateExpression(arg.value));
                        }
                        else {
                            positionalArgs.push(this.generateExpression(arg.value));
                        }
                    }
                    // Build final argument list in field order
                    const finalArgs = [];
                    for (let i = 0; i < fieldNames.length; i++) {
                        const fieldName = fieldNames[i];
                        if (i < positionalArgs.length) {
                            finalArgs.push(positionalArgs[i]);
                        }
                        else if (argMap.has(fieldName)) {
                            finalArgs.push(argMap.get(fieldName));
                        }
                    }
                    return `new ${expr.structName}(${finalArgs.join(', ')})`;
                }
                else {
                    // Unknown struct, just pass args in order
                    const args = expr.arguments.map(arg => this.generateExpression(arg.value)).join(', ');
                    return `new ${expr.structName}(${args})`;
                }
            }
        }
    }
}
