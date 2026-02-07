// Error formatting utilities for ZZ compiler
// Provides rich error messages with source context
/**
 * Format an error message with source context
 * Shows the relevant line(s) of code with a pointer to the error location
 */
export function formatError(message, source, location) {
    const lines = source.split('\n');
    const lineIndex = location.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) {
        // Fallback if line is out of range
        return `Error at line ${location.line}: ${message}`;
    }
    const sourceLine = lines[lineIndex];
    const lineNum = String(location.line).padStart(4, ' ');
    const gutterWidth = lineNum.length + 3; // " | " separator
    // Build the error output
    let output = `Error at line ${location.line}`;
    if (location.column !== undefined) {
        output += `, column ${location.column}`;
    }
    output += `: ${message}\n`;
    // Show context: previous line (if exists)
    if (lineIndex > 0) {
        const prevLineNum = String(location.line - 1).padStart(4, ' ');
        output += `${prevLineNum} | ${lines[lineIndex - 1]}\n`;
    }
    // Show the error line
    output += `${lineNum} | ${sourceLine}\n`;
    // Show the pointer line
    const gutter = ' '.repeat(gutterWidth);
    if (location.column !== undefined && location.column > 0) {
        const pointerStart = location.column - 1;
        const pointerLength = location.endColumn
            ? Math.max(1, location.endColumn - location.column)
            : 1;
        const pointer = ' '.repeat(pointerStart) + '^'.repeat(pointerLength);
        output += `${gutter}${pointer}`;
    }
    return output;
}
/**
 * Format a simple error without source context
 * Used when source is not available
 */
export function formatSimpleError(message, line, column) {
    let output = `Error at line ${line}`;
    if (column !== undefined) {
        output += `, column ${column}`;
    }
    output += `: ${message}`;
    return output;
}
/**
 * Create an error class that carries source location
 */
export class ZZError extends Error {
    line;
    column;
    endColumn;
    constructor(message, line, column, endColumn) {
        super(message);
        this.name = 'ZZError';
        this.line = line;
        this.column = column;
        this.endColumn = endColumn;
    }
    format(source) {
        return formatError(this.message, source, {
            line: this.line,
            column: this.column,
            endColumn: this.endColumn,
        });
    }
}
