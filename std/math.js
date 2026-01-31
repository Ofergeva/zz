// ZZ Standard Library: Math Functions
// Use with UFCS: num.sqrt() or sqrt(num)

// Basic operations
export function abs(x) {
	return Math.abs(x);
}
export function floor(x) {
	return Math.floor(x);
}
export function ceil(x) {
	return Math.ceil(x);
}
export function round(x) {
	return Math.round(x);
}
export function trunc(x) {
	return Math.trunc(x);
}
export function sign(x) {
	return Math.sign(x);
}

// Power and roots
export function sqrt(x) {
	return Math.sqrt(x);
}
export function cbrt(x) {
	return Math.cbrt(x);
}
export function pow(x, y) {
	return Math.pow(x, y);
}
export function exp(x) {
	return Math.exp(x);
}
export function log(x) {
	return Math.log(x);
}
export function log10(x) {
	return Math.log10(x);
}
export function log2(x) {
	return Math.log2(x);
}

// Trigonometry
export function sin(x) {
	return Math.sin(x);
}
export function cos(x) {
	return Math.cos(x);
}
export function tan(x) {
	return Math.tan(x);
}
export function asin(x) {
	return Math.asin(x);
}
export function acos(x) {
	return Math.acos(x);
}
export function atan(x) {
	return Math.atan(x);
}
export function atan2(y, x) {
	return Math.atan2(y, x);
}

// Hyperbolic
export function sinh(x) {
	return Math.sinh(x);
}
export function cosh(x) {
	return Math.cosh(x);
}
export function tanh(x) {
	return Math.tanh(x);
}

// Min/max (two arguments for UFCS compatibility)
export function min(a, b) {
	return Math.min(a, b);
}
export function max(a, b) {
	return Math.max(a, b);
}

// Constants (as functions for import compatibility)
export function PI() {
	return Math.PI;
}
export function E() {
	return Math.E;
}
