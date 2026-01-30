#!/usr/bin/env node
// ZZ Language Compiler CLI
import * as fs from "fs";
import * as path from "path";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";
import { TypeChecker } from "./typechecker.js";
import { CodeGenerator } from "./codegen.js";
function compile(source, filename) {
    // Step 1: Lexical analysis
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    // Step 2: Parsing
    const parser = new Parser(tokens);
    const ast = parser.parse();
    // Step 3: Type checking
    const typeChecker = new TypeChecker();
    const errors = typeChecker.check(ast);
    if (errors.length > 0) {
        return { js: "", errors };
    }
    // Step 4: Code generation
    const codeGen = new CodeGenerator();
    const js = codeGen.generate(ast);
    return { js, errors: [] };
}
function main() {
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
            const parser = new Parser(tokens);
            const ast = parser.parse();
            console.log("\n=== AST ===");
            console.log(JSON.stringify(ast, null, 2));
            return;
        }
        const { js, errors } = compile(source, filename);
        if (errors.length > 0) {
            console.error("Compilation errors:");
            errors.forEach((e) => console.error(`  ${e}`));
            process.exit(1);
        }
        if (runFlag) {
            // Execute the generated JavaScript
            eval(js);
        }
        else if (stdoutFlag) {
            // Print to stdout
            console.log(js);
        }
        else {
            // Write to file (create compiled directory if needed)
            const outDir = path.dirname(outputFile);
            if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });
            }
            fs.writeFileSync(outputFile, js);
            console.log(`Compiled to ${outputFile}`);
        }
    }
    catch (error) {
        console.error(`Compilation error: ${error.message}`);
        process.exit(1);
    }
}
main();
