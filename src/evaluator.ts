// Compile-Time Evaluator for ZZ Language
// AST-walking interpreter that evaluates ${} expressions at compile time

import * as fs from "fs";
import * as path from "path";
import {
	Program,
	Statement,
	Expression,
	CompTimeExpression,
	CompTimeFunctionDeclaration,
	CompTimeValue,
	BinaryExpression,
	UnaryExpression,
	FunctionCall,
	ArrayLiteral,
	TupleLiteral,
	JLiteral,
	MatchExpression,
	Parameter,
	PrimitiveType,
} from "./ast.js";

interface CompTimeScope {
	variables: Map<string, CompTimeValue>;
	functions: Map<string, CompTimeFunctionDeclaration>;
}

// Security and performance limits
const MAX_RECURSION_DEPTH = 1000;
const MAX_ITERATIONS = 100000;

export class CompTimeEvaluator {
	private scope: CompTimeScope;
	private sourceDir: string;
	private sourceFile: string;
	private errors: string[] = [];
	private recursionDepth: number = 0;
	private iterationCount: number = 0;

	constructor(sourceDir: string, sourceFile: string = "unknown.zz") {
		this.sourceDir = sourceDir;
		this.sourceFile = sourceFile;
		this.scope = {
			variables: new Map(),
			functions: new Map(),
		};
	}

	// Validate that a path doesn't escape the source directory (prevent path traversal)
	private validatePath(requestedPath: string): string {
		const resolved = path.resolve(this.sourceDir, requestedPath);
		const normalizedSourceDir = path.resolve(this.sourceDir);

		// Check if the resolved path is within the source directory
		if (!resolved.startsWith(normalizedSourceDir + path.sep) && resolved !== normalizedSourceDir) {
			throw new Error(`$read: Path traversal detected. Cannot access '${requestedPath}' outside source directory.`);
		}

		return resolved;
	}

	// Check and increment recursion depth
	private enterRecursion(): void {
		this.recursionDepth++;
		if (this.recursionDepth > MAX_RECURSION_DEPTH) {
			throw new Error(`Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded in compile-time execution`);
		}
	}

	// Decrement recursion depth
	private exitRecursion(): void {
		this.recursionDepth--;
	}

	// Check iteration count to prevent infinite loops
	private checkIteration(): void {
		this.iterationCount++;
		if (this.iterationCount > MAX_ITERATIONS) {
			throw new Error(`Maximum iteration count (${MAX_ITERATIONS}) exceeded in compile-time execution`);
		}
	}

	evaluate(program: Program): string[] {
		this.errors = [];
		// Reset counters at the start of each evaluation
		this.recursionDepth = 0;
		this.iterationCount = 0;

		// First pass: collect $Z function declarations
		for (const stmt of program.statements) {
			if (stmt.type === "CompTimeFunctionDeclaration") {
				this.scope.functions.set(stmt.name, stmt);
			}
		}

		// Second pass: evaluate all ${} expressions in the program
		this.evaluateStatements(program.statements);

		return this.errors;
	}

	private evaluateStatements(statements: Statement[]): void {
		for (const stmt of statements) {
			this.evaluateStatement(stmt);
		}
	}

	private evaluateStatement(stmt: Statement): void {
		switch (stmt.type) {
			case "VariableDeclaration":
				// Evaluate the value expression if it contains compile-time expressions
				this.findAndEvaluateCompTimeExprs(stmt.value);
				break;
			case "PrintStatement":
				this.findAndEvaluateCompTimeExprs(stmt.expression);
				break;
			case "ErrorStatement":
				this.findAndEvaluateCompTimeExprs(stmt.expression);
				break;
			case "Assignment":
				this.findAndEvaluateCompTimeExprs(stmt.value);
				break;
			case "WhileStatement":
				this.findAndEvaluateCompTimeExprs(stmt.condition);
				this.evaluateStatements(stmt.body);
				break;
			case "ForStatement":
				this.findAndEvaluateCompTimeExprs(stmt.start);
				this.findAndEvaluateCompTimeExprs(stmt.end);
				this.evaluateStatements(stmt.body);
				break;
			case "ForEachStatement":
				this.findAndEvaluateCompTimeExprs(stmt.iterable);
				this.evaluateStatements(stmt.body);
				break;
			case "IfStatement":
				this.findAndEvaluateCompTimeExprs(stmt.ifBranch.condition);
				this.evaluateStatements(stmt.ifBranch.body);
				for (const branch of stmt.elseIfBranches) {
					this.findAndEvaluateCompTimeExprs(branch.condition);
					this.evaluateStatements(branch.body);
				}
				if (stmt.elseBranch) {
					this.evaluateStatements(stmt.elseBranch);
				}
				break;
			case "FunctionDeclaration":
				// Evaluate CT expressions in function body
				this.evaluateStatements(stmt.body);
				if (stmt.returnExpression) {
					this.findAndEvaluateCompTimeExprs(stmt.returnExpression);
				}
				break;
			case "ExpressionStatement":
				this.findAndEvaluateCompTimeExprs(stmt.expression);
				break;
			case "IndexAssignment":
				this.findAndEvaluateCompTimeExprs(stmt.array);
				this.findAndEvaluateCompTimeExprs(stmt.index);
				this.findAndEvaluateCompTimeExprs(stmt.value);
				break;
			case "FieldAssignment":
				this.findAndEvaluateCompTimeExprs(stmt.object);
				this.findAndEvaluateCompTimeExprs(stmt.value);
				break;
			case "TryStatement":
				this.evaluateStatements(stmt.tryBody);
				this.evaluateStatements(stmt.catchBody);
				break;
			case "ThrowStatement":
				this.findAndEvaluateCompTimeExprs(stmt.expression);
				break;
			case "CompoundAssignment":
				this.findAndEvaluateCompTimeExprs(stmt.value);
				break;
			case "StructDeclaration":
				for (const method of stmt.methods) {
					this.evaluateStatements(method.body);
					if (method.returnExpression) {
						this.findAndEvaluateCompTimeExprs(method.returnExpression);
					}
				}
				break;
			case "MatchExpression":
				this.findAndEvaluateCompTimeExprs(stmt.value);
				for (const arm of stmt.arms) {
					this.evaluateStatements(arm.body);
					if (arm.resultExpression) {
						this.findAndEvaluateCompTimeExprs(arm.resultExpression);
					}
					if (arm.guard) {
						this.findAndEvaluateCompTimeExprs(arm.guard);
					}
				}
				break;
			// These don't contain expressions that need evaluation
			case "ImportStatement":
			case "EnumDeclaration":
			case "BreakStatement":
			case "ContinueStatement":
			case "IncrementStatement":
			case "JSBlockStatement":
			case "CompTimeFunctionDeclaration":
				break;
		}
	}

	private findAndEvaluateCompTimeExprs(expr: Expression): void {
		if (expr.type === "CompTimeExpression") {
			// Evaluate this compile-time expression
			const ctExpr = expr as CompTimeExpression;
			try {
				ctExpr.evaluatedValue = this.evaluateExpression(ctExpr.expression);
			} catch (e) {
				this.errors.push(`Compile-time error at line ${expr.line}: ${(e as Error).message}`);
				ctExpr.evaluatedValue = { kind: "null" };
			}
			return;
		}

		// Recursively find CompTimeExpressions in sub-expressions
		switch (expr.type) {
			case "BinaryExpression":
				this.findAndEvaluateCompTimeExprs(expr.left);
				this.findAndEvaluateCompTimeExprs(expr.right);
				break;
			case "UnaryExpression":
				this.findAndEvaluateCompTimeExprs(expr.operand);
				break;
			case "InterpolatedString":
				for (const part of expr.parts) {
					if (part.kind === "expr") {
						this.findAndEvaluateCompTimeExprs(part.value);
					}
				}
				break;
			case "CastExpression":
				this.findAndEvaluateCompTimeExprs(expr.expression);
				break;
			case "FunctionCall":
				for (const arg of expr.arguments) {
					this.findAndEvaluateCompTimeExprs(arg.value);
				}
				break;
			case "ArrayLiteral":
				for (const elem of expr.elements) {
					this.findAndEvaluateCompTimeExprs(elem);
				}
				break;
			case "TupleLiteral":
				for (const elem of expr.elements) {
					this.findAndEvaluateCompTimeExprs(elem);
				}
				break;
			case "RangeExpression":
				this.findAndEvaluateCompTimeExprs(expr.start);
				this.findAndEvaluateCompTimeExprs(expr.end);
				break;
			case "IndexAccess":
				this.findAndEvaluateCompTimeExprs(expr.array);
				this.findAndEvaluateCompTimeExprs(expr.index);
				break;
			case "MethodCall":
				this.findAndEvaluateCompTimeExprs(expr.object);
				for (const arg of expr.arguments) {
					this.findAndEvaluateCompTimeExprs(arg);
				}
				break;
			case "MemberExpression":
				this.findAndEvaluateCompTimeExprs(expr.object);
				break;
			case "StructInstantiation":
				for (const arg of expr.arguments) {
					this.findAndEvaluateCompTimeExprs(arg.value);
				}
				break;
			case "JLiteral":
				for (const field of expr.fields) {
					this.findAndEvaluateCompTimeExprs(field.value);
				}
				break;
			case "MatchExpression":
				this.findAndEvaluateCompTimeExprs(expr.value);
				for (const arm of expr.arms) {
					if (arm.resultExpression) {
						this.findAndEvaluateCompTimeExprs(arm.resultExpression);
					}
					if (arm.guard) {
						this.findAndEvaluateCompTimeExprs(arm.guard);
					}
				}
				break;
			case "SpawnExpression":
				if (expr.call.type === "FunctionCall") {
					for (const arg of expr.call.arguments) {
						this.findAndEvaluateCompTimeExprs(arg.value);
					}
				} else {
					this.findAndEvaluateCompTimeExprs(expr.call.object);
					for (const arg of expr.call.arguments) {
						this.findAndEvaluateCompTimeExprs(arg);
					}
				}
				break;
			// Literals and identifiers don't have sub-expressions
			case "StringLiteral":
			case "NumberLiteral":
			case "BoolLiteral":
			case "NullLiteral":
			case "Identifier":
			case "EnumAccess":
				break;
		}
	}

	private evaluateExpression(expr: Expression): CompTimeValue {
		// Track iterations to prevent runaway compile-time execution
		this.checkIteration();

		switch (expr.type) {
			case "NumberLiteral":
				return expr.isFloat
					? { kind: "float", value: expr.value }
					: { kind: "int", value: expr.value };

			case "StringLiteral":
				return { kind: "string", value: expr.value };

			case "BoolLiteral":
				return { kind: "bool", value: expr.value };

			case "NullLiteral":
				return { kind: "null" };

			case "Identifier": {
				// Check for compile-time variable in current scope
				const value = this.scope.variables.get(expr.name);
				if (value) {
					return value;
				}
				throw new Error(`Undefined compile-time variable '${expr.name}'`);
			}

			case "BinaryExpression":
				return this.evaluateBinaryExpr(expr);

			case "UnaryExpression":
				return this.evaluateUnaryExpr(expr);

			case "InterpolatedString": {
				let result = "";
				for (const part of expr.parts) {
					if (part.kind === "text") {
						result += part.value;
					} else {
						const value = this.evaluateExpression(part.value);
						result += this.valueToString(value);
					}
				}
				return { kind: "string", value: result };
			}

			case "FunctionCall":
				return this.evaluateFunctionCall(expr);

			case "ArrayLiteral": {
				const values = expr.elements.map((e) => this.evaluateExpression(e));
				const elementType = values.length > 0 ? this.inferPrimitiveType(values[0]) : "int";
				return { kind: "array", elementType, values };
			}

			case "TupleLiteral": {
				const values = expr.elements.map((e) => this.evaluateExpression(e));
				const elementType = values.length > 0 ? this.inferPrimitiveType(values[0]) : "int";
				return { kind: "tuple", elementType, values };
			}

			case "JLiteral": {
				const fields = expr.fields.map((f) => ({
					key: f.key,
					value: this.evaluateExpression(f.value),
				}));
				return { kind: "j", fields };
			}

			case "MatchExpression":
				return this.evaluateMatch(expr);

			case "CompTimeExpression":
				// Nested compile-time expression - evaluate inner
				return this.evaluateExpression(expr.expression);

			default:
				throw new Error(`Cannot evaluate expression of type '${expr.type}' at compile time`);
		}
	}

	private evaluateBinaryExpr(expr: BinaryExpression): CompTimeValue {
		const left = this.evaluateExpression(expr.left);
		const right = this.evaluateExpression(expr.right);

		// String concatenation
		if (expr.operator === "+" && left.kind === "string" && right.kind === "string") {
			return { kind: "string", value: left.value + right.value };
		}

		// Numeric operations
		if ((left.kind === "int" || left.kind === "float") && (right.kind === "int" || right.kind === "float")) {
			const l = left.value;
			const r = right.value;
			const isFloat = left.kind === "float" || right.kind === "float";

			switch (expr.operator) {
				case "+":
					return isFloat ? { kind: "float", value: l + r } : { kind: "int", value: l + r };
				case "-":
					return isFloat ? { kind: "float", value: l - r } : { kind: "int", value: l - r };
				case "*":
					return isFloat ? { kind: "float", value: l * r } : { kind: "int", value: l * r };
				case "/":
					if (r === 0) throw new Error("Division by zero");
					return { kind: "float", value: l / r };
				case "%":
					if (r === 0) throw new Error("Modulo by zero");
					return { kind: "int", value: Math.trunc(l) % Math.trunc(r) };
				case "**":
					return isFloat ? { kind: "float", value: Math.pow(l, r) } : { kind: "int", value: Math.pow(l, r) };
				case ">":
					return { kind: "bool", value: l > r };
				case "<":
					return { kind: "bool", value: l < r };
				case ">=":
					return { kind: "bool", value: l >= r };
				case "<=":
					return { kind: "bool", value: l <= r };
				case "==":
					return { kind: "bool", value: l === r };
				case "!=":
					return { kind: "bool", value: l !== r };
			}
		}

		// String comparison
		if (left.kind === "string" && right.kind === "string") {
			switch (expr.operator) {
				case "==":
					return { kind: "bool", value: left.value === right.value };
				case "!=":
					return { kind: "bool", value: left.value !== right.value };
			}
		}

		// Boolean operations
		if (left.kind === "bool" && right.kind === "bool") {
			switch (expr.operator) {
				case "&&":
					return { kind: "bool", value: left.value && right.value };
				case "||":
					return { kind: "bool", value: left.value || right.value };
				case "==":
					return { kind: "bool", value: left.value === right.value };
				case "!=":
					return { kind: "bool", value: left.value !== right.value };
			}
		}

		throw new Error(`Cannot apply operator '${expr.operator}' to ${left.kind} and ${right.kind}`);
	}

	private evaluateUnaryExpr(expr: UnaryExpression): CompTimeValue {
		const operand = this.evaluateExpression(expr.operand);

		if (expr.operator === "-") {
			if (operand.kind === "int") {
				return { kind: "int", value: -operand.value };
			}
			if (operand.kind === "float") {
				return { kind: "float", value: -operand.value };
			}
		}

		if (expr.operator === "!") {
			if (operand.kind === "bool") {
				return { kind: "bool", value: !operand.value };
			}
		}

		throw new Error(`Cannot apply unary '${expr.operator}' to ${operand.kind}`);
	}

	private evaluateFunctionCall(expr: FunctionCall): CompTimeValue {
		const name = expr.name;

		// Built-in compile-time functions
		if (name.startsWith("$")) {
			return this.evaluateBuiltin(expr);
		}

		// User-defined $Z function
		const func = this.scope.functions.get(name);
		if (!func) {
			throw new Error(`Unknown compile-time function '${name}'`);
		}

		// Check recursion depth before entering function
		this.enterRecursion();

		try {
			// Evaluate arguments
			const args = expr.arguments.map((arg) => this.evaluateExpression(arg.value));

			// Create new scope for function execution
			const savedVariables = new Map(this.scope.variables);

			// Bind parameters to arguments
			for (let i = 0; i < func.parameters.length; i++) {
				const param = func.parameters[i];
				const arg = args[i];
				if (arg === undefined) {
					throw new Error(`Missing argument for parameter '${param.name}' in function '${name}'`);
				}
				this.scope.variables.set(param.name, arg);
			}

			// Execute function body
			for (const stmt of func.body) {
				this.evaluateCtStatement(stmt);
			}

			// Evaluate return expression
			let result: CompTimeValue = { kind: "null" };
			if (func.returnExpression) {
				result = this.evaluateExpression(func.returnExpression);
			}

			// Restore scope
			this.scope.variables = savedVariables;

			return result;
		} finally {
			this.exitRecursion();
		}
	}

	private evaluateCtStatement(stmt: Statement): void {
		// Execute statements within a $Z function body
		switch (stmt.type) {
			case "VariableDeclaration": {
				const value = this.evaluateExpression(stmt.value);
				this.scope.variables.set(stmt.name, value);
				break;
			}
			case "Assignment": {
				const value = this.evaluateExpression(stmt.value);
				this.scope.variables.set(stmt.name, value);
				break;
			}
			case "IfStatement": {
				const condition = this.evaluateExpression(stmt.ifBranch.condition);
				if (condition.kind !== "bool") {
					throw new Error("If condition must be boolean");
				}
				if (condition.value) {
					for (const s of stmt.ifBranch.body) {
						this.evaluateCtStatement(s);
					}
				} else {
					let executed = false;
					for (const branch of stmt.elseIfBranches) {
						const branchCond = this.evaluateExpression(branch.condition);
						if (branchCond.kind === "bool" && branchCond.value) {
							for (const s of branch.body) {
								this.evaluateCtStatement(s);
							}
							executed = true;
							break;
						}
					}
					if (!executed && stmt.elseBranch) {
						for (const s of stmt.elseBranch) {
							this.evaluateCtStatement(s);
						}
					}
				}
				break;
			}
			default:
				// Other statements are not supported in CT function bodies
				break;
		}
	}

	private evaluateBuiltin(expr: FunctionCall): CompTimeValue {
		const name = expr.name;
		const args = expr.arguments;

		switch (name) {
			case "$read": {
				if (args.length < 1) {
					throw new Error("$read requires a path argument");
				}
				const pathArg = this.evaluateExpression(args[0].value);
				if (pathArg.kind !== "string") {
					throw new Error("$read requires a string path");
				}
				// Validate path to prevent traversal attacks
				const fullPath = this.validatePath(pathArg.value);
				try {
					const content = fs.readFileSync(fullPath, "utf-8");
					return { kind: "string", value: content };
				} catch {
					throw new Error(`$read: File not found '${fullPath}'`);
				}
			}

			case "$env": {
				if (args.length < 1) {
					throw new Error("$env requires a name argument");
				}
				const nameArg = this.evaluateExpression(args[0].value);
				if (nameArg.kind !== "string") {
					throw new Error("$env requires a string name");
				}
				const value = process.env[nameArg.value];
				if (value === undefined) {
					if (args.length > 1) {
						return this.evaluateExpression(args[1].value);
					}
					return { kind: "string", value: "" };
				}
				return { kind: "string", value };
			}

			case "$defined": {
				if (args.length < 1) {
					throw new Error("$defined requires a name argument");
				}
				const nameArg = this.evaluateExpression(args[0].value);
				if (nameArg.kind !== "string") {
					throw new Error("$defined requires a string name");
				}
				return { kind: "bool", value: process.env[nameArg.value] !== undefined };
			}

			case "$line":
				return { kind: "int", value: expr.line };

			case "$file":
				return { kind: "string", value: this.sourceFile };

			case "$date":
				return { kind: "string", value: new Date().toISOString().split("T")[0] };

			case "$time":
				return { kind: "string", value: new Date().toISOString() };

			default:
				throw new Error(`Unknown compile-time builtin '${name}'`);
		}
	}

	private evaluateMatch(expr: MatchExpression): CompTimeValue {
		const value = this.evaluateExpression(expr.value);

		for (const arm of expr.arms) {
			if (this.patternMatches(arm.pattern, value)) {
				// Check guard if present
				if (arm.guard) {
					const guardResult = this.evaluateExpression(arm.guard);
					if (guardResult.kind !== "bool" || !guardResult.value) {
						continue;
					}
				}

				if (arm.resultExpression) {
					return this.evaluateExpression(arm.resultExpression);
				}
				return { kind: "null" };
			}
		}

		throw new Error("No matching pattern in compile-time match expression");
	}

	private patternMatches(pattern: import("./ast.js").Pattern, value: CompTimeValue): boolean {
		switch (pattern.kind) {
			case "wildcard":
				return true;

			case "literal": {
				const litValue = this.evaluateExpression(pattern.value);
				return this.valuesEqual(litValue, value);
			}

			case "binding":
				// Bind the value to the variable name
				this.scope.variables.set(pattern.name, value);
				return true;

			default:
				// Enum, struct, tuple, J patterns - simplified handling
				return false;
		}
	}

	private valuesEqual(a: CompTimeValue, b: CompTimeValue): boolean {
		if (a.kind !== b.kind) return false;

		switch (a.kind) {
			case "int":
			case "float":
				return a.value === (b as typeof a).value;
			case "string":
				return a.value === (b as { kind: "string"; value: string }).value;
			case "bool":
				return a.value === (b as { kind: "bool"; value: boolean }).value;
			case "null":
				return true;
			default:
				return false;
		}
	}

	private valueToString(value: CompTimeValue): string {
		switch (value.kind) {
			case "int":
			case "float":
				return value.value.toString();
			case "string":
				return value.value;
			case "bool":
				return value.value.toString();
			case "null":
				return "null";
			case "array":
			case "tuple":
				return "[" + value.values.map((v) => this.valueToString(v)).join(", ") + "]";
			case "j":
				return "{" + value.fields.map((f) => `${f.key}: ${this.valueToString(f.value)}`).join(", ") + "}";
		}
	}

	private inferPrimitiveType(value: CompTimeValue): PrimitiveType {
		switch (value.kind) {
			case "int":
				return "int";
			case "float":
				return "float";
			case "string":
				return "string";
			case "bool":
				return "bool";
			default:
				return "int"; // Default fallback
		}
	}
}
