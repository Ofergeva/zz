// ZZ Node.js Standard Library: Path
// Path manipulation with a Path struct wrapper

import pathModule from "path";

export class Path {
	constructor(pathString) {
		this.path = pathString;
	}

	// Get components
	basename() {
		return pathModule.basename(this.path);
	}

	dirname() {
		return pathModule.dirname(this.path);
	}

	ext() {
		return pathModule.extname(this.path);
	}

	stem() {
		const base = pathModule.basename(this.path);
		const ext = pathModule.extname(this.path);
		return base.slice(0, -ext.length);
	}

	// Transform path
	resolve() {
		return pathModule.resolve(this.path);
	}

	normalize() {
		return pathModule.normalize(this.path);
	}

	absolute() {
		return pathModule.isAbsolute(this.path);
	}

	relative(to) {
		return pathModule.relative(this.path, to);
	}

	join(...parts) {
		return pathModule.join(this.path, ...parts);
	}

	// Path info
	isAbsolute() {
		return pathModule.isAbsolute(this.path);
	}

	isRelative() {
		return !pathModule.isAbsolute(this.path);
	}

	// String representation
	string() {
		return this.path;
	}

	valueOf() {
		return this.path;
	}
}

// Utility functions
export function dirname(pathString) {
	return pathModule.dirname(pathString);
}

export function basename(pathString) {
	return pathModule.basename(pathString);
}

export function ext(pathString) {
	return pathModule.extname(pathString);
}

export function join(...parts) {
	return pathModule.join(...parts);
}

export function resolve(pathString) {
	return pathModule.resolve(pathString);
}

export function normalize(pathString) {
	return pathModule.normalize(pathString);
}

export function isAbsolute(pathString) {
	return pathModule.isAbsolute(pathString);
}

export function relative(from, to) {
	return pathModule.relative(from, to);
}

export function pwd() {
	console.log(process.cwd());
}

export const sep = pathModule.sep;
export const cwd = process.cwd();
export const delimiter = pathModule.delimiter;
