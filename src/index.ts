#!/usr/bin/env node

// ZZ Language Compiler CLI

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { Lexer, TokenType, Token } from "./lexer.js";
import { Parser } from "./parser.js";
import { TypeChecker } from "./typechecker.js";
import { CodeGenerator, CodeGenOptions } from "./codegen.js";
import { CompTimeEvaluator } from "./evaluator.js";
import { Program, ImportedModuleInfo } from "./ast.js";

// Scan tokens for struct/enum names (same logic as Parser.collectTypeNames)
function collectTypeNamesFromTokens(tokens: Token[]): { structNames: Set<string>, enumNames: Set<string> } {
	const structNames = new Set<string>();
	const enumNames = new Set<string>();
	for (let i = 0; i < tokens.length - 1; i++) {
		if (tokens[i].type === TokenType.ENUM && tokens[i + 1].type === TokenType.IDENTIFIER) {
			enumNames.add(tokens[i + 1].value);
		} else if (tokens[i].type === TokenType.STRUCT && tokens[i + 1].type === TokenType.IDENTIFIER) {
			structNames.add(tokens[i + 1].value);
		}
	}
	return { structNames, enumNames };
}

// Extract exported type information from a parsed .zz AST
function extractExportedTypes(ast: Program): ImportedModuleInfo {
	const info: ImportedModuleInfo = {
		functions: new Map(),
		variables: new Map(),
		structs: new Map(),
		enums: new Map(),
	};

	for (const stmt of ast.statements) {
		switch (stmt.type) {
			case 'FunctionDeclaration':
				if (stmt.exported) {
					info.functions.set(stmt.name, {
						parameters: stmt.parameters,
						returnType: stmt.returnType,
					});
				}
				break;
			case 'VariableDeclaration':
				if (stmt.exported) {
					info.variables.set(stmt.name, {
						dataType: stmt.dataType,
						mutability: stmt.mutability,
					});
				}
				break;
			case 'StructDeclaration':
				if (stmt.exported) {
					info.structs.set(stmt.name, {
						fields: stmt.fields,
					});
				}
				break;
			case 'EnumDeclaration':
				if (stmt.exported) {
					info.enums.set(stmt.name, stmt.variants);
				}
				break;
		}
	}

	return info;
}

// Resolve struct/enum names and full type info from imported .zz modules, auto-compile them
function resolveImportedTypes(
	tokens: Token[],
	sourceDir: string,
	stdLibDir: string
): { structNames: Set<string>, enumNames: Set<string>, moduleTypes: Map<string, ImportedModuleInfo>, errors: string[] } {
	const structNames = new Set<string>();
	const enumNames = new Set<string>();
	const moduleTypes = new Map<string, ImportedModuleInfo>();
	const errors: string[] = [];

	for (let i = 0; i < tokens.length; i++) {
		if (tokens[i].type !== TokenType.IMPORT) continue;

		const importLine = tokens[i].line;

		// Skip to EQUALS to find the path
		let j = i + 1;
		while (j < tokens.length && tokens[j].type !== TokenType.EQUALS) j++;
		j++; // skip EQUALS

		if (j >= tokens.length) continue;

		// Extract path and determine if stdlib
		let importSource: string;
		let isStdLib = false;

		if (tokens[j].type === TokenType.STRING_LITERAL) {
			importSource = tokens[j].value;
		} else if (tokens[j].type === TokenType.IDENTIFIER) {
			const parts = [tokens[j].value];
			while (j + 1 < tokens.length && tokens[j + 1].type === TokenType.SLASH) {
				j += 2;
				if (j < tokens.length && tokens[j].type === TokenType.IDENTIFIER) {
					parts.push(tokens[j].value);
				}
			}
			importSource = parts.join('/');
			isStdLib = true;
		} else {
			continue;
		}

		// Resolve to .zz file path
		let zzFilePath: string;
		if (isStdLib) {
			const moduleName = importSource.replace(/^std\//, '');
			zzFilePath = path.join(stdLibDir, moduleName + '.zz');
		} else {
			const cleanSource = importSource.replace(/\.(js|zz)$/, '');
			zzFilePath = path.resolve(sourceDir, cleanSource + '.zz');
		}

		// Check if .zz file exists
		if (!fs.existsSync(zzFilePath)) {
			errors.push(
				`Safe import (<-) requires a .zz module, but no .zz file found for "${importSource}". Use <-! for JavaScript module imports. At line ${importLine}.`
			);
			continue;
		}

		// Skip if already resolved (same module imported multiple times)
		if (moduleTypes.has(importSource)) {
			continue;
		}

		// Read, lex, and extract type names
		const importedSource = fs.readFileSync(zzFilePath, 'utf-8');
		const importedLexer = new Lexer(importedSource);
		const importedTokens = importedLexer.tokenize();
		const importedTypeNames = collectTypeNamesFromTokens(importedTokens);

		importedTypeNames.structNames.forEach(n => structNames.add(n));
		importedTypeNames.enumNames.forEach(n => enumNames.add(n));

		// Parse the imported module to extract full type info
		try {
			const importedParser = new Parser(importedTokens, {
				structNames: importedTypeNames.structNames,
				enumNames: importedTypeNames.enumNames,
			});
			const importedAst = importedParser.parse();
			const moduleInfo = extractExportedTypes(importedAst);
			moduleTypes.set(importSource, moduleInfo);

			// Auto-compile: generate .js if missing or stale
			const jsFilePath = zzFilePath.replace(/\.zz$/, '.js');
			let needsCompile = !fs.existsSync(jsFilePath);
			if (!needsCompile) {
				const zzStat = fs.statSync(zzFilePath);
				const jsStat = fs.statSync(jsFilePath);
				needsCompile = zzStat.mtimeMs > jsStat.mtimeMs;
			}
			if (needsCompile) {
				const zzDir = path.dirname(zzFilePath);
				const importCodeGen = new CodeGenerator({
					sourceDir: zzDir,
					outputDir: zzDir,
					stdLibDir,
				});
				const jsOutput = importCodeGen.generate(importedAst);
				fs.writeFileSync(jsFilePath, jsOutput);
			}
		} catch (e: any) {
			errors.push(`Error parsing imported module "${importSource}": ${e.message}`);
		}
	}

	return { structNames, enumNames, moduleTypes, errors };
}

function compile(source: string, filename: string, codeGenOptions?: CodeGenOptions): { js: string; errors: string[] } {
	// Step 1: Lexical analysis
	const lexer = new Lexer(source);
	const tokens = lexer.tokenize();

	// Step 1.5: Resolve types from imported .zz modules and auto-compile them
	let externalTypes: { structNames?: Set<string>, enumNames?: Set<string> } | undefined;
	let moduleTypes: Map<string, ImportedModuleInfo> | undefined;
	if (codeGenOptions) {
		const resolved = resolveImportedTypes(tokens, codeGenOptions.sourceDir, codeGenOptions.stdLibDir);
		if (resolved.errors.length > 0) {
			return { js: "", errors: resolved.errors };
		}
		externalTypes = { structNames: resolved.structNames, enumNames: resolved.enumNames };
		moduleTypes = resolved.moduleTypes;
	}

	// Step 2: Parsing
	const parser = new Parser(tokens, externalTypes);
	const ast = parser.parse();

	// Step 3: Type checking
	const typeChecker = new TypeChecker(moduleTypes);
	const typeErrors = typeChecker.check(ast);

	if (typeErrors.length > 0) {
		return { js: "", errors: typeErrors };
	}

	// Step 3.5: Compile-time evaluation
	const sourceDir = codeGenOptions?.sourceDir || ".";
	const evaluator = new CompTimeEvaluator(sourceDir, filename);
	const evalErrors = evaluator.evaluate(ast);

	if (evalErrors.length > 0) {
		return { js: "", errors: evalErrors };
	}

	// Step 4: Code generation
	const codeGen = new CodeGenerator(codeGenOptions);
	const js = codeGen.generate(ast);

	return { js, errors: [] };
}

function main(): void {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log("ZZ Language Compiler v0.1.0");
		console.log("Usage: zz <file.zz> [options]");
		console.log("");
		console.log("Options:");
		console.log("  --run      Compile and run the program");
		console.log("  --output   Output compiled JS to specific file");
		console.log("  --stdout   Print compiled JS to stdout (instead of file)");
		console.log("  --ast      Print the AST (for debugging)");
		console.log("");
		console.log("By default, compiles to ./compiled/<filename>.js");
		process.exit(0);
	}

	const filename = args[0];
	const runFlag = args.includes("--run");
	const astFlag = args.includes("--ast");
	const stdoutFlag = args.includes("--stdout");
	const outputIndex = args.indexOf("--output");
	const explicitOutput = outputIndex !== -1 ? args[outputIndex + 1] : null;

	// Determine output file: explicit > default (compiled/<name>.js)
	const sourceDir = path.dirname(filename);
	const baseName = path.basename(filename, ".zz");
	const compiledDir = path.join(sourceDir, "compiled");
	const defaultOutput = path.join(compiledDir, `${baseName}.js`);
	const outputFile = explicitOutput || defaultOutput;

	// Compute the standard library directory (relative to the compiled compiler)
	const __filename_resolved = fileURLToPath(import.meta.url);
	const __dirname_resolved = path.dirname(__filename_resolved);
	const stdLibDir = path.resolve(__dirname_resolved, '..', 'std');

	// Compute absolute paths for code generation
	const absSourceDir = path.dirname(path.resolve(filename));
	const absOutputDir = path.dirname(path.resolve(outputFile));

	if (!fs.existsSync(filename)) {
		console.error(`Error: File not found: ${filename}`);
		process.exit(1);
	}

	const source = fs.readFileSync(filename, "utf-8");

	try {
		// For --ast flag, just print tokens and AST
		if (astFlag) {
			const lexer = new Lexer(source);
			const tokens = lexer.tokenize();
			console.log("=== Tokens ===");
			tokens.forEach((t) => console.log(`  ${t.type}: '${t.value}'`));

			const resolved = resolveImportedTypes(tokens, absSourceDir, stdLibDir);
			if (resolved.errors.length > 0) {
				console.error("Compilation errors:");
				resolved.errors.forEach((e) => console.error(`  ${e}`));
				process.exit(1);
			}
			const parser = new Parser(tokens, { structNames: resolved.structNames, enumNames: resolved.enumNames });
			// Note: resolved.moduleTypes available here for future AST type display
			const ast = parser.parse();
			console.log("\n=== AST ===");
			console.log(JSON.stringify(ast, null, 2));
			return;
		}

		// Determine output directory for import path resolution
		let codeGenOutputDir: string;
		if (stdoutFlag) {
			codeGenOutputDir = absSourceDir;
		} else {
			// For both --run and file output, resolve paths relative to compiled dir
			codeGenOutputDir = absOutputDir;
		}

		const codeGenOptions: CodeGenOptions = {
			sourceDir: absSourceDir,
			outputDir: codeGenOutputDir,
			stdLibDir,
		};

		const { js, errors } = compile(source, filename, codeGenOptions);

		if (errors.length > 0) {
			console.error("Compilation errors:");
			errors.forEach((e) => console.error(`  ${e}`));
			process.exit(1);
		}

		if (runFlag) {
			// Write to temp file in compiled dir and execute (eval can't handle ES module imports)
			const outDir = path.dirname(outputFile);
			if (!fs.existsSync(outDir)) {
				fs.mkdirSync(outDir, { recursive: true });
			}
			const tmpFile = path.join(outDir, `.zz_run_${baseName}.mjs`);
			try {
				fs.writeFileSync(tmpFile, js);
				execFileSync('node', [tmpFile], { stdio: 'inherit' });
			} finally {
				try { fs.unlinkSync(tmpFile); } catch {}
			}
		} else if (stdoutFlag) {
			// Print to stdout
			console.log(js);
		} else {
			// Write to file (create compiled directory if needed)
			const outDir = path.dirname(outputFile);
			if (!fs.existsSync(outDir)) {
				fs.mkdirSync(outDir, { recursive: true });
			}
			fs.writeFileSync(outputFile, js);
			console.log(`Compiled to ${outputFile}`);
		}
	} catch (error: any) {
		console.error(`Compilation error: ${error.message}`);
		process.exit(1);
	}
}

main();
