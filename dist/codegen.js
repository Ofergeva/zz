// JavaScript Code Generator for ZZ Language
import * as path from "path";
import { isArrayType, isTupleType, isJType, } from "./ast.js";
export class CodeGenerator {
    // Store function parameter info for named argument reordering
    functionParams = new Map();
    // Store struct field info for constructor argument reordering
    structFields = new Map();
    // Store struct method names to distinguish from UFCS
    structMethods = new Map();
    options;
    // Track whether any SpawnExpression exists (for auto-import)
    hasSpawn = false;
    constructor(options) {
        this.options = options;
    }
    generate(program) {
        this.functionParams.clear();
        this.structFields.clear();
        this.structMethods.clear();
        this.hasSpawn = false;
        // Register built-in struct methods (Spawn)
        this.structMethods.set("Spawn", new Set(["onError"]));
        // First pass: collect struct info
        for (const statement of program.statements) {
            if (statement.type === "StructDeclaration") {
                this.structFields.set(statement.name, statement.fields.map((f) => f.name));
                const methods = new Set(statement.methods.map((m) => m.name));
                this.structMethods.set(statement.name, methods);
            }
        }
        const lines = [];
        for (const statement of program.statements) {
            lines.push(this.generateStatement(statement));
        }
        let output = lines.join("\n");
        if (this.hasSpawn) {
            // Calculate relative path from output to std/spawn.js
            let spawnImport;
            if (this.options) {
                const absStdSpawn = path.join(this.options.stdLibDir, "spawn.js");
                const relPath = path.relative(this.options.outputDir, absStdSpawn);
                const normalized = relPath.split(path.sep).join("/");
                const importPath = normalized.startsWith(".") ? normalized : "./" + normalized;
                spawnImport = `import { Spawn } from "${importPath}";`;
            }
            else {
                spawnImport = `import { Spawn } from "./std/spawn.js";`;
            }
            output = spawnImport + "\n" + output;
        }
        return output;
    }
    generateStatement(statement) {
        switch (statement.type) {
            case "VariableDeclaration":
                return this.generateVariableDeclaration(statement);
            case "Assignment":
                return this.generateAssignment(statement);
            case "PrintStatement":
                return this.generatePrintStatement(statement);
            case "ErrorStatement":
                return this.generateErrorStatement(statement);
            case "ThrowStatement":
                return this.generateThrowStatement(statement);
            case "WhileStatement":
                return this.generateWhileStatement(statement);
            case "ForStatement":
                return this.generateForStatement(statement);
            case "ForEachStatement":
                return this.generateForEachStatement(statement);
            case "IfStatement":
                return this.generateIfStatement(statement);
            case "FunctionDeclaration":
                return this.generateFunctionDeclaration(statement);
            case "ExpressionStatement":
                return this.generateExpression(statement.expression) + ";";
            case "IndexAssignment":
                return this.generateIndexAssignment(statement);
            case "FieldAssignment":
                return this.generateFieldAssignment(statement);
            case "BreakStatement":
                return "break;";
            case "ContinueStatement":
                return "continue;";
            case "TryStatement":
                return this.generateTryStatement(statement);
            case "ImportStatement":
                return this.generateImportStatement(statement);
            case "IncrementStatement":
                return this.generateIncrementStatement(statement);
            case "CompoundAssignment":
                return this.generateCompoundAssignment(statement);
            case "EnumDeclaration":
                return this.generateEnumDeclaration(statement);
            case "StructDeclaration":
                return this.generateStructDeclaration(statement);
            case "MatchExpression":
                return this.generateMatchExpression(statement);
            case "JSBlockStatement":
                return statement.code;
            case "CompTimeFunctionDeclaration":
                // Compile-time functions are not emitted to output
                return "";
        }
    }
    generateEnumDeclaration(decl) {
        const variants = decl.variants.map((v) => `${v}: '${v}'`).join(", ");
        const prefix = decl.exported ? "export " : "";
        return `${prefix}const ${decl.name} = Object.freeze({ ${variants} });`;
    }
    generateStructDeclaration(decl) {
        const prefix = decl.exported ? "export " : "";
        const fieldNames = decl.fields.map((f) => f.name).join(", ");
        // Constructor
        const constructorBody = decl.fields.map((f) => `    this.${f.name} = ${f.name};`).join("\n");
        // Methods
        const methods = decl.methods.map((m) => this.generateStructMethod(m, decl)).join("\n");
        return `${prefix}class ${decl.name} {
  constructor(${fieldNames}) {
${constructorBody}
  }
${methods}
}`;
    }
    generateStructMethod(method, structDecl) {
        const params = method.parameters.map((p) => p.name).join(", ");
        const isNonVoid = method.returnType !== "void";
        // Generate body statements
        const bodyLines = method.body.map((s) => {
            // Replace field access with this.field
            const stmt = this.generateStatement(s);
            return "    " + this.replaceFieldsWithThis(stmt, structDecl);
        });
        // Add return statement if there's a final return expression
        if (method.returnExpression) {
            const returnExpr = this.generateExpression(method.returnExpression);
            const withThis = this.replaceFieldsWithThis(returnExpr, structDecl);
            bodyLines.push("    return " + withThis + ";");
        }
        const body = bodyLines.join("\n");
        return `  async ${method.name}(${params}) {\n${body}\n  }`;
    }
    replaceFieldsWithThis(code, structDecl) {
        // Replace field names with this.field
        // Be careful to only replace standalone identifiers, not parts of other words
        let result = code;
        for (const field of structDecl.fields) {
            // Match the field name as a standalone identifier (not part of another word)
            // Use negative lookbehind and lookahead to avoid matching parts of other identifiers
            const regex = new RegExp(`(?<![a-zA-Z0-9_\\.])${field.name}(?![a-zA-Z0-9_])`, "g");
            result = result.replace(regex, `this.${field.name}`);
        }
        return result;
    }
    generateTryStatement(stmt) {
        const tryBody = stmt.tryBody.map((s) => "  " + this.generateStatement(s)).join("\n");
        const catchBody = stmt.catchBody.map((s) => "  " + this.generateStatement(s)).join("\n");
        return `try {\n${tryBody}\n} catch (${stmt.catchVariable}) {\n${catchBody}\n}`;
    }
    generateImportStatement(stmt) {
        let resolvedPath;
        if (this.options) {
            if (stmt.isStdLib) {
                // std/string → <stdLibDir>/string → relative to outputDir
                const moduleName = stmt.source.replace(/^std\//, "");
                const absTarget = path.join(this.options.stdLibDir, moduleName);
                resolvedPath = path.relative(this.options.outputDir, absTarget);
            }
            else {
                // "./lib/math" → resolve against sourceDir → relative to outputDir
                const absTarget = path.resolve(this.options.sourceDir, stmt.source);
                resolvedPath = path.relative(this.options.outputDir, absTarget);
            }
            // Ensure starts with ./ or ../
            if (!resolvedPath.startsWith(".")) {
                resolvedPath = "./" + resolvedPath;
            }
            // Normalize path separators for JS imports
            resolvedPath = resolvedPath.split(path.sep).join("/");
        }
        else {
            resolvedPath = stmt.source;
        }
        // Normalize extension: strip .js/.zz if present, always append .js
        resolvedPath = resolvedPath.replace(/\.(js|zz)$/, "") + ".js";
        if (stmt.namespace) {
            return `import * as ${stmt.namespace} from "${resolvedPath}";`;
        }
        const specifiers = stmt.specifiers
            .map((spec) => {
            if (spec.alias) {
                return `${spec.name} as ${spec.alias}`;
            }
            return spec.name;
        })
            .join(", ");
        return `import { ${specifiers} } from "${resolvedPath}";`;
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
        const exportPrefix = decl.exported ? "export " : "";
        const keyword = decl.mutability === "immutable" ? "const" : "let";
        let value = this.generateExpression(decl.value);
        if (isJType(decl.dataType) && decl.mutability === "immutable") {
            value = `Object.freeze(${value})`;
        }
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
        const body = stmt.body.map((s) => "  " + this.generateStatement(s)).join("\n");
        return `while (${condition}) {\n${body}\n}`;
    }
    generateForStatement(stmt) {
        const start = this.generateExpression(stmt.start);
        const end = this.generateExpression(stmt.end);
        const v = stmt.variable;
        const body = stmt.body.map((s) => "  " + this.generateStatement(s)).join("\n");
        // Handle both forward (1..5) and reverse (5..1) loops
        return `for (let __start = ${start}, __end = ${end}, ${v} = __start; __start <= __end ? ${v} <= __end : ${v} >= __end; __start <= __end ? ${v}++ : ${v}--) {\n${body}\n}`;
    }
    generateForEachStatement(stmt) {
        const iterable = this.generateExpression(stmt.iterable);
        const v = stmt.variable;
        const body = stmt.body.map((s) => "  " + this.generateStatement(s)).join("\n");
        return `for (const ${v} of ${iterable}) {\n${body}\n}`;
    }
    generateIfStatement(stmt) {
        const lines = [];
        // if branch
        const ifCondition = this.generateExpression(stmt.ifBranch.condition);
        const ifBody = stmt.ifBranch.body.map((s) => "  " + this.generateStatement(s)).join("\n");
        lines.push(`if (${ifCondition}) {\n${ifBody}\n}`);
        // else-if branches
        for (const branch of stmt.elseIfBranches) {
            const condition = this.generateExpression(branch.condition);
            const body = branch.body.map((s) => "  " + this.generateStatement(s)).join("\n");
            lines.push(` else if (${condition}) {\n${body}\n}`);
        }
        // else branch
        if (stmt.elseBranch) {
            const body = stmt.elseBranch.map((s) => "  " + this.generateStatement(s)).join("\n");
            lines.push(` else {\n${body}\n}`);
        }
        return lines.join("");
    }
    generateFunctionDeclaration(decl) {
        // Store parameter names for named argument resolution
        this.functionParams.set(decl.name, decl.parameters.map((p) => p.name));
        const exportPrefix = decl.exported ? "export " : "";
        const params = decl.parameters.map((p) => p.name).join(", ");
        // Generate body statements
        const bodyLines = decl.body.map((s) => {
            return "  " + this.generateStatement(s);
        });
        // Add return statement if there's a final return expression
        if (decl.returnExpression) {
            bodyLines.push("  return " + this.generateExpression(decl.returnExpression) + ";");
        }
        const body = bodyLines.join("\n");
        return `${exportPrefix}async function ${decl.name}(${params}) {\n${body}\n}`;
    }
    generateFunctionCallCode(expr) {
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
            return `${expr.name}(${finalArgs.join(", ")})`;
        }
        else {
            // Unknown function (e.g., built-in), just pass args in order
            const args = expr.arguments.map((arg) => this.generateExpression(arg.value)).join(", ");
            return `${expr.name}(${args})`;
        }
    }
    generateExpression(expr) {
        switch (expr.type) {
            case "StringLiteral":
                return JSON.stringify(expr.value);
            case "NumberLiteral":
                return expr.value.toString();
            case "BoolLiteral":
                return expr.value.toString();
            case "NullLiteral":
                return "null";
            case "Identifier":
                return expr.name;
            case "BinaryExpression": {
                const left = this.generateExpression(expr.left);
                const right = this.generateExpression(expr.right);
                return `(${left} ${expr.operator} ${right})`;
            }
            case "UnaryExpression": {
                const operand = this.generateExpression(expr.operand);
                return `(${expr.operator}${operand})`;
            }
            case "InterpolatedString": {
                // Generate JS template literal
                let result = "`";
                for (const part of expr.parts) {
                    if (part.kind === "text") {
                        // Escape backticks and ${} in text
                        result += part.value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
                    }
                    else {
                        result += "${" + this.generateExpression(part.value) + "}";
                    }
                }
                result += "`";
                return result;
            }
            case "CastExpression": {
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
                    case "string":
                        return `String(${inner})`;
                    case "int":
                        return `Math.trunc(Number(${inner}))`;
                    case "float":
                        return `Number(${inner})`;
                    case "bool":
                        return `Boolean(${inner})`;
                }
                return inner; // fallback
            }
            case "FunctionCall": {
                return "await " + this.generateFunctionCallCode(expr);
            }
            case "ArrayLiteral": {
                const elements = expr.elements.map((e) => this.generateExpression(e)).join(", ");
                return `[${elements}]`;
            }
            case "TupleLiteral": {
                const elements = expr.elements.map((e) => this.generateExpression(e)).join(", ");
                return `Object.freeze([${elements}])`;
            }
            case "RangeExpression": {
                // Generate a range array: 5..8 => Array.from({length: 8-5+1}, (_, i) => 5 + i)
                const start = this.generateExpression(expr.start);
                const end = this.generateExpression(expr.end);
                return `Array.from({length: (${end}) - (${start}) + 1}, (_, i) => (${start}) + i)`;
            }
            case "IndexAccess": {
                const array = this.generateExpression(expr.array);
                const index = this.generateExpression(expr.index);
                return `${array}[${index}]`;
            }
            case "MethodCall": {
                const object = this.generateExpression(expr.object);
                const args = expr.arguments.map((a) => this.generateExpression(a)).join(", ");
                // Built-in methods map to JS equivalents
                const builtinMethods = ["len", "push", "pop", "at", "has", "get", "set"];
                if (builtinMethods.includes(expr.method)) {
                    switch (expr.method) {
                        case "len":
                            return `${object}.length`;
                        case "push":
                            return `await ${object}.push(${args})`;
                        case "pop":
                            return `await ${object}.pop()`;
                        case "at":
                            return `await ${object}.charAt(${args})`;
                        case "has":
                            return `(${args} in ${object})`;
                        case "get":
                            return `${object}[${args}]`;
                        case "set": {
                            const setArgs = expr.arguments.map((a) => this.generateExpression(a));
                            return `(${object}[${setArgs[0]}] = ${setArgs[1]})`;
                        }
                    }
                }
                // Check if this is a struct method (keep as method call, not UFCS)
                for (const [, methods] of this.structMethods) {
                    if (methods.has(expr.method)) {
                        // Struct method: object.method(args)
                        if (args) {
                            return `await ${object}.${expr.method}(${args})`;
                        }
                        else {
                            return `await ${object}.${expr.method}()`;
                        }
                    }
                }
                // UFCS: non-builtin methods become function calls
                // str.upper() → upper(str)
                // str.split(",") → split(str, ",")
                if (args) {
                    return `await ${expr.method}(${object}, ${args})`;
                }
                else {
                    return `await ${expr.method}(${object})`;
                }
            }
            case "MemberExpression": {
                const object = this.generateExpression(expr.object);
                return `${object}.${expr.property}`;
            }
            case "EnumAccess": {
                return `${expr.enumName}.${expr.variant}`;
            }
            case "StructInstantiation": {
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
                    return `new ${expr.structName}(${finalArgs.join(", ")})`;
                }
                else {
                    // Unknown struct, just pass args in order
                    const args = expr.arguments.map((arg) => this.generateExpression(arg.value)).join(", ");
                    return `new ${expr.structName}(${args})`;
                }
            }
            case "JLiteral": {
                const fields = expr.fields
                    .map((f) => `${f.key}: ${this.generateExpression(f.value)}`)
                    .join(", ");
                return `{${fields}}`;
            }
            case "MatchExpression":
                return this.generateMatchExpression(expr);
            case "SpawnExpression": {
                this.hasSpawn = true;
                if (expr.call.type === "FunctionCall") {
                    return `new Spawn(${this.generateFunctionCallCode(expr.call)})`;
                }
                else {
                    // MethodCall — generate without await
                    return `new Spawn(${this.generateMethodCallCodeWithoutAwait(expr.call)})`;
                }
            }
            case "CompTimeExpression": {
                // The evaluator should have set evaluatedValue
                if (expr.evaluatedValue) {
                    return this.serializeCompTimeValue(expr.evaluatedValue);
                }
                // Fallback: if not evaluated, emit null (shouldn't happen if evaluator ran)
                return "null";
            }
        }
    }
    serializeCompTimeValue(value) {
        switch (value.kind) {
            case "int":
            case "float":
                return value.value.toString();
            case "string":
                return JSON.stringify(value.value);
            case "bool":
                return value.value.toString();
            case "null":
                return "null";
            case "array":
                return `[${value.values.map((v) => this.serializeCompTimeValue(v)).join(", ")}]`;
            case "tuple":
                return `Object.freeze([${value.values.map((v) => this.serializeCompTimeValue(v)).join(", ")}])`;
            case "j": {
                const fields = value.fields
                    .map((f) => `${JSON.stringify(f.key)}: ${this.serializeCompTimeValue(f.value)}`)
                    .join(", ");
                return `{${fields}}`;
            }
        }
    }
    generateMethodCallCodeWithoutAwait(expr) {
        const object = this.generateExpression(expr.object);
        const args = expr.arguments.map((a) => this.generateExpression(a)).join(", ");
        // Built-in methods map to JS equivalents
        const builtinMethods = ["len", "push", "pop", "at", "has", "get", "set"];
        if (builtinMethods.includes(expr.method)) {
            switch (expr.method) {
                case "len":
                    return `${object}.length`;
                case "push":
                    return `${object}.push(${args})`;
                case "pop":
                    return `${object}.pop()`;
                case "at":
                    return `${object}.charAt(${args})`;
                case "has":
                    return `(${args} in ${object})`;
                case "get":
                    return `${object}[${args}]`;
                case "set": {
                    const setArgs = expr.arguments.map((a) => this.generateExpression(a));
                    return `(${object}[${setArgs[0]}] = ${setArgs[1]})`;
                }
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
    generateMatchExpression(match) {
        const value = this.generateExpression(match.value);
        const tempVar = `__match_${match.line}`;
        const lines = [];
        lines.push(`(function() {`);
        lines.push(`  const ${tempVar} = ${value};`);
        let first = true;
        for (const arm of match.arms) {
            const cond = this.generatePatternCondition(arm.pattern, tempVar, arm.guard);
            const keyword = first ? "if" : " else if";
            first = false;
            lines.push(`  ${keyword} (${cond}) {`);
            // Generate bindings
            for (const binding of this.generatePatternBindings(arm.pattern, tempVar)) {
                lines.push(`    ${binding}`);
            }
            // Generate body statements
            for (const stmt of arm.body) {
                lines.push(`    ${this.generateStatement(stmt)}`);
            }
            // Generate result expression if present
            if (arm.resultExpression) {
                lines.push(`    return ${this.generateExpression(arm.resultExpression)};`);
            }
            lines.push(`  }`);
        }
        lines.push(`})();`);
        return lines.join("\n");
    }
    generatePatternCondition(pattern, tempVar, guard) {
        let cond;
        switch (pattern.kind) {
            case "wildcard":
            case "binding":
                cond = "true";
                break;
            case "enum":
                cond = `${tempVar} === ${pattern.enumName}.${pattern.variant}`;
                break;
            case "literal":
                cond = `${tempVar} === ${this.generateExpression(pattern.value)}`;
                break;
            case "struct": {
                const structConds = [];
                const fieldNames = this.structFields.get(pattern.structName);
                if (fieldNames) {
                    pattern.fields.forEach((f, i) => {
                        if (f.pattern?.kind === "literal") {
                            structConds.push(`${tempVar}.${fieldNames[i]} === ${this.generateExpression(f.pattern.value)}`);
                        }
                    });
                }
                cond = structConds.length > 0 ? structConds.join(" && ") : "true";
                break;
            }
            case "tuple": {
                const tupleConds = [];
                pattern.elements.forEach((e, i) => {
                    if (e.pattern?.kind === "literal") {
                        tupleConds.push(`${tempVar}[${i}] === ${this.generateExpression(e.pattern.value)}`);
                    }
                });
                cond = tupleConds.length > 0 ? tupleConds.join(" && ") : "true";
                break;
            }
            case "j": {
                const jConds = [];
                for (const field of pattern.fields) {
                    jConds.push(`"${field.key}" in ${tempVar}`);
                    if (field.pattern?.kind === "literal") {
                        jConds.push(`${tempVar}.${field.key} === ${this.generateExpression(field.pattern.value)}`);
                    }
                    if (field.pattern?.kind === "j") {
                        const nestedCond = this.generatePatternCondition(field.pattern, `${tempVar}.${field.key}`);
                        jConds.push(nestedCond);
                    }
                }
                cond = jConds.length > 0 ? jConds.join(" && ") : "true";
                break;
            }
        }
        if (guard) {
            // Generate guard code and replace binding names with accessor expressions
            let guardCode = this.generateExpression(guard);
            guardCode = this.substituteBindingsInGuard(guardCode, pattern, tempVar);
            cond = `(${cond}) && (${guardCode})`;
        }
        return cond;
    }
    substituteBindingsInGuard(guardCode, pattern, tempVar) {
        switch (pattern.kind) {
            case "binding":
                // Replace the binding name with the temp variable
                const bindingRegex = new RegExp(`(?<![a-zA-Z0-9_])${pattern.name}(?![a-zA-Z0-9_])`, "g");
                return guardCode.replace(bindingRegex, tempVar);
            case "struct": {
                let result = guardCode;
                const fieldNames = this.structFields.get(pattern.structName);
                if (fieldNames) {
                    pattern.fields.forEach((f, i) => {
                        if (f.binding) {
                            const regex = new RegExp(`(?<![a-zA-Z0-9_])${f.binding}(?![a-zA-Z0-9_])`, "g");
                            result = result.replace(regex, `${tempVar}.${fieldNames[i]}`);
                        }
                    });
                }
                return result;
            }
            case "tuple": {
                let result = guardCode;
                pattern.elements.forEach((e, i) => {
                    if (e.binding) {
                        const regex = new RegExp(`(?<![a-zA-Z0-9_])${e.binding}(?![a-zA-Z0-9_])`, "g");
                        result = result.replace(regex, `${tempVar}[${i}]`);
                    }
                });
                return result;
            }
            case "j": {
                let result = guardCode;
                for (const field of pattern.fields) {
                    if (field.binding) {
                        const regex = new RegExp(`(?<![a-zA-Z0-9_])${field.binding}(?![a-zA-Z0-9_])`, "g");
                        result = result.replace(regex, `${tempVar}.${field.key}`);
                    }
                }
                return result;
            }
            default:
                return guardCode;
        }
    }
    generatePatternBindings(pattern, tempVar) {
        const bindings = [];
        switch (pattern.kind) {
            case "binding":
                bindings.push(`const ${pattern.name} = ${tempVar};`);
                break;
            case "struct": {
                const fieldNames = this.structFields.get(pattern.structName);
                if (fieldNames) {
                    pattern.fields.forEach((f, i) => {
                        if (f.binding) {
                            bindings.push(`const ${f.binding} = ${tempVar}.${fieldNames[i]};`);
                        }
                    });
                }
                break;
            }
            case "tuple":
                pattern.elements.forEach((e, i) => {
                    if (e.binding) {
                        bindings.push(`const ${e.binding} = ${tempVar}[${i}];`);
                    }
                });
                break;
            case "j":
                for (const field of pattern.fields) {
                    if (field.binding) {
                        bindings.push(`const ${field.binding} = ${tempVar}.${field.key};`);
                    }
                    if (field.pattern?.kind === "j") {
                        bindings.push(...this.generatePatternBindings(field.pattern, `${tempVar}.${field.key}`));
                    }
                }
                break;
        }
        return bindings;
    }
}
