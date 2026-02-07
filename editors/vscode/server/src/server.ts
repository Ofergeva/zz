// ZZ Language Server
// Provides diagnostics, completions, and go-to-definition for ZZ files

import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  Definition,
  Location,
  DocumentSymbol,
  SymbolKind,
  Range,
  SignatureHelp,
  SignatureInformation,
  ParameterInformation,
  WorkspaceEdit,
  TextEdit,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

// ZZ compiler types (loaded dynamically)
let Lexer: any;
let TokenType: any;
let Parser: any;
let TypeChecker: any;
let ZZError: any;

// Load ZZ compiler modules dynamically (ESM)
async function loadCompiler(): Promise<boolean> {
  try {
    const lexerMod = await import('../../../../dist/lexer.js');
    const parserMod = await import('../../../../dist/parser.js');
    const typecheckerMod = await import('../../../../dist/typechecker.js');
    const errorsMod = await import('../../../../dist/errors.js');

    Lexer = lexerMod.Lexer;
    TokenType = lexerMod.TokenType;
    Parser = parserMod.Parser;
    TypeChecker = typecheckerMod.TypeChecker;
    ZZError = errorsMod.ZZError;

    return true;
  } catch (e) {
    connection.console.error(`Failed to load ZZ compiler: ${e}`);
    return false;
  }
}

// Create connection and document manager
const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Track collected symbols for completion, go-to-definition, references, rename
interface ParameterInfo {
  name: string;
  type: string;
}

interface SymbolInfo {
  name: string;
  kind: 'variable' | 'function' | 'struct' | 'enum' | 'field' | 'method' | 'variant' | 'trait';
  type?: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  uri: string;
  parameters?: ParameterInfo[];
  references: Location[];
  children?: SymbolInfo[];
}

const documentSymbols: Map<string, SymbolInfo[]> = new Map();

// Built-in functions and types for completion
const builtinFunctions = ['print', 'error', 'len', 's', 'i', 'f', 'b'];
const builtinTypes = ['s', 'i', 'f', 'b', 'J', 'Z'];
const keywords = [
  'S', 'E', 'Z', 'J',
  'true', 'false', '_',
  'print', 'error',
];

let compilerLoaded = false;

connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {
  // Load compiler on initialize
  compilerLoaded = await loadCompiler();

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['.', '#', '~', '<'],
      },
      definitionProvider: true,
      hoverProvider: true,
      documentSymbolProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ['(', ','],
      },
      referencesProvider: true,
      renameProvider: {
        prepareProvider: true,
      },
    },
  };
});

// Validate document and send diagnostics
async function validateDocument(textDocument: TextDocument): Promise<void> {
  if (!compilerLoaded) {
    compilerLoaded = await loadCompiler();
    if (!compilerLoaded) return;
  }

  const text = textDocument.getText();
  const uri = textDocument.uri;
  const diagnostics: Diagnostic[] = [];
  const symbols: SymbolInfo[] = [];

  try {
    // Lexical analysis
    const lexer = new Lexer(text);
    const tokens = lexer.tokenize();

    // Collect type names from tokens
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

    // Collect symbols from AST with enhanced info
    for (const stmt of ast.statements) {
      if (stmt.type === 'VariableDeclaration') {
        symbols.push({
          name: stmt.name,
          kind: 'variable',
          type: typeToString(stmt.dataType),
          line: stmt.line,
          column: 1,
          uri,
          references: [],
        });
      } else if (stmt.type === 'FunctionDeclaration') {
        const params: ParameterInfo[] = stmt.parameters.map((p: any) => ({
          name: p.name,
          type: typeToString(p.dataType),
        }));
        symbols.push({
          name: stmt.name,
          kind: 'function',
          type: stmt.returnType === 'void' ? 'void' : typeToString(stmt.returnType),
          line: stmt.line,
          column: 1,
          endLine: stmt.endLine,
          uri,
          parameters: params,
          references: [],
        });
      } else if (stmt.type === 'StructDeclaration') {
        const children: SymbolInfo[] = [];
        for (const field of stmt.fields) {
          children.push({
            name: `${stmt.name}.${field.name}`,
            kind: 'field',
            type: typeToString(field.dataType),
            line: field.line || stmt.line,
            column: 1,
            uri,
            references: [],
          });
        }
        for (const method of stmt.methods) {
          const methodParams: ParameterInfo[] = method.parameters.map((p: any) => ({
            name: p.name,
            type: typeToString(p.dataType),
          }));
          children.push({
            name: `${stmt.name}.${method.name}`,
            kind: 'method',
            type: method.returnType === 'void' ? 'void' : typeToString(method.returnType),
            line: method.line,
            column: 1,
            endLine: method.endLine,
            uri,
            parameters: methodParams,
            references: [],
          });
        }
        symbols.push({
          name: stmt.name,
          kind: 'struct',
          line: stmt.line,
          column: 1,
          endLine: stmt.endLine,
          uri,
          references: [],
          children,
        });
        // Also push children as flat symbols for search
        symbols.push(...children);
      } else if (stmt.type === 'EnumDeclaration') {
        const children: SymbolInfo[] = [];
        for (const variant of stmt.variants) {
          children.push({
            name: `${stmt.name}.${variant}`,
            kind: 'variant',
            line: stmt.line,
            column: 1,
            uri,
            references: [],
          });
        }
        symbols.push({
          name: stmt.name,
          kind: 'enum',
          line: stmt.line,
          column: 1,
          endLine: stmt.endLine,
          uri,
          references: [],
          children,
        });
        symbols.push(...children);
      } else if (stmt.type === 'TraitDeclaration') {
        const children: SymbolInfo[] = [];
        for (const method of stmt.methods) {
          children.push({
            name: `${stmt.name}.${method.name}`,
            kind: 'method',
            type: method.returnType === 'void' ? 'void' : typeToString(method.returnType),
            line: method.line || stmt.line,
            column: 1,
            uri,
            references: [],
          });
        }
        symbols.push({
          name: stmt.name,
          kind: 'trait',
          line: stmt.line,
          column: 1,
          endLine: stmt.endLine,
          uri,
          references: [],
          children,
        });
        symbols.push(...children);
      }
    }

    // Collect references by scanning all identifier tokens
    collectReferences(tokens, symbols, uri);

    // Type check
    const typeChecker = new TypeChecker();
    const errors = typeChecker.check(ast, text);

    // Convert type errors to diagnostics
    for (const error of errors) {
      // Parse error message for line number
      const lineMatch = error.match(/line (\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1], 10) - 1 : 0;

      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line, character: 0 },
          end: { line, character: Number.MAX_VALUE },
        },
        message: extractErrorMessage(error),
        source: 'zz',
      });
    }
  } catch (e: any) {
    // Handle parser/lexer errors
    let line = 0;
    let column = 0;
    let message = e.message || String(e);

    if (ZZError && e instanceof ZZError) {
      line = e.line - 1;
      column = (e.column || 1) - 1;
    } else {
      const lineMatch = message?.match(/line (\d+)/i);
      const colMatch = message?.match(/column (\d+)/i);
      if (lineMatch) line = parseInt(lineMatch[1], 10) - 1;
      if (colMatch) column = parseInt(colMatch[1], 10) - 1;
    }

    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line, character: column },
        end: { line, character: column + 10 },
      },
      message: extractErrorMessage(message),
      source: 'zz',
    });
  }

  documentSymbols.set(uri, symbols);
  connection.sendDiagnostics({ uri, diagnostics });
}

// Collect references by scanning identifier tokens against known symbols
function collectReferences(tokens: any[], symbols: SymbolInfo[], uri: string): void {
  // Build a lookup of symbol names (without qualified prefix for fields/methods)
  const symbolsByName = new Map<string, SymbolInfo[]>();
  for (const s of symbols) {
    const baseName = s.name.includes('.') ? s.name : s.name;
    if (!symbolsByName.has(baseName)) {
      symbolsByName.set(baseName, []);
    }
    symbolsByName.get(baseName)!.push(s);

    // Also index by short name for qualified symbols
    if (s.name.includes('.')) {
      const shortName = s.name.split('.').pop()!;
      if (!symbolsByName.has(shortName)) {
        symbolsByName.set(shortName, []);
      }
      symbolsByName.get(shortName)!.push(s);
    }
  }

  for (const token of tokens) {
    if (token.type !== 'IDENTIFIER') continue;
    const name = token.value;
    const candidates = symbolsByName.get(name);
    if (!candidates) continue;

    for (const sym of candidates) {
      // Skip if this token IS the definition
      if (sym.line === token.line && !sym.name.includes('.')) continue;

      const ref = Location.create(uri, {
        start: { line: token.line - 1, character: (token.column || 1) - 1 },
        end: { line: token.line - 1, character: (token.column || 1) - 1 + name.length },
      });
      sym.references.push(ref);
    }
  }
}

// Extract just the error message without source context
function extractErrorMessage(error: string): string {
  // Remove source context lines (lines starting with numbers and |)
  const lines = error.split('\n');
  const messageLine = lines.find(l => l.startsWith('Error at') || !l.match(/^\s*\d+\s*\|/));
  if (messageLine) {
    // Extract message after the colon
    const match = messageLine.match(/Error at line \d+(?:, column \d+)?: (.+)/);
    return match ? match[1] : messageLine;
  }
  return error;
}

// Helper to convert DataType to string
function typeToString(type: any): string {
  if (typeof type === 'string') return type;
  if (!type || !type.kind) return 'unknown';

  switch (type.kind) {
    case 'array':
      return `${typeToString(type.elementType)}[]`;
    case 'tuple':
      return `t${type.elementType?.[0] || 'i'}${type.length || 'N'}`;
    case 'struct':
      return type.name;
    case 'enum':
      return type.name;
    case 'j':
      return 'J';
    default:
      return 'unknown';
  }
}

// Completion provider
connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const text = document.getText();
  const lines = text.split('\n');
  const line = lines[params.position.line] || '';
  const linePrefix = line.substring(0, params.position.character);

  const items: CompletionItem[] = [];

  // Check if we're after a dot (method/field access)
  if (linePrefix.endsWith('.')) {
    const symbols = documentSymbols.get(params.textDocument.uri) || [];
    // Find variable type and suggest fields/methods
    const varMatch = linePrefix.match(/(\w+)\.$/);
    if (varMatch) {
      const varName = varMatch[1];
      const varSymbol = symbols.find(s => s.name === varName && s.kind === 'variable');
      if (varSymbol && varSymbol.type) {
        // Find struct fields and methods
        for (const s of symbols) {
          if (s.name.startsWith(varSymbol.type + '.')) {
            const memberName = s.name.split('.')[1];
            items.push({
              label: memberName,
              kind: s.kind === 'field' ? CompletionItemKind.Field : CompletionItemKind.Method,
              detail: s.type,
            });
          }
        }
      }
    }

    // Built-in array/string methods
    items.push(
      { label: 'len', kind: CompletionItemKind.Method, detail: 'Get length' },
      { label: 'push', kind: CompletionItemKind.Method, detail: 'Add element to array' },
      { label: 'pop', kind: CompletionItemKind.Method, detail: 'Remove last element' },
    );

    return items;
  }

  // After type marker # or ~
  if (linePrefix.endsWith('#') || linePrefix.endsWith('~')) {
    // Suggest variable names from context
    return [];
  }

  // Standard completions
  for (const kw of keywords) {
    items.push({
      label: kw,
      kind: CompletionItemKind.Keyword,
    });
  }

  for (const fn of builtinFunctions) {
    items.push({
      label: fn,
      kind: CompletionItemKind.Function,
    });
  }

  // Add symbols from document
  const symbols = documentSymbols.get(params.textDocument.uri) || [];
  for (const s of symbols) {
    if (!s.name.includes('.')) {
      items.push({
        label: s.name,
        kind: symbolKindToCompletionKind(s.kind),
        detail: s.type,
      });
    }
  }

  return items;
});

function symbolKindToCompletionKind(kind: string): CompletionItemKind {
  switch (kind) {
    case 'variable': return CompletionItemKind.Variable;
    case 'function': return CompletionItemKind.Function;
    case 'struct': return CompletionItemKind.Class;
    case 'enum': return CompletionItemKind.Enum;
    case 'field': return CompletionItemKind.Field;
    case 'method': return CompletionItemKind.Method;
    case 'variant': return CompletionItemKind.EnumMember;
    case 'trait': return CompletionItemKind.Interface;
    default: return CompletionItemKind.Text;
  }
}

function symbolKindToLspKind(kind: string): SymbolKind {
  switch (kind) {
    case 'variable': return SymbolKind.Variable;
    case 'function': return SymbolKind.Function;
    case 'struct': return SymbolKind.Class;
    case 'enum': return SymbolKind.Enum;
    case 'field': return SymbolKind.Field;
    case 'method': return SymbolKind.Method;
    case 'variant': return SymbolKind.EnumMember;
    case 'trait': return SymbolKind.Interface;
    default: return SymbolKind.Variable;
  }
}

// Go-to-definition provider
connection.onDefinition((params: TextDocumentPositionParams): Definition | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const lines = text.split('\n');
  const line = lines[params.position.line] || '';

  // Get word at position
  const wordStart = findWordStart(line, params.position.character);
  const wordEnd = findWordEnd(line, params.position.character);
  const word = line.substring(wordStart, wordEnd);

  if (!word) return null;

  // Search symbols
  const symbols = documentSymbols.get(params.textDocument.uri) || [];
  for (const s of symbols) {
    if (s.name === word || s.name.endsWith('.' + word)) {
      return Location.create(s.uri, {
        start: { line: s.line - 1, character: s.column - 1 },
        end: { line: s.line - 1, character: s.column - 1 + s.name.length },
      });
    }
  }

  return null;
});

function findWordStart(line: string, pos: number): number {
  let start = pos;
  while (start > 0 && /\w/.test(line[start - 1])) {
    start--;
  }
  return start;
}

function findWordEnd(line: string, pos: number): number {
  let end = pos;
  while (end < line.length && /\w/.test(line[end])) {
    end++;
  }
  return end;
}

// Hover provider
connection.onHover((params: TextDocumentPositionParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const lines = text.split('\n');
  const line = lines[params.position.line] || '';

  const wordStart = findWordStart(line, params.position.character);
  const wordEnd = findWordEnd(line, params.position.character);
  const word = line.substring(wordStart, wordEnd);

  if (!word) return null;

  // Search symbols for type info
  const symbols = documentSymbols.get(params.textDocument.uri) || [];
  for (const s of symbols) {
    if (s.name === word) {
      return {
        contents: {
          kind: 'markdown',
          value: `**${s.kind}** \`${s.name}\`${s.type ? `: ${s.type}` : ''}`,
        },
      };
    }
  }

  // Built-in types
  const builtinInfo: { [key: string]: string } = {
    's': 'string type',
    'i': 'integer type',
    'f': 'float type',
    'b': 'boolean type',
    'J': 'JSON object type',
    'Z': 'function type',
    'print': 'Output to console',
    'error': 'Output to stderr',
    'len': 'Get length of array/string',
  };

  if (builtinInfo[word]) {
    return {
      contents: {
        kind: 'markdown',
        value: `**builtin** \`${word}\`: ${builtinInfo[word]}`,
      },
    };
  }

  return null;
});

// Document Symbols provider — provides outline view
connection.onDocumentSymbol((params) => {
  const symbols = documentSymbols.get(params.textDocument.uri) || [];
  const result: DocumentSymbol[] = [];

  // Only process top-level symbols (not children that are also in the flat list)
  const topLevel = symbols.filter(s =>
    !s.name.includes('.') || s.children !== undefined
  );

  for (const s of topLevel) {
    if (s.name.includes('.') && !s.children) continue;

    const startLine = s.line - 1;
    const endLine = (s.endLine || s.line) - 1;
    const range = Range.create(startLine, 0, endLine, Number.MAX_VALUE);
    const selectionRange = Range.create(startLine, (s.column || 1) - 1, startLine, (s.column || 1) - 1 + s.name.length);

    const docSymbol = DocumentSymbol.create(
      s.name,
      s.type || '',
      symbolKindToLspKind(s.kind),
      range,
      selectionRange,
    );

    // Add children for structs, enums, traits
    if (s.children && s.children.length > 0) {
      docSymbol.children = s.children.map(child => {
        const childName = child.name.includes('.') ? child.name.split('.').pop()! : child.name;
        const childLine = child.line - 1;
        const childEndLine = (child.endLine || child.line) - 1;
        return DocumentSymbol.create(
          childName,
          child.type || '',
          symbolKindToLspKind(child.kind),
          Range.create(childLine, 0, childEndLine, Number.MAX_VALUE),
          Range.create(childLine, 0, childLine, childName.length),
        );
      });
    }

    result.push(docSymbol);
  }

  return result;
});

// Signature Help provider — shows function parameter hints
connection.onSignatureHelp((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const lines = text.split('\n');
  const line = lines[params.position.line] || '';
  const linePrefix = line.substring(0, params.position.character);

  // Find the function name and count commas for active parameter
  let parenDepth = 0;
  let commaCount = 0;
  let funcNameEnd = -1;

  for (let i = linePrefix.length - 1; i >= 0; i--) {
    const ch = linePrefix[i];
    if (ch === ')') parenDepth++;
    else if (ch === '(') {
      if (parenDepth === 0) {
        funcNameEnd = i;
        break;
      }
      parenDepth--;
    } else if (ch === ',' && parenDepth === 0) {
      commaCount++;
    }
  }

  if (funcNameEnd < 0) return null;

  // Extract function name
  const beforeParen = linePrefix.substring(0, funcNameEnd).trimEnd();
  const funcNameMatch = beforeParen.match(/(\w+)\s*$/);
  if (!funcNameMatch) return null;
  const funcName = funcNameMatch[1];

  // Look up function in symbols
  const symbols = documentSymbols.get(params.textDocument.uri) || [];
  const funcSymbol = symbols.find(s =>
    (s.kind === 'function' || s.kind === 'method') &&
    (s.name === funcName || s.name.endsWith('.' + funcName)) &&
    s.parameters
  );

  if (!funcSymbol || !funcSymbol.parameters) return null;

  // Build signature label
  const paramLabels = funcSymbol.parameters.map(p => `${p.type}#${p.name}`);
  const returnPart = funcSymbol.type && funcSymbol.type !== 'void' ? ` → ${funcSymbol.type}` : '';
  const signatureLabel = `${funcName}(${paramLabels.join(', ')})${returnPart}`;

  const sigInfo = SignatureInformation.create(signatureLabel);
  sigInfo.parameters = funcSymbol.parameters.map(p => {
    const label = `${p.type}#${p.name}`;
    return ParameterInformation.create(label);
  });

  const result: SignatureHelp = {
    signatures: [sigInfo],
    activeSignature: 0,
    activeParameter: Math.min(commaCount, funcSymbol.parameters.length - 1),
  };

  return result;
});

// Find References provider
connection.onReferences((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const lines = text.split('\n');
  const line = lines[params.position.line] || '';

  const wordStart = findWordStart(line, params.position.character);
  const wordEnd = findWordEnd(line, params.position.character);
  const word = line.substring(wordStart, wordEnd);

  if (!word) return null;

  const symbols = documentSymbols.get(params.textDocument.uri) || [];
  const matchingSymbol = symbols.find(s =>
    s.name === word || s.name.endsWith('.' + word)
  );

  if (!matchingSymbol) return null;

  const result: Location[] = [...matchingSymbol.references];

  // Include declaration if requested
  if (params.context.includeDeclaration) {
    result.unshift(Location.create(matchingSymbol.uri, {
      start: { line: matchingSymbol.line - 1, character: (matchingSymbol.column || 1) - 1 },
      end: { line: matchingSymbol.line - 1, character: (matchingSymbol.column || 1) - 1 + word.length },
    }));
  }

  return result;
});

// Prepare Rename provider — validates rename is possible
connection.onPrepareRename((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const lines = text.split('\n');
  const line = lines[params.position.line] || '';

  const wordStart = findWordStart(line, params.position.character);
  const wordEnd = findWordEnd(line, params.position.character);
  const word = line.substring(wordStart, wordEnd);

  if (!word) return null;

  // Check if it's a renameable symbol (not a keyword or builtin)
  const nonRenameable = ['print', 'error', 'true', 'false', 'S', 'E', 'Z', 'J', 'ZZ', 's', 'i', 'f', 'b', '_'];
  if (nonRenameable.includes(word)) return null;

  const symbols = documentSymbols.get(params.textDocument.uri) || [];
  const matchingSymbol = symbols.find(s =>
    s.name === word || s.name.endsWith('.' + word)
  );

  if (!matchingSymbol) return null;

  return Range.create(
    params.position.line,
    wordStart,
    params.position.line,
    wordEnd,
  );
});

// Rename provider — renames symbol and all references
connection.onRenameRequest((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const lines = text.split('\n');
  const line = lines[params.position.line] || '';

  const wordStart = findWordStart(line, params.position.character);
  const wordEnd = findWordEnd(line, params.position.character);
  const word = line.substring(wordStart, wordEnd);

  if (!word) return null;

  const symbols = documentSymbols.get(params.textDocument.uri) || [];
  const matchingSymbol = symbols.find(s =>
    s.name === word || s.name.endsWith('.' + word)
  );

  if (!matchingSymbol) return null;

  const edits: TextEdit[] = [];
  const uri = params.textDocument.uri;

  // Edit at the definition
  edits.push(TextEdit.replace(
    Range.create(
      matchingSymbol.line - 1,
      (matchingSymbol.column || 1) - 1,
      matchingSymbol.line - 1,
      (matchingSymbol.column || 1) - 1 + word.length,
    ),
    params.newName,
  ));

  // Edit all references
  for (const ref of matchingSymbol.references) {
    edits.push(TextEdit.replace(ref.range, params.newName));
  }

  const workspaceEdit: WorkspaceEdit = {
    changes: { [uri]: edits },
  };

  return workspaceEdit;
});

// Document events
documents.onDidChangeContent((change) => {
  validateDocument(change.document);
});

documents.onDidOpen((event) => {
  validateDocument(event.document);
});

// Start listening
documents.listen(connection);
connection.listen();
