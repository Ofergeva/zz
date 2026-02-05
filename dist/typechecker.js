// Type Checker for ZZ Language
import { isArrayType, isTupleType, isPrimitiveType, isEnumType, isStructType, isJType, isArrayElementType, } from "./ast.js";
import { formatError } from "./errors.js";
export class TypeChecker {
    variables = new Map();
    functions = new Map();
    enums = new Map(); // enum name -> variants
    structs = new Map(); // struct name -> info
    errors = [];
    loopDepth = 0; // Track if we're inside a loop
    currentStructName = null; // Track current struct for method body checking
    moduleTypes;
    // Compile-time execution tracking
    comptimeContext = false; // True when inside ${} or $Z body
    comptimeFunctions = new Map(); // $Z function declarations
    comptimeVariables = new Map(); // Variables declared in CT context
    source = ""; // Source code for error formatting
    constructor(moduleTypes) {
        this.moduleTypes = moduleTypes ?? new Map();
    }
    // Push error with source context
    pushError(message, line, column) {
        if (this.source) {
            this.errors.push(formatError(message, this.source, { line, column }));
        }
        else {
            this.errors.push(`${message} at line ${line}${column ? `, column ${column}` : ''}.`);
        }
    }
    check(program, source) {
        this.variables.clear();
        this.functions.clear();
        this.enums.clear();
        this.structs.clear();
        this.errors = [];
        this.source = source || "";
        // Register Spawn as a built-in struct type (for ~> operator)
        this.structs.set("Spawn", {
            fields: [],
            methods: new Map([["onError", { parameters: [{ dataType: "string", name: "handler" }], returnType: { kind: "struct", name: "Spawn" } }]]),
            line: 0,
        });
        // First pass: collect enum, struct, and compile-time function declarations
        for (const statement of program.statements) {
            if (statement.type === "EnumDeclaration") {
                this.registerEnum(statement);
            }
            else if (statement.type === "StructDeclaration") {
                this.registerStruct(statement);
            }
            else if (statement.type === "CompTimeFunctionDeclaration") {
                this.registerCompTimeFunction(statement);
            }
        }
        // Second pass: check all statements
        for (const statement of program.statements) {
            this.checkStatement(statement);
        }
        return this.errors;
    }
    registerEnum(decl) {
        if (this.enums.has(decl.name)) {
            this.pushError(`Duplicate enum declaration '${decl.name}'`, decl.line);
            return;
        }
        // Check for duplicate variants
        const variantSet = new Set();
        for (const variant of decl.variants) {
            if (variantSet.has(variant)) {
                this.errors.push(`Duplicate variant '${variant}' in enum '${decl.name}' at line ${decl.line}.`);
            }
            variantSet.add(variant);
        }
        this.enums.set(decl.name, decl.variants);
    }
    registerStruct(decl) {
        if (this.structs.has(decl.name)) {
            this.pushError(`Duplicate struct declaration '${decl.name}'`, decl.line);
            return;
        }
        // Check for duplicate field names
        const fieldSet = new Set();
        for (const field of decl.fields) {
            if (fieldSet.has(field.name)) {
                this.errors.push(`Duplicate field '${field.name}' in struct '${decl.name}' at line ${decl.line}.`);
            }
            fieldSet.add(field.name);
        }
        // Check for duplicate method names
        const methodMap = new Map();
        const methodSet = new Set();
        for (const method of decl.methods) {
            if (methodSet.has(method.name)) {
                this.errors.push(`Duplicate method '${method.name}' in struct '${decl.name}' at line ${method.line}.`);
            }
            methodSet.add(method.name);
            methodMap.set(method.name, {
                parameters: method.parameters,
                returnType: method.returnType,
            });
        }
        // Validate field types
        for (const field of decl.fields) {
            this.validateFieldType(field.dataType, decl.name, decl.line);
        }
        this.structs.set(decl.name, {
            fields: decl.fields,
            methods: methodMap,
            line: decl.line,
        });
    }
    registerCompTimeFunction(decl) {
        if (this.comptimeFunctions.has(decl.name)) {
            this.errors.push(`Duplicate compile-time function '$Z ${decl.name}' at line ${decl.line}.`);
            return;
        }
        this.comptimeFunctions.set(decl.name, {
            parameters: decl.parameters,
            returnType: decl.returnType,
            line: decl.line,
        });
    }
    checkCompTimeFunctionDeclaration(decl) {
        // Save current scope
        const savedVariables = new Map(this.variables);
        const savedComptimeContext = this.comptimeContext;
        // Enter compile-time context
        this.comptimeContext = true;
        // Add parameters to scope (all immutable)
        for (const param of decl.parameters) {
            this.variables.set(param.name, {
                dataType: param.dataType,
                mutability: "immutable",
                line: decl.line,
            });
        }
        // Check body
        for (const stmt of decl.body) {
            this.checkStatement(stmt);
        }
        // Check return expression if present
        if (decl.returnExpression) {
            const exprType = this.inferExpressionType(decl.returnExpression);
            if (decl.returnType !== "void" && exprType !== null) {
                if (!this.typesCompatible(exprType, decl.returnType)) {
                    this.errors.push(`Compile-time function '$Z ${decl.name}' returns '${this.typeToString(exprType)}' but declared return type is '${this.typeToString(decl.returnType)}' at line ${decl.line}.`);
                }
            }
        }
        // Restore scope
        this.variables = savedVariables;
        this.comptimeContext = savedComptimeContext;
    }
    validateFieldType(dataType, structName, line) {
        if (isPrimitiveType(dataType)) {
            return; // Primitives are always valid
        }
        if (isArrayType(dataType)) {
            return; // Arrays of primitives are valid
        }
        if (isTupleType(dataType)) {
            return; // Tuples are valid
        }
        if (isJType(dataType)) {
            return; // J type is always valid
        }
        if (isEnumType(dataType)) {
            if (!this.enums.has(dataType.name)) {
                this.errors.push(`Unknown enum type '${dataType.name}' in struct '${structName}' at line ${line}.`);
            }
            return;
        }
        if (isStructType(dataType)) {
            // Allow self-reference or forward-reference (will be validated later)
            return;
        }
    }
    checkStatement(statement) {
        switch (statement.type) {
            case "VariableDeclaration":
                this.checkVariableDeclaration(statement);
                break;
            case "Assignment":
                this.checkAssignment(statement);
                break;
            case "PrintStatement":
                this.checkPrintStatement(statement);
                break;
            case "ErrorStatement":
                this.checkErrorStatement(statement);
                break;
            case "ThrowStatement":
                this.checkThrowStatement(statement);
                break;
            case "WhileStatement":
                this.checkWhileStatement(statement);
                break;
            case "ForStatement":
                this.checkForStatement(statement);
                break;
            case "ForEachStatement":
                this.checkForEachStatement(statement);
                break;
            case "IfStatement":
                this.checkIfStatement(statement);
                break;
            case "FunctionDeclaration":
                this.checkFunctionDeclaration(statement);
                break;
            case "ExpressionStatement":
                this.checkExpression(statement.expression, statement.line);
                break;
            case "IndexAssignment":
                this.checkIndexAssignment(statement);
                break;
            case "FieldAssignment":
                this.checkFieldAssignment(statement);
                break;
            case "BreakStatement":
                if (this.loopDepth === 0) {
                    this.errors.push(`Break statement (>!) at line ${statement.line} must be inside a loop.`);
                }
                break;
            case "ContinueStatement":
                if (this.loopDepth === 0) {
                    this.errors.push(`Continue statement (>>) at line ${statement.line} must be inside a loop.`);
                }
                break;
            case "TryStatement":
                this.checkTryStatement(statement);
                break;
            case "ImportStatement":
                this.checkImportStatement(statement);
                break;
            case "IncrementStatement":
                this.checkIncrementStatement(statement);
                break;
            case "CompoundAssignment":
                this.checkCompoundAssignment(statement);
                break;
            case "EnumDeclaration":
                // Already registered in first pass, nothing more to check
                break;
            case "StructDeclaration":
                // Check struct methods (struct is already registered in first pass)
                this.checkStructDeclaration(statement);
                break;
            case "MatchExpression":
                this.checkMatchExpression(statement);
                break;
            case "JSBlockStatement":
                // Raw JavaScript injection - skip type checking
                break;
            case "CompTimeFunctionDeclaration":
                // Already registered in first pass, check the body
                this.checkCompTimeFunctionDeclaration(statement);
                break;
        }
    }
    checkStructDeclaration(decl) {
        // Save current struct name for field access in method bodies
        this.currentStructName = decl.name;
        // Check each method
        for (const method of decl.methods) {
            this.checkStructMethod(method, decl);
        }
        this.currentStructName = null;
    }
    checkStructMethod(method, structDecl) {
        // Save current variables (for scope)
        const savedVariables = new Map(this.variables);
        // Add struct fields as local variables (implicit self)
        for (const field of structDecl.fields) {
            this.variables.set(field.name, {
                dataType: field.dataType,
                mutability: "mutable", // Fields are accessible but mutation depends on instance
                line: method.line,
            });
        }
        // Add parameters to local scope
        for (const param of method.parameters) {
            this.variables.set(param.name, {
                dataType: param.dataType,
                mutability: "immutable", // Parameters are always immutable
                line: method.line,
            });
        }
        // Check method body
        for (const stmt of method.body) {
            this.checkStatement(stmt);
        }
        // Check return expression if method has return type
        if (method.returnExpression) {
            this.checkExpression(method.returnExpression, method.line);
            const returnExprType = this.inferExpressionType(method.returnExpression);
            if (returnExprType && method.returnType !== "void" && !this.typesCompatible(returnExprType, method.returnType)) {
                this.pushError(`Type mismatch: method '${method.name}' should return ${this.typeToString(method.returnType)}, but returns ${this.typeToString(returnExprType)}`, method.line);
            }
        }
        else if (method.returnType !== "void") {
            // Skip this check if the body contains a $js{} block (return handled by JS code)
            const hasJsBlock = method.body.some((s) => s.type === "JSBlockStatement");
            if (!hasJsBlock) {
                this.pushError(`Method '${method.name}' has return type ${this.typeToString(method.returnType)} but no return expression`, method.line);
            }
        }
        // Restore variables (exit scope)
        this.variables = savedVariables;
    }
    checkMatchExpression(match) {
        // Check the value being matched
        this.checkExpression(match.value, match.line);
        const valueType = this.inferExpressionType(match.value);
        const coveredVariants = new Set();
        let hasWildcard = false;
        for (const arm of match.arms) {
            // Validate pattern matches value type
            this.checkPatternType(arm.pattern, valueType, arm.line);
            // Save scope, add bindings from pattern
            const savedVars = new Map(this.variables);
            this.addPatternBindings(arm.pattern, valueType, arm.line);
            // Check guard expression if present
            if (arm.guard) {
                this.checkExpression(arm.guard, arm.line);
                this.requireBooleanCondition(arm.guard, arm.line, "Match guard");
            }
            // Check body statements
            for (const stmt of arm.body) {
                this.checkStatement(stmt);
            }
            // Check result expression if present
            if (arm.resultExpression) {
                this.checkExpression(arm.resultExpression, arm.line);
            }
            // Track coverage for exhaustiveness checking
            if (arm.pattern.kind === "wildcard" || arm.pattern.kind === "binding") {
                hasWildcard = true;
            }
            if (arm.pattern.kind === "enum") {
                coveredVariants.add(arm.pattern.variant);
            }
            // Restore variables (exit arm scope)
            this.variables = savedVars;
        }
        // Exhaustiveness check for enums
        if (valueType && isEnumType(valueType) && !hasWildcard) {
            const allVariants = this.enums.get(valueType.name);
            if (allVariants) {
                for (const variant of allVariants) {
                    if (!coveredVariants.has(variant)) {
                        this.errors.push(`Non-exhaustive match at line ${match.line}: missing pattern for ${valueType.name}.${variant}.`);
                    }
                }
            }
        }
    }
    checkPatternType(pattern, expected, line) {
        if (!expected)
            return;
        switch (pattern.kind) {
            case "enum":
                if (!isEnumType(expected) || expected.name !== pattern.enumName) {
                    this.errors.push(`Pattern type mismatch at line ${line}: expected ${this.typeToString(expected)}, got ${pattern.enumName}.`);
                }
                // Validate variant exists
                const variants = this.enums.get(pattern.enumName);
                if (variants && !variants.includes(pattern.variant)) {
                    this.errors.push(`Unknown variant '${pattern.variant}' in enum '${pattern.enumName}' at line ${line}.`);
                }
                break;
            case "struct":
                if (!isStructType(expected) || expected.name !== pattern.structName) {
                    this.errors.push(`Pattern type mismatch at line ${line}: expected ${this.typeToString(expected)}, got ${pattern.structName}.`);
                }
                break;
            case "tuple":
                if (!isTupleType(expected)) {
                    this.errors.push(`Cannot use tuple pattern on ${this.typeToString(expected)} at line ${line}.`);
                }
                break;
            case "literal":
                const litType = this.inferExpressionType(pattern.value);
                if (litType && !this.typesCompatible(litType, expected)) {
                    this.errors.push(`Literal pattern type mismatch at line ${line}: expected ${this.typeToString(expected)}, got ${this.typeToString(litType)}.`);
                }
                break;
            case "j":
                if (!isJType(expected)) {
                    this.errors.push(`Cannot use J pattern on ${this.typeToString(expected)} at line ${line}.`);
                }
                break;
        }
    }
    addPatternBindings(pattern, valueType, line) {
        switch (pattern.kind) {
            case "binding":
                if (valueType) {
                    this.variables.set(pattern.name, {
                        dataType: valueType,
                        mutability: "immutable",
                        line,
                    });
                }
                break;
            case "struct": {
                const structInfo = this.structs.get(pattern.structName);
                if (structInfo) {
                    pattern.fields.forEach((field, i) => {
                        if (field.binding && structInfo.fields[i]) {
                            this.variables.set(field.binding, {
                                dataType: structInfo.fields[i].dataType,
                                mutability: "immutable",
                                line,
                            });
                        }
                    });
                }
                break;
            }
            case "tuple":
                if (valueType && isTupleType(valueType)) {
                    for (const elem of pattern.elements) {
                        if (elem.binding) {
                            this.variables.set(elem.binding, {
                                dataType: valueType.elementType,
                                mutability: "immutable",
                                line,
                            });
                        }
                    }
                }
                break;
            case "j":
                for (const field of pattern.fields) {
                    if (field.binding) {
                        // J field values have dynamic type at compile time
                        this.variables.set(field.binding, {
                            dataType: "string", // Fallback type for bindings
                            mutability: "immutable",
                            line,
                        });
                    }
                    if (field.pattern?.kind === "j") {
                        this.addPatternBindings(field.pattern, { kind: "j" }, line);
                    }
                }
                break;
        }
    }
    checkTryStatement(stmt) {
        // Check try body
        for (const s of stmt.tryBody) {
            this.checkStatement(s);
        }
        // Save current variables and add catch variable to scope
        const savedVariables = new Map(this.variables);
        this.variables.set(stmt.catchVariable, {
            dataType: "string", // Error messages are strings
            mutability: "immutable",
            line: stmt.line,
        });
        // Check catch body
        for (const s of stmt.catchBody) {
            this.checkStatement(s);
        }
        // Restore variables (exit catch scope)
        this.variables = savedVariables;
    }
    checkIndexAssignment(stmt) {
        this.checkExpression(stmt.array, stmt.line);
        this.checkExpression(stmt.index, stmt.line);
        this.checkExpression(stmt.value, stmt.line);
        const containerType = this.inferExpressionType(stmt.array);
        // Tuples are immutable - cannot assign to index
        if (containerType && isTupleType(containerType)) {
            this.errors.push(`Cannot assign to tuple index at line ${stmt.line}. Tuples are immutable.`);
            return;
        }
        // Verify index is an integer
        const indexType = this.inferExpressionType(stmt.index);
        if (indexType && isPrimitiveType(indexType) && indexType !== "int") {
            this.errors.push(`Array index must be an integer at line ${stmt.line}, got ${indexType}.`);
        }
        // Get the array's element type and verify the value matches
        if (containerType && isArrayType(containerType)) {
            const valueType = this.inferExpressionType(stmt.value);
            if (valueType && !this.typesEqual(valueType, containerType.elementType)) {
                this.errors.push(`Type mismatch at line ${stmt.line}: cannot assign ${this.typeToString(valueType)} to ${this.typeToString(containerType.elementType)} array element.`);
            }
        }
    }
    checkFieldAssignment(stmt) {
        this.checkExpression(stmt.object, stmt.line);
        this.checkExpression(stmt.value, stmt.line);
        const objectType = this.inferExpressionType(stmt.object);
        // Check that the object is a struct or J type
        if (!objectType || (!isStructType(objectType) && !isJType(objectType))) {
            this.errors.push(`Cannot assign to field '${stmt.field}' on non-struct/J type at line ${stmt.line}.`);
            return;
        }
        // For J types, check mutability and allow any field name
        if (isJType(objectType)) {
            if (stmt.object.type === "Identifier") {
                const varInfo = this.variables.get(stmt.object.name);
                if (varInfo && varInfo.mutability === "immutable") {
                    this.errors.push(`Cannot assign to field '${stmt.field}' on immutable J object '${stmt.object.name}' at line ${stmt.line}. Use J~ for mutable J objects.`);
                }
            }
            this.checkExpression(stmt.value, stmt.line);
            return;
        }
        // Check that the struct variable is mutable
        // We need to find the variable holding the struct
        if (stmt.object.type === "Identifier") {
            const varInfo = this.variables.get(stmt.object.name);
            if (varInfo && varInfo.mutability === "immutable") {
                this.errors.push(`Cannot assign to field '${stmt.field}' on immutable struct '${stmt.object.name}' at line ${stmt.line}. ` +
                    `Variable was declared as immutable (#) at line ${varInfo.line}.`);
                return;
            }
        }
        // Check that the field exists
        const structInfo = this.structs.get(objectType.name);
        if (!structInfo) {
            this.errors.push(`Unknown struct '${objectType.name}' at line ${stmt.line}.`);
            return;
        }
        const field = structInfo.fields.find((f) => f.name === stmt.field);
        if (!field) {
            this.errors.push(`Unknown field '${stmt.field}' on struct '${objectType.name}' at line ${stmt.line}.`);
            return;
        }
        // Check that the value type matches the field type
        const valueType = this.inferExpressionType(stmt.value);
        if (valueType && !this.typesCompatible(valueType, field.dataType)) {
            this.errors.push(`Type mismatch at line ${stmt.line}: cannot assign ${this.typeToString(valueType)} to ${this.typeToString(field.dataType)} field '${stmt.field}'.`);
        }
    }
    checkVariableDeclaration(decl) {
        // Check if variable already declared
        if (this.variables.has(decl.name)) {
            const existing = this.variables.get(decl.name);
            this.errors.push(`Variable '${decl.name}' already declared at line ${existing.line}. ` +
                `Cannot redeclare at line ${decl.line}.`);
            return;
        }
        // Tuples must be immutable
        if (isTupleType(decl.dataType) && decl.mutability === "mutable") {
            this.errors.push(`Tuples must be immutable at line ${decl.line}. Use # instead of ~.`);
        }
        // Validate the expression (checks for type errors in arithmetic, etc.)
        this.checkExpression(decl.value, decl.line);
        // Check type of value matches declared type
        const valueType = this.inferExpressionType(decl.value);
        if (valueType && !this.typesCompatible(valueType, decl.dataType)) {
            this.pushError(`Type mismatch: cannot assign ${this.typeToString(valueType)} to ${this.typeToString(decl.dataType)} variable '${decl.name}'`, decl.line);
        }
        // For tuples with explicit length, verify it matches the value
        if (isTupleType(decl.dataType) && decl.dataType.length !== undefined && valueType && isTupleType(valueType)) {
            if (valueType.length !== undefined && valueType.length !== decl.dataType.length) {
                this.pushError(`Tuple length mismatch: declared ${decl.dataType.length} but got ${valueType.length} elements`, decl.line);
            }
        }
        // Register variable
        this.variables.set(decl.name, {
            dataType: decl.dataType,
            mutability: decl.mutability,
            line: decl.line,
        });
    }
    checkAssignment(assignment) {
        const varInfo = this.variables.get(assignment.name);
        if (!varInfo) {
            this.pushError(`Undeclared variable '${assignment.name}'`, assignment.line);
            return;
        }
        // Check immutability
        if (varInfo.mutability === "immutable") {
            this.pushError(`Cannot reassign immutable variable '${assignment.name}'. Variable was declared as immutable (#) at line ${varInfo.line}`, assignment.line);
            return;
        }
        // Validate the expression
        this.checkExpression(assignment.value, assignment.line);
        // Check type matches
        const valueType = this.inferExpressionType(assignment.value);
        if (valueType && !this.typesCompatible(valueType, varInfo.dataType)) {
            this.pushError(`Type mismatch: cannot assign ${this.typeToString(valueType)} to ${this.typeToString(varInfo.dataType)} variable '${assignment.name}'`, assignment.line);
        }
    }
    checkIncrementStatement(stmt) {
        const varInfo = this.variables.get(stmt.name);
        if (!varInfo) {
            this.errors.push(`Undeclared variable '${stmt.name}' at line ${stmt.line}.`);
            return;
        }
        // Check immutability
        if (varInfo.mutability === "immutable") {
            this.errors.push(`Cannot modify immutable variable '${stmt.name}' with ${stmt.operator} at line ${stmt.line}. ` +
                `Variable was declared as immutable (#) at line ${varInfo.line}.`);
            return;
        }
        // Check type is numeric
        if (!this.isNumeric(varInfo.dataType)) {
            this.errors.push(`Cannot use ${stmt.operator} on ${this.typeToString(varInfo.dataType)} variable '${stmt.name}' at line ${stmt.line}. ` +
                `Operator requires int or float.`);
        }
    }
    checkCompoundAssignment(stmt) {
        const varInfo = this.variables.get(stmt.name);
        if (!varInfo) {
            this.errors.push(`Undeclared variable '${stmt.name}' at line ${stmt.line}.`);
            return;
        }
        // Check immutability
        if (varInfo.mutability === "immutable") {
            this.errors.push(`Cannot modify immutable variable '${stmt.name}' with ${stmt.operator} at line ${stmt.line}. ` +
                `Variable was declared as immutable (#) at line ${varInfo.line}.`);
            return;
        }
        // Validate the expression
        this.checkExpression(stmt.value, stmt.line);
        const valueType = this.inferExpressionType(stmt.value);
        // For += with strings, allow string concatenation
        if (stmt.operator === "+=" && varInfo.dataType === "string") {
            if (valueType && valueType !== "string") {
                this.errors.push(`Cannot concatenate ${this.typeToString(valueType)} to string variable '${stmt.name}' at line ${stmt.line}. Use s() to convert.`);
            }
            return;
        }
        // For all other operators, require numeric types
        if (!this.isNumeric(varInfo.dataType)) {
            this.errors.push(`Cannot use ${stmt.operator} on ${this.typeToString(varInfo.dataType)} variable '${stmt.name}' at line ${stmt.line}. ` +
                `Operator requires int or float.`);
            return;
        }
        // Value must also be numeric
        if (valueType && !this.isNumeric(valueType)) {
            this.errors.push(`Type mismatch at line ${stmt.line}: cannot use ${stmt.operator} with ${this.typeToString(valueType)} value.`);
        }
    }
    checkPrintStatement(print) {
        // Just verify the expression is valid
        this.checkExpression(print.expression, print.line);
    }
    checkErrorStatement(error) {
        // Just verify the expression is valid
        this.checkExpression(error.expression, error.line);
    }
    checkThrowStatement(stmt) {
        // Just verify the expression is valid
        this.checkExpression(stmt.expression, stmt.line);
    }
    checkWhileStatement(stmt) {
        this.checkExpression(stmt.condition, stmt.line);
        this.requireBooleanCondition(stmt.condition, stmt.line, "While loop");
        this.loopDepth++;
        for (const s of stmt.body) {
            this.checkStatement(s);
        }
        this.loopDepth--;
    }
    checkForStatement(stmt) {
        // Check that start and end are integers
        this.checkExpression(stmt.start, stmt.line);
        this.checkExpression(stmt.end, stmt.line);
        const startType = this.inferExpressionType(stmt.start);
        const endType = this.inferExpressionType(stmt.end);
        if (startType && isPrimitiveType(startType) && startType !== "int") {
            this.errors.push(`For loop range start must be an integer at line ${stmt.line}, got ${startType}.`);
        }
        if (endType && isPrimitiveType(endType) && endType !== "int") {
            this.errors.push(`For loop range end must be an integer at line ${stmt.line}, got ${endType}.`);
        }
        // Save current variables and add loop variable to scope
        const savedVariables = new Map(this.variables);
        this.variables.set(stmt.variable, {
            dataType: "int",
            mutability: "immutable",
            line: stmt.line,
        });
        // Check body with loop depth incremented
        this.loopDepth++;
        for (const s of stmt.body) {
            this.checkStatement(s);
        }
        this.loopDepth--;
        // Restore variables (exit loop scope)
        this.variables = savedVariables;
    }
    checkForEachStatement(stmt) {
        this.checkExpression(stmt.iterable, stmt.line);
        const iterableType = this.inferExpressionType(stmt.iterable);
        let elementType = "string"; // fallback
        if (iterableType) {
            if (isArrayType(iterableType)) {
                elementType = iterableType.elementType;
            }
            else {
                this.errors.push(`For-each loop requires an array at line ${stmt.line}, got ${typeof iterableType === "string" ? iterableType : iterableType.kind}.`);
            }
        }
        const savedVariables = new Map(this.variables);
        this.variables.set(stmt.variable, {
            dataType: elementType,
            mutability: "immutable",
            line: stmt.line,
        });
        this.loopDepth++;
        for (const s of stmt.body) {
            this.checkStatement(s);
        }
        this.loopDepth--;
        this.variables = savedVariables;
    }
    checkImportStatement(stmt) {
        // Look up module type info for safe imports
        const moduleInfo = !stmt.isUnsafe ? this.moduleTypes.get(stmt.source) : undefined;
        if (stmt.namespace) {
            this.variables.set(stmt.namespace, {
                dataType: "string",
                mutability: "immutable",
                line: stmt.line,
            });
        }
        for (const spec of stmt.specifiers) {
            const localName = spec.alias || spec.name;
            const originalName = spec.name;
            let resolved = false;
            if (moduleInfo) {
                // Check if it's an exported function
                const funcType = moduleInfo.functions.get(originalName);
                if (funcType) {
                    this.functions.set(localName, {
                        parameters: funcType.parameters,
                        returnType: funcType.returnType,
                        line: stmt.line,
                    });
                    resolved = true;
                }
                // Check if it's an exported variable
                const varType = moduleInfo.variables.get(originalName);
                if (varType) {
                    this.variables.set(localName, {
                        dataType: varType.dataType,
                        mutability: "immutable",
                        line: stmt.line,
                    });
                    resolved = true;
                }
                // Check if it's an exported struct
                const structType = moduleInfo.structs.get(originalName);
                if (structType) {
                    const methods = new Map();
                    this.structs.set(localName, {
                        fields: structType.fields,
                        methods,
                        line: stmt.line,
                    });
                    resolved = true;
                }
                // Check if it's an exported enum
                const enumVariants = moduleInfo.enums.get(originalName);
                if (enumVariants) {
                    this.enums.set(localName, enumVariants);
                    resolved = true;
                }
            }
            // Fallback: placeholder types for unsafe imports or unresolved names
            if (!resolved) {
                this.variables.set(localName, {
                    dataType: "string",
                    mutability: "immutable",
                    line: stmt.line,
                });
                this.functions.set(localName, {
                    parameters: [],
                    returnType: "void",
                    line: stmt.line,
                    imported: true,
                });
            }
        }
    }
    checkIfStatement(stmt) {
        // Check if branch
        this.checkExpression(stmt.ifBranch.condition, stmt.line);
        this.requireBooleanCondition(stmt.ifBranch.condition, stmt.line, "If");
        for (const s of stmt.ifBranch.body) {
            this.checkStatement(s);
        }
        // Check else-if branches
        for (const branch of stmt.elseIfBranches) {
            this.checkExpression(branch.condition, stmt.line);
            this.requireBooleanCondition(branch.condition, stmt.line, "Else-if");
            for (const s of branch.body) {
                this.checkStatement(s);
            }
        }
        // Check else branch
        if (stmt.elseBranch) {
            for (const s of stmt.elseBranch) {
                this.checkStatement(s);
            }
        }
    }
    checkFunctionDeclaration(decl) {
        // Check if function already declared
        if (this.functions.has(decl.name)) {
            const existing = this.functions.get(decl.name);
            this.errors.push(`Function '${decl.name}' already declared at line ${existing.line}. ` +
                `Cannot redeclare at line ${decl.line}.`);
            return;
        }
        // Register function before checking body (for recursion)
        this.functions.set(decl.name, {
            parameters: decl.parameters,
            returnType: decl.returnType,
            line: decl.line,
        });
        // Save current variables (for scope)
        const savedVariables = new Map(this.variables);
        // Add parameters to local scope
        for (const param of decl.parameters) {
            this.variables.set(param.name, {
                dataType: param.dataType,
                mutability: "immutable", // Parameters are always immutable
                line: decl.line,
            });
        }
        // Check function body
        for (const stmt of decl.body) {
            this.checkStatement(stmt);
        }
        // Check return expression if function has return type
        if (decl.returnExpression) {
            this.checkExpression(decl.returnExpression, decl.line);
            const returnExprType = this.inferExpressionType(decl.returnExpression);
            if (returnExprType && decl.returnType !== "void" && !this.typesCompatible(returnExprType, decl.returnType)) {
                this.errors.push(`Type mismatch at line ${decl.line}: function '${decl.name}' should return ${this.typeToString(decl.returnType)}, but returns ${this.typeToString(returnExprType)}.`);
            }
        }
        else if (decl.returnType !== "void") {
            // Skip this check if the body contains a $js{} block (return handled by JS code)
            const hasJsBlock = decl.body.some((s) => s.type === "JSBlockStatement");
            if (!hasJsBlock) {
                this.errors.push(`Function '${decl.name}' at line ${decl.line} has return type ${decl.returnType} but no return expression.`);
            }
        }
        // Restore variables (exit scope)
        this.variables = savedVariables;
    }
    checkFunctionCall(call, line) {
        // Handle compile-time built-in functions ($read, $env, etc.)
        if (call.name.startsWith("$")) {
            const validBuiltins = ["$read", "$env", "$defined", "$line", "$file", "$date", "$time"];
            if (!validBuiltins.includes(call.name)) {
                this.errors.push(`Unknown compile-time built-in function '${call.name}' at line ${line}.`);
            }
            // Validate argument expressions
            for (const arg of call.arguments) {
                this.checkExpression(arg.value, line);
            }
            return;
        }
        // Handle compile-time function calls ($Z functions)
        const ctFuncInfo = this.comptimeFunctions.get(call.name);
        if (ctFuncInfo) {
            // Validate arguments for CT function
            for (const arg of call.arguments) {
                this.checkExpression(arg.value, line);
            }
            return;
        }
        const funcInfo = this.functions.get(call.name);
        if (!funcInfo) {
            this.errors.push(`Undeclared function '${call.name}' at line ${line}.`);
            return;
        }
        // Skip validation for imported functions (we don't know their signatures)
        if (funcInfo.imported) {
            // Just validate the argument expressions
            for (const arg of call.arguments) {
                this.checkExpression(arg.value, line);
            }
            return;
        }
        // Check arguments
        const positionalArgs = call.arguments.filter((arg) => !arg.name);
        const namedArgs = call.arguments.filter((arg) => arg.name);
        // Build a map of which parameters have been provided
        const providedParams = new Map();
        // Process positional arguments first
        for (let i = 0; i < positionalArgs.length; i++) {
            if (i >= funcInfo.parameters.length) {
                this.errors.push(`Too many arguments for function '${call.name}' at line ${line}. Expected ${funcInfo.parameters.length}.`);
                break;
            }
            const param = funcInfo.parameters[i];
            providedParams.set(param.name, positionalArgs[i].value);
            this.checkExpression(positionalArgs[i].value, line);
            // Type check
            const argType = this.inferExpressionType(positionalArgs[i].value);
            if (argType && !this.typesCompatible(argType, param.dataType)) {
                this.errors.push(`Type mismatch at line ${line}: argument ${i + 1} to '${call.name}' should be ${this.typeToString(param.dataType)}, got ${this.typeToString(argType)}.`);
            }
        }
        // Process named arguments
        for (const arg of namedArgs) {
            const param = funcInfo.parameters.find((p) => p.name === arg.name);
            if (!param) {
                this.errors.push(`Unknown parameter '${arg.name}' for function '${call.name}' at line ${line}.`);
                continue;
            }
            if (providedParams.has(arg.name)) {
                this.errors.push(`Parameter '${arg.name}' already provided for function '${call.name}' at line ${line}.`);
                continue;
            }
            providedParams.set(arg.name, arg.value);
            this.checkExpression(arg.value, line);
            // Type check
            const argType = this.inferExpressionType(arg.value);
            if (argType && !this.typesCompatible(argType, param.dataType)) {
                this.errors.push(`Type mismatch at line ${line}: argument '${arg.name}' to '${call.name}' should be ${this.typeToString(param.dataType)}, got ${this.typeToString(argType)}.`);
            }
        }
        // Check all required parameters are provided
        for (const param of funcInfo.parameters) {
            if (!providedParams.has(param.name)) {
                this.errors.push(`Missing argument '${param.name}' for function '${call.name}' at line ${line}.`);
            }
        }
    }
    checkExpression(expr, line) {
        if (expr.type === "Identifier") {
            if (!this.variables.has(expr.name) && !this.functions.has(expr.name)) {
                this.errors.push(`Undeclared variable '${expr.name}' at line ${line}.`);
            }
        }
        else if (expr.type === "BinaryExpression") {
            this.checkExpression(expr.left, line);
            this.checkExpression(expr.right, line);
            const leftType = this.inferExpressionType(expr.left);
            const rightType = this.inferExpressionType(expr.right);
            // Logical operators require boolean operands
            if (expr.operator === "&&" || expr.operator === "||") {
                if (leftType !== null && leftType !== "bool") {
                    this.errors.push(`Operator '${expr.operator}' requires boolean operands at line ${line}, got ${this.typeToString(leftType)} on left side.`);
                }
                if (rightType !== null && rightType !== "bool") {
                    this.errors.push(`Operator '${expr.operator}' requires boolean operands at line ${line}, got ${this.typeToString(rightType)} on right side.`);
                }
                return;
            }
            // Comparison operators work on same types
            if (this.isComparisonOperator(expr.operator)) {
                // Allow comparing same types or numeric types
                if (leftType && rightType) {
                    const bothNumeric = this.isNumeric(leftType) && this.isNumeric(rightType);
                    const sameType = this.typesEqual(leftType, rightType);
                    if (!bothNumeric && !sameType) {
                        this.errors.push(`Cannot compare ${this.typeToString(leftType)} with ${this.typeToString(rightType)} at line ${line}.`);
                    }
                }
                return;
            }
            // Special handling for + operator (string concatenation)
            if (expr.operator === "+") {
                const leftIsString = leftType === "string";
                const rightIsString = rightType === "string";
                if (leftIsString || rightIsString) {
                    // If either side is string, BOTH must be string (no implicit conversion)
                    if (!leftIsString && leftType) {
                        this.errors.push(`Cannot concatenate string with ${leftType} at line ${line}. Use s() to convert.`);
                    }
                    if (!rightIsString && rightType) {
                        this.errors.push(`Cannot concatenate string with ${rightType} at line ${line}. Use s() to convert.`);
                    }
                    return;
                }
            }
            // Arithmetic operators require numeric types
            if (leftType && !this.isNumeric(leftType)) {
                this.errors.push(`Cannot use operator '${expr.operator}' on ${leftType} at line ${line}.`);
            }
            if (rightType && !this.isNumeric(rightType)) {
                this.errors.push(`Cannot use operator '${expr.operator}' on ${rightType} at line ${line}.`);
            }
        }
        else if (expr.type === "UnaryExpression") {
            this.checkExpression(expr.operand, line);
            const operandType = this.inferExpressionType(expr.operand);
            // ! operator requires boolean operand
            if (expr.operator === "!") {
                if (operandType !== null && operandType !== "bool") {
                    this.errors.push(`Operator '!' requires boolean operand at line ${line}, got ${this.typeToString(operandType)}. Use an explicit comparison (e.g., x == 0, x == _).`);
                }
                return;
            }
            // - operator requires numeric type
            if (operandType && !this.isNumeric(operandType)) {
                this.errors.push(`Cannot use unary '${expr.operator}' on ${operandType} at line ${line}.`);
            }
        }
        else if (expr.type === "InterpolatedString") {
            // Check all expressions inside the interpolated string
            for (const part of expr.parts) {
                if (part.kind === "expr") {
                    this.checkExpression(part.value, line);
                }
            }
        }
        else if (expr.type === "CastExpression") {
            this.checkExpression(expr.expression, line);
        }
        else if (expr.type === "FunctionCall") {
            this.checkFunctionCall(expr, line);
        }
        else if (expr.type === "ArrayLiteral") {
            // Check all elements in the array
            for (const elem of expr.elements) {
                this.checkExpression(elem, line);
            }
        }
        else if (expr.type === "TupleLiteral") {
            // Check all elements in the tuple
            for (const elem of expr.elements) {
                this.checkExpression(elem, line);
            }
            // Verify all elements have the same type
            if (expr.elements.length > 0) {
                const firstType = this.inferExpressionType(expr.elements[0]);
                if (firstType && isPrimitiveType(firstType)) {
                    for (let i = 1; i < expr.elements.length; i++) {
                        const elemType = this.inferExpressionType(expr.elements[i]);
                        if (elemType && elemType !== firstType) {
                            this.errors.push(`Tuple elements must all have the same type at line ${line}. ` +
                                `Expected ${firstType}, got ${this.typeToString(elemType)} at position ${i + 1}.`);
                        }
                    }
                }
            }
        }
        else if (expr.type === "RangeExpression") {
            // Check start and end are integers
            this.checkExpression(expr.start, line);
            this.checkExpression(expr.end, line);
            const startType = this.inferExpressionType(expr.start);
            const endType = this.inferExpressionType(expr.end);
            if (startType && isPrimitiveType(startType) && startType !== "int") {
                this.errors.push(`Range start must be an integer at line ${line}, got ${startType}.`);
            }
            if (endType && isPrimitiveType(endType) && endType !== "int") {
                this.errors.push(`Range end must be an integer at line ${line}, got ${endType}.`);
            }
        }
        else if (expr.type === "IndexAccess") {
            this.checkExpression(expr.array, line);
            this.checkExpression(expr.index, line);
            const indexType = this.inferExpressionType(expr.index);
            if (indexType && isPrimitiveType(indexType) && indexType !== "int") {
                this.errors.push(`Array index must be an integer at line ${line}, got ${indexType}.`);
            }
        }
        else if (expr.type === "MethodCall") {
            this.checkExpression(expr.object, line);
            for (const arg of expr.arguments) {
                this.checkExpression(arg, line);
            }
            const objectType = this.inferExpressionType(expr.object);
            // Validate method exists for strings
            if (objectType === "string") {
                const stringMethods = ["len", "at"];
                if (stringMethods.includes(expr.method)) {
                    // Built-in string methods
                    if (expr.method === "len" && expr.arguments.length > 0) {
                        this.errors.push(`String method 'len' takes no arguments at line ${line}.`);
                    }
                    if (expr.method === "at") {
                        if (expr.arguments.length !== 1) {
                            this.errors.push(`String method 'at' requires exactly 1 argument at line ${line}.`);
                        }
                        else {
                            const argType = this.inferExpressionType(expr.arguments[0]);
                            if (argType && argType !== "int") {
                                this.errors.push(`String method 'at' requires int argument at line ${line}, got ${this.typeToString(argType)}.`);
                            }
                        }
                    }
                }
                else {
                    // UFCS: Check if there's a function with this name that takes string as first param
                    const funcInfo = this.functions.get(expr.method);
                    if (funcInfo) {
                        // Mark as UFCS call - will be handled by codegen
                        // No additional validation needed for imported functions
                    }
                    else {
                        this.errors.push(`Unknown string method '${expr.method}' at line ${line}. Built-in methods: ${stringMethods.join(", ")}. Or import a function with this name.`);
                    }
                }
            }
            // Validate method exists for tuples
            else if (objectType && isTupleType(objectType)) {
                const validMethods = ["len"]; // Tuples only support len
                if (!validMethods.includes(expr.method)) {
                    // UFCS: Check if there's a function with this name
                    const funcInfo = this.functions.get(expr.method);
                    if (!funcInfo) {
                        this.errors.push(`Invalid method '${expr.method}' on tuple at line ${line}. Tuples only support: ${validMethods.join(", ")}.`);
                    }
                }
                else {
                    // len takes no arguments
                    if (expr.method === "len" && expr.arguments.length > 0) {
                        this.errors.push(`Tuple method '${expr.method}' takes no arguments at line ${line}.`);
                    }
                }
            }
            // Validate method exists for arrays
            else if (objectType && isArrayType(objectType)) {
                const validMethods = ["len", "push", "pop"];
                if (!validMethods.includes(expr.method)) {
                    // UFCS: Check if there's a function with this name
                    const funcInfo = this.functions.get(expr.method);
                    if (!funcInfo) {
                        this.errors.push(`Unknown array method '${expr.method}' at line ${line}. Valid methods: ${validMethods.join(", ")}.`);
                    }
                }
                else {
                    // Fixed-size arrays cannot use push or pop
                    if (objectType.size !== undefined && (expr.method === "push" || expr.method === "pop")) {
                        this.errors.push(`Cannot use '${expr.method}' on fixed-size array at line ${line}. Array was declared with size ${objectType.size}.`);
                    }
                    // push requires one argument of the correct type
                    if (expr.method === "push") {
                        if (expr.arguments.length !== 1) {
                            this.errors.push(`Array method 'push' requires exactly 1 argument at line ${line}.`);
                        }
                        else {
                            const argType = this.inferExpressionType(expr.arguments[0]);
                            if (argType && !this.typesEqual(argType, objectType.elementType)) {
                                this.errors.push(`Type mismatch at line ${line}: cannot push ${this.typeToString(argType)} to ${this.typeToString(objectType.elementType)} array.`);
                            }
                        }
                    }
                    // len and pop take no arguments
                    if ((expr.method === "len" || expr.method === "pop") && expr.arguments.length > 0) {
                        this.errors.push(`Array method '${expr.method}' takes no arguments at line ${line}.`);
                    }
                }
            }
            // J type methods: has, get, set, len
            else if (objectType && isJType(objectType)) {
                const jBuiltins = ["has", "get", "set", "len"];
                if (jBuiltins.includes(expr.method)) {
                    if (expr.method === "has") {
                        if (expr.arguments.length !== 1) {
                            this.errors.push(`J method 'has' requires exactly 1 argument (key) at line ${line}.`);
                        }
                        else {
                            const argType = this.inferExpressionType(expr.arguments[0]);
                            if (argType && argType !== "string") {
                                this.errors.push(`J method 'has' requires string key at line ${line}, got ${this.typeToString(argType)}.`);
                            }
                        }
                    }
                    else if (expr.method === "get") {
                        if (expr.arguments.length !== 1) {
                            this.errors.push(`J method 'get' requires exactly 1 argument (key) at line ${line}.`);
                        }
                        else {
                            const argType = this.inferExpressionType(expr.arguments[0]);
                            if (argType && argType !== "string") {
                                this.errors.push(`J method 'get' requires string key at line ${line}, got ${this.typeToString(argType)}.`);
                            }
                        }
                    }
                    else if (expr.method === "set") {
                        if (expr.object.type === "Identifier") {
                            const varInfo = this.variables.get(expr.object.name);
                            if (varInfo && varInfo.mutability === "immutable") {
                                this.errors.push(`Cannot call 'set' on immutable J object '${expr.object.name}' at line ${line}. Use J~ for mutable J objects.`);
                            }
                        }
                        if (expr.arguments.length !== 2) {
                            this.errors.push(`J method 'set' requires exactly 2 arguments (key, value) at line ${line}.`);
                        }
                        else {
                            const keyType = this.inferExpressionType(expr.arguments[0]);
                            if (keyType && keyType !== "string") {
                                this.errors.push(`J method 'set' requires string key as first argument at line ${line}, got ${this.typeToString(keyType)}.`);
                            }
                        }
                    }
                    else if (expr.method === "len") {
                        if (expr.arguments.length > 0) {
                            this.errors.push(`J method 'len' takes no arguments at line ${line}.`);
                        }
                    }
                }
                else {
                    const funcInfo = this.functions.get(expr.method);
                    if (!funcInfo) {
                        this.errors.push(`Unknown method '${expr.method}' on J type at line ${line}. Built-in methods: has, get, set, len.`);
                    }
                }
            }
            // Struct methods
            else if (objectType && isStructType(objectType)) {
                const structInfo = this.structs.get(objectType.name);
                if (structInfo) {
                    const methodInfo = structInfo.methods.get(expr.method);
                    if (methodInfo) {
                        // Validate arguments
                        if (expr.arguments.length !== methodInfo.parameters.length) {
                            this.errors.push(`Method '${expr.method}' on struct '${objectType.name}' expects ${methodInfo.parameters.length} arguments, got ${expr.arguments.length} at line ${line}.`);
                        }
                        else {
                            for (let i = 0; i < expr.arguments.length; i++) {
                                const argType = this.inferExpressionType(expr.arguments[i]);
                                const paramType = methodInfo.parameters[i].dataType;
                                if (argType && !this.typesCompatible(argType, paramType)) {
                                    this.errors.push(`Type mismatch at line ${line}: argument ${i + 1} to method '${expr.method}' should be ${this.typeToString(paramType)}, got ${this.typeToString(argType)}.`);
                                }
                            }
                        }
                    }
                    else {
                        // Check UFCS as fallback
                        const funcInfo = this.functions.get(expr.method);
                        if (!funcInfo) {
                            this.errors.push(`Unknown method '${expr.method}' on struct '${objectType.name}' at line ${line}.`);
                        }
                    }
                }
            }
            // UFCS for other types: check if there's a function with this name
            else if (objectType) {
                const funcInfo = this.functions.get(expr.method);
                if (!funcInfo) {
                    this.errors.push(`Unknown method '${expr.method}' on ${this.typeToString(objectType)} at line ${line}.`);
                }
            }
        }
        else if (expr.type === "MemberExpression") {
            // Property access on objects (e.g., namespace imports, struct fields, J objects)
            this.checkExpression(expr.object, line);
            const objectType = this.inferExpressionType(expr.object);
            if (objectType && isStructType(objectType)) {
                const structInfo = this.structs.get(objectType.name);
                if (structInfo) {
                    const field = structInfo.fields.find((f) => f.name === expr.property);
                    if (!field) {
                        this.errors.push(`Unknown field '${expr.property}' on struct '${objectType.name}' at line ${line}.`);
                    }
                }
            }
            // J objects allow any property access (dynamic keys)
            // For non-structs/non-J, we trust that the property exists (e.g., imported modules)
        }
        else if (expr.type === "EnumAccess") {
            // Validate that the enum exists and the variant is valid
            const variants = this.enums.get(expr.enumName);
            if (!variants) {
                this.errors.push(`Unknown enum '${expr.enumName}' at line ${line}.`);
            }
            else if (!variants.includes(expr.variant)) {
                this.errors.push(`Unknown variant '${expr.variant}' in enum '${expr.enumName}' at line ${line}. Valid variants: ${variants.join(", ")}.`);
            }
        }
        else if (expr.type === "JLiteral") {
            for (const field of expr.fields) {
                this.checkExpression(field.value, line);
                const valueType = this.inferExpressionType(field.value);
                if (valueType !== null && !this.isValidJValueType(valueType)) {
                    this.errors.push(`Invalid J field value type at line ${line}: field '${field.key}' has type ${this.typeToString(valueType)}. J values must be string, int, float, bool, null, or J.`);
                }
            }
        }
        else if (expr.type === "StructInstantiation") {
            this.checkStructInstantiation(expr, line);
        }
        else if (expr.type === "MatchExpression") {
            this.checkMatchExpression(expr);
        }
        else if (expr.type === "SpawnExpression") {
            // Type-check the inner function call
            if (expr.call.type === "FunctionCall") {
                this.checkFunctionCall(expr.call, line);
            }
            else if (expr.call.type === "MethodCall") {
                this.checkExpression(expr.call, line);
            }
        }
        else if (expr.type === "CompTimeExpression") {
            // Check the inner expression in compile-time context
            const savedContext = this.comptimeContext;
            this.comptimeContext = true;
            this.checkCompTimeInnerExpression(expr.expression, line);
            this.comptimeContext = savedContext;
        }
    }
    checkCompTimeInnerExpression(expr, line) {
        // First do standard expression checking
        this.checkExpression(expr, line);
        // Additional compile-time specific checks
        if (expr.type === "Identifier") {
            // In compile-time context, check if it's a CT variable or CT function
            const name = expr.name;
            // Allow CT built-in functions (start with $)
            if (name.startsWith("$")) {
                const validBuiltins = ["$read", "$env", "$defined", "$line", "$file", "$date", "$time"];
                if (!validBuiltins.includes(name)) {
                    this.errors.push(`Unknown compile-time built-in function '${name}' at line ${line}. Valid: ${validBuiltins.join(", ")}.`);
                }
                return;
            }
            // Check if it's a CT function
            if (this.comptimeFunctions.has(name)) {
                return; // Valid CT function reference
            }
            // Check if it's a CT variable (added during $Z function body checking)
            if (this.variables.has(name)) {
                return; // Valid variable in current CT scope
            }
            // Runtime variables are not accessible in CT context
            // (Already caught by regular checkExpression if undefined)
        }
        // Check function calls
        if (expr.type === "FunctionCall") {
            const name = expr.name;
            // Allow CT built-in functions
            if (name.startsWith("$")) {
                return;
            }
            // Allow CT function calls
            if (this.comptimeFunctions.has(name)) {
                return;
            }
            // Disallow runtime function calls in CT context
            if (this.functions.has(name)) {
                this.errors.push(`Cannot call runtime function '${name}' in compile-time context at line ${line}. Only $Z functions and built-in $ functions are allowed.`);
            }
        }
    }
    checkStructInstantiation(expr, line) {
        const structInfo = this.structs.get(expr.structName);
        if (!structInfo) {
            this.errors.push(`Unknown struct '${expr.structName}' at line ${line}.`);
            return;
        }
        // Check arguments
        const positionalArgs = expr.arguments.filter((arg) => !arg.name);
        const namedArgs = expr.arguments.filter((arg) => arg.name);
        // Build a map of which fields have been provided
        const providedFields = new Map();
        // Process positional arguments first
        for (let i = 0; i < positionalArgs.length; i++) {
            if (i >= structInfo.fields.length) {
                this.errors.push(`Too many arguments for struct '${expr.structName}' at line ${line}. Expected ${structInfo.fields.length}.`);
                break;
            }
            const field = structInfo.fields[i];
            providedFields.set(field.name, positionalArgs[i].value);
            this.checkExpression(positionalArgs[i].value, line);
            // Type check
            const argType = this.inferExpressionType(positionalArgs[i].value);
            if (argType && !this.typesCompatible(argType, field.dataType)) {
                this.errors.push(`Type mismatch at line ${line}: field '${field.name}' of struct '${expr.structName}' expects ${this.typeToString(field.dataType)}, got ${this.typeToString(argType)}.`);
            }
        }
        // Process named arguments
        for (const arg of namedArgs) {
            const field = structInfo.fields.find((f) => f.name === arg.name);
            if (!field) {
                this.errors.push(`Unknown field '${arg.name}' for struct '${expr.structName}' at line ${line}.`);
                continue;
            }
            if (providedFields.has(arg.name)) {
                this.errors.push(`Field '${arg.name}' already provided for struct '${expr.structName}' at line ${line}.`);
                continue;
            }
            providedFields.set(arg.name, arg.value);
            this.checkExpression(arg.value, line);
            // Type check
            const argType = this.inferExpressionType(arg.value);
            if (argType && !this.typesCompatible(argType, field.dataType)) {
                this.errors.push(`Type mismatch at line ${line}: field '${arg.name}' of struct '${expr.structName}' expects ${this.typeToString(field.dataType)}, got ${this.typeToString(argType)}.`);
            }
        }
        // Check all required fields are provided
        for (const field of structInfo.fields) {
            if (!providedFields.has(field.name)) {
                this.errors.push(`Missing field '${field.name}' for struct '${expr.structName}' at line ${line}.`);
            }
        }
    }
    isNumeric(type) {
        return type === "int" || type === "float";
    }
    isValidJValueType(type) {
        if (isPrimitiveType(type))
            return true; // s, i, f, b
        if (isJType(type))
            return true; // nested J
        return false;
    }
    requireBooleanCondition(expr, line, context) {
        const exprType = this.inferExpressionType(expr);
        if (exprType !== null && exprType !== "bool") {
            this.errors.push(`${context} condition must be boolean at line ${line}, got ${this.typeToString(exprType)}. Use an explicit comparison (e.g., x > 0, x != _).`);
        }
    }
    isComparisonOperator(op) {
        return [">", "<", ">=", "<=", "==", "!="].includes(op);
    }
    typesEqual(a, b) {
        if (a === null || b === null || b === "void") {
            return false;
        }
        // Both primitives
        if (isPrimitiveType(a) && isPrimitiveType(b)) {
            return a === b;
        }
        // Both arrays - use recursive typesEqual for element types (handles complex types)
        if (isArrayType(a) && isArrayType(b)) {
            return this.typesEqual(a.elementType, b.elementType);
        }
        // Both tuples
        if (isTupleType(a) && isTupleType(b)) {
            // Element types must match
            if (a.elementType !== b.elementType) {
                return false;
            }
            // If both have explicit lengths, they must match
            // If either has inferred length (undefined), allow match
            if (a.length !== undefined && b.length !== undefined) {
                return a.length === b.length;
            }
            return true;
        }
        // Both enums
        if (isEnumType(a) && isEnumType(b)) {
            return a.name === b.name;
        }
        // Both structs
        if (isStructType(a) && isStructType(b)) {
            return a.name === b.name;
        }
        // Both J types
        if (isJType(a) && isJType(b)) {
            return true;
        }
        // Mismatched types
        return false;
    }
    // Like typesEqual but allows implicit int→float widening and empty array compatibility
    typesCompatible(source, target) {
        if (this.typesEqual(source, target))
            return true;
        // Allow int → float widening
        if (source === "int" && target === "float")
            return true;
        // Allow empty arrays to match any array type
        if (source && isArrayType(source) && source.isEmpty && target && target !== "void" && isArrayType(target)) {
            return true;
        }
        return false;
    }
    typeToString(type) {
        if (type === null)
            return "unknown";
        if (type === "void")
            return "void";
        if (isPrimitiveType(type))
            return type;
        if (isTupleType(type)) {
            const lenStr = type.length !== undefined ? type.length.toString() : "N";
            return `t${type.elementType[0]}${lenStr}`;
        }
        if (isEnumType(type)) {
            return type.name;
        }
        if (isStructType(type)) {
            return type.name;
        }
        if (isArrayType(type)) {
            return `${this.typeToString(type.elementType)}[]`;
        }
        if (isJType(type)) {
            return "J";
        }
        return "unknown";
    }
    inferExpressionType(expr) {
        switch (expr.type) {
            case "StringLiteral":
                return "string";
            case "InterpolatedString":
                return "string";
            case "NumberLiteral":
                return expr.isFloat ? "float" : "int";
            case "BoolLiteral":
                return "bool";
            case "NullLiteral":
                return null; // Null is compatible with any type
            case "Identifier":
                const varInfo = this.variables.get(expr.name);
                return varInfo?.dataType || null;
            case "BinaryExpression": {
                const leftType = this.inferExpressionType(expr.left);
                const rightType = this.inferExpressionType(expr.right);
                // Comparison and logical operators return bool
                if (this.isComparisonOperator(expr.operator) || expr.operator === "&&" || expr.operator === "||") {
                    return "bool";
                }
                // String concatenation
                if (expr.operator === "+" && leftType === "string" && rightType === "string") {
                    return "string";
                }
                // If either operand is float, result is float
                if (leftType === "float" || rightType === "float") {
                    return "float";
                }
                // Division always returns float
                if (expr.operator === "/") {
                    return "float";
                }
                return "int";
            }
            case "UnaryExpression":
                if (expr.operator === "!") {
                    return "bool";
                }
                return this.inferExpressionType(expr.operand);
            case "CastExpression":
                return expr.targetType;
            case "FunctionCall": {
                const funcInfo = this.functions.get(expr.name);
                if (funcInfo && funcInfo.returnType !== "void") {
                    return funcInfo.returnType;
                }
                return null;
            }
            case "JLiteral":
                return { kind: "j" };
            case "ArrayLiteral": {
                // Infer element type from first element, or default to int
                if (expr.elements.length === 0) {
                    // Mark as empty array - compatible with any array type
                    return { kind: "array", elementType: "int", isEmpty: true };
                }
                const firstElemType = this.inferExpressionType(expr.elements[0]);
                // Handle all valid array element types (primitives, structs, enums, J, tuples)
                if (firstElemType && isArrayElementType(firstElemType)) {
                    return { kind: "array", elementType: firstElemType };
                }
                return { kind: "array", elementType: "int" };
            }
            case "TupleLiteral": {
                // Infer element type from first element
                if (expr.elements.length === 0) {
                    return { kind: "tuple", elementType: "int", length: 0 };
                }
                const firstElemType = this.inferExpressionType(expr.elements[0]);
                if (firstElemType && isPrimitiveType(firstElemType)) {
                    return { kind: "tuple", elementType: firstElemType, length: expr.elements.length };
                }
                return { kind: "tuple", elementType: "int", length: expr.elements.length };
            }
            case "RangeExpression":
                // Range always produces an int array
                return { kind: "array", elementType: "int" };
            case "IndexAccess": {
                const containerType = this.inferExpressionType(expr.array);
                if (containerType && isArrayType(containerType)) {
                    return containerType.elementType;
                }
                if (containerType && isTupleType(containerType)) {
                    return containerType.elementType;
                }
                return null;
            }
            case "MethodCall": {
                const objectType = this.inferExpressionType(expr.object);
                // String methods
                if (objectType === "string") {
                    if (expr.method === "len") {
                        return "int";
                    }
                    if (expr.method === "at") {
                        return "string";
                    }
                    // UFCS: check if there's a function with this name
                    const funcInfo = this.functions.get(expr.method);
                    if (funcInfo) {
                        // For imported functions, infer return type based on known std/string functions
                        if (funcInfo.imported) {
                            // Functions that return bool
                            if (["has", "starts", "ends"].includes(expr.method)) {
                                return "bool";
                            }
                            // Functions that return int
                            if (["find"].includes(expr.method)) {
                                return "int";
                            }
                            // Functions that return string array
                            if (["split"].includes(expr.method)) {
                                return { kind: "array", elementType: "string" };
                            }
                            // Most string functions return string
                            return "string";
                        }
                        if (funcInfo.returnType !== "void") {
                            return funcInfo.returnType;
                        }
                    }
                }
                // Array methods
                if (objectType && isArrayType(objectType)) {
                    if (expr.method === "len") {
                        return "int";
                    }
                    if (expr.method === "pop") {
                        return objectType.elementType;
                    }
                    // UFCS: check if there's a function with this name
                    const funcInfo = this.functions.get(expr.method);
                    if (funcInfo) {
                        // For imported functions, infer return type based on known std/array functions
                        if (funcInfo.imported) {
                            // Functions that return bool
                            if (["includes", "isEmpty"].includes(expr.method)) {
                                return "bool";
                            }
                            // Functions that return int
                            if (["indexOf", "lastIndexOf", "count"].includes(expr.method)) {
                                return "int";
                            }
                            // Functions that return float
                            if (["sum", "product", "average", "minVal", "maxVal"].includes(expr.method)) {
                                return objectType.elementType === "float" ? "float" : "int";
                            }
                            // Functions that return string
                            if (["join"].includes(expr.method)) {
                                return "string";
                            }
                            // Functions that return the element type
                            if (["first", "last"].includes(expr.method)) {
                                return objectType.elementType;
                            }
                            // Functions that return same array type
                            if ([
                                "reverse",
                                "slice",
                                "concat",
                                "flat",
                                "flatDeep",
                                "fill",
                                "fillRange",
                                "sort",
                                "sortDesc",
                                "sortStr",
                                "unique",
                            ].includes(expr.method)) {
                                return objectType;
                            }
                        }
                        if (funcInfo.returnType !== "void") {
                            return funcInfo.returnType;
                        }
                    }
                }
                // Tuple methods
                if (objectType && isTupleType(objectType)) {
                    if (expr.method === "len") {
                        return "int";
                    }
                    // UFCS: check if there's a function with this name
                    const funcInfo = this.functions.get(expr.method);
                    if (funcInfo && funcInfo.returnType !== "void") {
                        return funcInfo.returnType;
                    }
                }
                // J type methods
                if (objectType && isJType(objectType)) {
                    if (expr.method === "has")
                        return "bool";
                    if (expr.method === "len")
                        return "int";
                    if (expr.method === "get")
                        return null; // Dynamic type
                    if (expr.method === "set")
                        return null;
                }
                // Struct methods
                if (objectType && isStructType(objectType)) {
                    const structInfo = this.structs.get(objectType.name);
                    if (structInfo) {
                        const methodInfo = structInfo.methods.get(expr.method);
                        if (methodInfo && methodInfo.returnType !== "void") {
                            return methodInfo.returnType;
                        }
                    }
                }
                // UFCS for any other type (including int/float for math functions)
                const funcInfo = this.functions.get(expr.method);
                if (funcInfo) {
                    // For imported functions on int/float, infer return type based on known std/math functions
                    if (funcInfo.imported && (objectType === "int" || objectType === "float")) {
                        // Functions that always return int
                        if (["floor", "ceil", "round", "trunc", "sign"].includes(expr.method)) {
                            return "int";
                        }
                        // Functions that always return float
                        if ([
                            "sqrt",
                            "cbrt",
                            "exp",
                            "log",
                            "log10",
                            "log2",
                            "sin",
                            "cos",
                            "tan",
                            "asin",
                            "acos",
                            "atan",
                            "atan2",
                            "sinh",
                            "cosh",
                            "tanh",
                            "random",
                            "PI",
                            "E",
                        ].includes(expr.method)) {
                            return "float";
                        }
                        // Functions that preserve type (abs, pow, min, max)
                        if (["abs", "pow", "min", "max", "randomInt"].includes(expr.method)) {
                            return objectType;
                        }
                    }
                    if (funcInfo.returnType !== "void") {
                        return funcInfo.returnType;
                    }
                }
                return null;
            }
            case "MemberExpression": {
                const objectType = this.inferExpressionType(expr.object);
                if (objectType && isStructType(objectType)) {
                    const structInfo = this.structs.get(objectType.name);
                    if (structInfo) {
                        const field = structInfo.fields.find((f) => f.name === expr.property);
                        if (field) {
                            return field.dataType;
                        }
                    }
                }
                // J type member access: dynamic type
                if (objectType && isJType(objectType)) {
                    return null;
                }
                // Property access on non-struct - can't infer type without module info
                return null;
            }
            case "EnumAccess":
                // Return the enum type
                if (this.enums.has(expr.enumName)) {
                    return { kind: "enum", name: expr.enumName };
                }
                return null;
            case "StructInstantiation":
                // Return the struct type
                if (this.structs.has(expr.structName)) {
                    return { kind: "struct", name: expr.structName };
                }
                return null;
            case "MatchExpression":
                // Infer type from the first arm's result expression
                for (const arm of expr.arms) {
                    if (arm.resultExpression) {
                        return this.inferExpressionType(arm.resultExpression);
                    }
                }
                return null;
            case "SpawnExpression":
                return { kind: "struct", name: "Spawn" };
            case "CompTimeExpression":
                // The type of a compile-time expression is the type of its inner expression
                return this.inferExpressionType(expr.expression);
            default:
                return null;
        }
    }
}
