// ZZ Standard Library: File System
// Synchronous file operations
// Use with UFCS: path.readFile() or readFile(path)

import fs from "fs";
import path from "path";

// Read Operations
export function read(filePath) {
	return fs.readFileSync(filePath, "utf8");
}

export function readBuf(filePath) {
	return fs.readFileSync(filePath);
}

// Write Operations
export function write(filePath, content) {
	fs.writeFileSync(filePath, content, "utf8");
}

export function append(filePath, content) {
	fs.appendFileSync(filePath, content, "utf8");
}

export function writeBuf(filePath, buffer) {
	fs.writeFileSync(filePath, buffer);
}

export function touch(filePath) {
	if (!fs.existsSync(filePath)) {
		fs.writeFileSync(filePath, "");
	}
}

// File Information
export function exists(filePath) {
	return fs.existsSync(filePath);
}

export function isFile(filePath) {
	try {
		return fs.statSync(filePath).isFile();
	} catch {
		return false;
	}
}

export function isDir(filePath) {
	try {
		return fs.statSync(filePath).isDirectory();
	} catch {
		return false;
	}
}

export function size(filePath) {
	return fs.statSync(filePath).size;
}

export function mtime(filePath) {
	return fs.statSync(filePath).mtimeMs;
}

// Directory Operations
export function ls(dirPath) {
	return fs.readdirSync(dirPath);
}

export function lsl(dirPath) {
	const files = fs.readdirSync(dirPath, { withFileTypes: true });
	return files.map((f) => ({
		name: f.name,
		isFile: f.isFile(),
		isDir: f.isDirectory(),
	}));
}

export function mkdir(dirPath) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

export function rmdir(dirPath) {
	fs.rmdirSync(dirPath);
}

export function rmrf(dirPath) {
	fs.rmSync(dirPath, { recursive: true, force: true });
}

// File Operations
export function rm(filePath) {
	fs.unlinkSync(filePath);
}

export function cp(src, dst) {
	fs.copyFileSync(src, dst);
}

export function mv(oldPath, newPath) {
	fs.renameSync(oldPath, newPath);
}

// Path Utilities
export function basename(filePath) {
	return path.basename(filePath);
}

export function dirname(filePath) {
	return path.dirname(filePath);
}

export function ext(filePath) {
	return path.extname(filePath);
}

export function join(...parts) {
	return path.join(...parts);
}

export function realpath(filePath) {
	return path.resolve(filePath);
}

export function relpath(from, to) {
	return path.relative(from, to);
}

// Batch Operations
export function find(dirPath) {
	const files = fs.readdirSync(dirPath);
	return files.map((f) => path.join(dirPath, f));
}

export function rmBatch(filePaths) {
	filePaths.forEach((f) => fs.unlinkSync(f));
}

export function cprf(src, dst) {
	fs.cpSync(src, dst, { recursive: true });
}
