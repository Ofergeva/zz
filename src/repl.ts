// ZZ REPL — Interactive ZZ language session
// Accumulates source for correct type checking, executes only new statements

import * as readline from "readline";
import * as vm from "vm";
import * as path from "path";
import { fileURLToPath } from "url";
import { Lexer, TokenType } from "./lexer.js";
import { Parser } from "./parser.js";
import { TypeChecker } from "./typechecker.js";
import { CodeGenerator, CodeGenOptions } from "./codegen.js";

export class ZZRepl {
	private sourceLines: string[] = [];
	private previousJsStatements: number = 0;
	private vmContext: vm.Context;
	private stdLibDir: string;
	private rl: readline.Interface | null = null;

	constructor() {
		// Set up VM context with common globals
		this.vmContext = vm.createContext({
			console: {
				log: (...args: any[]) => {
					console.log(...args);
				},
				error: (...args: any[]) => {
					console.error(...args);
				},
			},
			setTimeout,
			setInterval,
			clearTimeout,
			clearInterval,
			Math,
			Number,
			String,
			Boolean,
			Array,
			Object,
			JSON,
			Date,
			RegExp,
			Error,
			parseInt,
			parseFloat,
			isNaN,
			isFinite,
			Infinity,
			NaN,
			undefined,
		});

		// Compute std lib directory
		const __filename_resolved = fileURLToPath(import.meta.url);
		const __dirname_resolved = path.dirname(__filename_resolved);
		this.stdLibDir = path.resolve(__dirname_resolved, '..', 'std');
	}

	async run(): Promise<void> {
		console.log("ZZ REPL v0.1.0");
		console.log("Type ZZ expressions. Commands: .help, .clear, .source, .exit");
		console.log("");

		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: "zz> ",
		});

		let multiLineBuffer = "";

		this.rl.prompt();

		for await (const line of this.rl) {
			const trimmed = line.trim();

			// Handle special commands
			if (trimmed === ".exit" || trimmed === ".quit") {
				break;
			}
			if (trimmed === ".help") {
				this.printHelp();
				this.rl.prompt();
				continue;
			}
			if (trimmed === ".clear") {
				this.sourceLines = [];
				this.previousJsStatements = 0;
				this.vmContext = vm.createContext({
					console: {
						log: (...args: any[]) => console.log(...args),
						error: (...args: any[]) => console.error(...args),
					},
					setTimeout, setInterval, clearTimeout, clearInterval,
					Math, Number, String, Boolean, Array, Object, JSON, Date,
					RegExp, Error, parseInt, parseFloat, isNaN, isFinite,
					Infinity, NaN, undefined,
				});
				console.log("State cleared.");
				this.rl.prompt();
				continue;
			}
			if (trimmed === ".source") {
				if (this.sourceLines.length === 0) {
					console.log("(no source accumulated)");
				} else {
					console.log(this.sourceLines.join("\n"));
				}
				this.rl.prompt();
				continue;
			}

			// Accumulate multi-line input
			multiLineBuffer += (multiLineBuffer ? "\n" : "") + line;

			if (!this.isComplete(multiLineBuffer)) {
				this.rl.setPrompt("... ");
				this.rl.prompt();
				continue;
			}

			// Process complete input
			const input = multiLineBuffer;
			multiLineBuffer = "";
			this.rl.setPrompt("zz> ");

			if (input.trim() === "") {
				this.rl.prompt();
				continue;
			}

			try {
				await this.processInput(input);
			} catch (e: any) {
				console.error(e.message || String(e));
			}

			this.rl.prompt();
		}

		console.log("\nBye!");
	}

	private async processInput(input: string): Promise<void> {
		// Try the input as-is first; if parsing fails, retry wrapped in print()
		const success = await this.tryCompileAndRun(input);
		if (!success) {
			// If the input looks like a bare expression, try wrapping in print()
			const trimmed = input.trim();
			if (trimmed && !trimmed.endsWith(';') && !trimmed.startsWith('//')) {
				const wrapped = `print(${trimmed})`;
				await this.tryCompileAndRun(wrapped);
			}
		}
	}

	// Returns true on success, false on failure (with rollback)
	private async tryCompileAndRun(input: string): Promise<boolean> {
		// Save current state for rollback
		const savedLines = [...this.sourceLines];
		const savedStmtCount = this.previousJsStatements;

		// Append new input
		this.sourceLines.push(input);
		const fullSource = this.sourceLines.join("\n");

		try {
			// Lex
			const lexer = new Lexer(fullSource);
			const tokens = lexer.tokenize();

			// Collect type names
			const structNames = new Set<string>();
			const enumNames = new Set<string>();
			const traitNames = new Set<string>();
			for (let i = 0; i < tokens.length - 1; i++) {
				if (tokens[i].type === TokenType.ENUM && tokens[i + 1].type === TokenType.IDENTIFIER) {
					enumNames.add(tokens[i + 1].value);
				} else if (tokens[i].type === TokenType.STRUCT && tokens[i + 1].type === TokenType.IDENTIFIER) {
					structNames.add(tokens[i + 1].value);
				} else if (tokens[i].type === TokenType.TRAIT && tokens[i + 1].type === TokenType.IDENTIFIER) {
					traitNames.add(tokens[i + 1].value);
				}
			}

			// Parse
			const parser = new Parser(tokens, { structNames, enumNames, traitNames });
			const ast = parser.parse();

			// Type check
			const typeChecker = new TypeChecker();
			const typeErrors = typeChecker.check(ast, fullSource);
			if (typeErrors.length > 0) {
				// Rollback
				this.sourceLines = savedLines;
				for (const err of typeErrors) {
					console.error(extractErrorMessage(err));
				}
				return false;
			}

			// Generate JS
			const codeGenOptions: CodeGenOptions = {
				sourceDir: process.cwd(),
				outputDir: process.cwd(),
				stdLibDir: this.stdLibDir,
			};
			const codeGen = new CodeGenerator(codeGenOptions);
			const fullJs = codeGen.generate(ast);

			// Extract only new statements
			const jsStatements = splitTopLevelStatements(fullJs);
			const totalStatements = jsStatements.length;
			const newStatements = jsStatements.slice(this.previousJsStatements);

			if (newStatements.length === 0) {
				return true;
			}

			// Transform for REPL: make declarations persist in VM context
			const transformedJs = newStatements.map(s => replTransform(s)).join("\n");

			// Wrap in async IIFE for top-level await support
			// Use var so declarations leak to the function's scope,
			// and assign to globalThis for cross-invocation persistence
			const wrappedJs = `(async () => { ${transformedJs} })()`;

			const result = vm.runInContext(wrappedJs, this.vmContext);
			await result; // await the async IIFE

			this.previousJsStatements = totalStatements;
			return true;
		} catch (e: any) {
			// Rollback on error
			this.sourceLines = savedLines;
			this.previousJsStatements = savedStmtCount;
			return false;
		}
	}

	private isComplete(source: string): boolean {
		let parenDepth = 0;
		let bracketDepth = 0;
		let braceDepth = 0;
		let inString = false;
		let stringChar = '';

		for (let i = 0; i < source.length; i++) {
			const ch = source[i];

			if (inString) {
				if (ch === '\\' && i + 1 < source.length) {
					i++; // skip escaped char
					continue;
				}
				if (ch === stringChar) {
					inString = false;
				}
				continue;
			}

			if (ch === '"' || ch === "'") {
				inString = true;
				stringChar = ch;
				continue;
			}

			if (ch === '/' && i + 1 < source.length && source[i + 1] === '/') {
				// line comment — skip rest of line
				while (i < source.length && source[i] !== '\n') i++;
				continue;
			}

			switch (ch) {
				case '(': parenDepth++; break;
				case ')': parenDepth--; break;
				case '[': bracketDepth++; break;
				case ']': bracketDepth--; break;
				case '{': braceDepth++; break;
				case '}': braceDepth--; break;
			}
		}

		// Incomplete if any delimiters are unmatched
		if (parenDepth > 0 || bracketDepth > 0 || braceDepth > 0) {
			return false;
		}

		const trimmed = source.trim();
		if (trimmed === '') return true;

		// Use the lexer to do a quick token-based completeness check
		// Count ZZ block openers vs terminators (;)
		try {
			const lexer = new Lexer(source);
			const tokens = lexer.tokenize();

			// Track ZZ block depth: blocks opened by S, E, ZZ, Z (function),
			// ?(), @(), ??(), ? (try), :?(), :
			let blockDepth = 0;
			for (let i = 0; i < tokens.length; i++) {
				const t = tokens[i];
				switch (t.type) {
					case TokenType.STRUCT:
					case TokenType.ENUM:
					case TokenType.TRAIT:
					case TokenType.FUNC:      // Z — function declaration
					case TokenType.IF:        // ? — if/try
					case TokenType.WHILE:     // @ — while/for/foreach
					case TokenType.MATCH:     // ?? — pattern matching
						blockDepth++;
						break;
					// ELSE (:) and ELSE_IF (:?) do NOT open new blocks —
					// they continue the existing if block
					case TokenType.SEMICOLON:
						blockDepth--;
						break;
				}
			}

			return blockDepth <= 0;
		} catch {
			// If lexing fails, assume incomplete if it doesn't end with ;
			return trimmed.endsWith(';');
		}
	}

	private printHelp(): void {
		console.log("ZZ REPL Commands:");
		console.log("  .help    Show this help message");
		console.log("  .clear   Reset all state");
		console.log("  .source  Show accumulated source code");
		console.log("  .exit    Exit the REPL (also Ctrl+D)");
		console.log("");
		console.log("Enter ZZ code to evaluate. Multi-line input is supported.");
		console.log("All standard ZZ syntax is available.");
	}
}

// Extract a clean error message
function extractErrorMessage(error: string): string {
	const lines = error.split('\n');
	const messageLine = lines.find(l => l.startsWith('Error at') || !l.match(/^\s*\d+\s*\|/));
	if (messageLine) {
		const match = messageLine.match(/Error at line \d+(?:, column \d+)?: (.+)/);
		return match ? match[1] : messageLine;
	}
	return error;
}

// Transform JS for REPL execution:
// - const/let declarations → globalThis assignments (persist across invocations)
// - class declarations → assign to globalThis
// - function declarations → assign to globalThis
function replTransform(stmt: string): string {
	const trimmed = stmt.trim();

	// const x = ... → globalThis.x = ...
	const constMatch = trimmed.match(/^const\s+(\w+)\s*=\s*/);
	if (constMatch) {
		const varName = constMatch[1];
		const rest = trimmed.slice(constMatch[0].length);
		return `globalThis.${varName} = ${rest}`;
	}

	// let x = ... → globalThis.x = ...
	const letMatch = trimmed.match(/^let\s+(\w+)\s*=\s*/);
	if (letMatch) {
		const varName = letMatch[1];
		const rest = trimmed.slice(letMatch[0].length);
		return `globalThis.${varName} = ${rest}`;
	}

	// class Foo { ... } → class Foo { ... }; globalThis.Foo = Foo;
	const classMatch = trimmed.match(/^class\s+(\w+)/);
	if (classMatch) {
		const className = classMatch[1];
		return `${stmt}\nglobalThis.${className} = ${className};`;
	}

	// async function foo() { ... } → ...; globalThis.foo = foo;
	const funcMatch = trimmed.match(/^async\s+function\s+(\w+)/);
	if (funcMatch) {
		const funcName = funcMatch[1];
		return `${stmt}\nglobalThis.${funcName} = ${funcName};`;
	}

	// function foo() { ... } → ...; globalThis.foo = foo;
	const plainFuncMatch = trimmed.match(/^function\s+(\w+)/);
	if (plainFuncMatch) {
		const funcName = plainFuncMatch[1];
		return `${stmt}\nglobalThis.${funcName} = ${funcName};`;
	}

	return stmt;
}

// Split generated JS into top-level statements
// The ZZ codegen produces predictable output where each top-level statement
// is either a class/function declaration or a standalone statement
function splitTopLevelStatements(js: string): string[] {
	const statements: string[] = [];
	const lines = js.split('\n');
	let current = '';
	let braceDepth = 0;

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed === '') continue;

		// Track brace depth for class/function bodies
		for (const ch of trimmed) {
			if (ch === '{') braceDepth++;
			else if (ch === '}') braceDepth--;
		}

		current += (current ? '\n' : '') + line;

		// Statement is complete when brace depth returns to 0
		if (braceDepth === 0) {
			if (current.trim()) {
				statements.push(current);
			}
			current = '';
		}
	}

	// Any remaining content
	if (current.trim()) {
		statements.push(current);
	}

	return statements;
}
