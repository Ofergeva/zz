// ZZ Standard Library: String Functions
// These functions can be used with UFCS: str.upper() calls upper(str)

// Convert to uppercase
export function upper(str) {
	return str.toUpperCase();
}

// Convert to lowercase
export function lower(str) {
	return str.toLowerCase();
}

// Remove leading/trailing whitespace
export function trim(str) {
	return str.trim();
}

// Split string by separator, returns array
export function split(str, sep) {
	return str.split(sep);
}

// Check if string contains substring
export function has(str, sub) {
	return str.includes(sub);
}

// Find index of substring (-1 if not found)
export function find(str, sub) {
	return str.indexOf(sub);
}

// Check if string starts with prefix
export function starts(str, prefix) {
	return str.startsWith(prefix);
}

// Check if string ends with suffix
export function ends(str, suffix) {
	return str.endsWith(suffix);
}

// Extract substring from start to end (exclusive)
export function slice(str, start, end) {
	return str.slice(start, end);
}

// Replace all occurrence
export function replace(str, old, replacement) {
	return str.replaceAll(old, replacement);
}

// Repeat string n times
export function repeat(str, n) {
	return str.repeat(n);
}

// Pad start of string to reach target length
export function padStart(str, len, pad) {
	return str.padStart(len, pad || " ");
}

// Pad end of string to reach target length
export function padEnd(str, len, pad) {
	return str.padEnd(len, pad || " ");
}

// Join array of strings with separator
export function join(arr, sep) {
	return arr.join(sep);
}
