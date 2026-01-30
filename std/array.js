// ZZ Standard Library: Array Functions
// Use with UFCS: arr.reverse() or reverse(arr)

// Note: Higher-order functions (map, filter, reduce) require callbacks
// which ZZ doesn't support yet. These utilities work without callbacks.

// Search
export function includes(arr, val) { return arr.includes(val); }
export function indexOf(arr, val) { return arr.indexOf(val); }
export function lastIndexOf(arr, val) { return arr.lastIndexOf(val); }

// Transform (returns new array, doesn't mutate)
export function reverse(arr) { return [...arr].reverse(); }
export function slice(arr, start, end) { return arr.slice(start, end); }
export function concat(arr1, arr2) { return arr1.concat(arr2); }
export function flat(arr) { return arr.flat(); }
export function flatDeep(arr) { return arr.flat(Infinity); }

// Fill (returns new array with value)
export function fill(arr, val) { return [...arr].fill(val); }
export function fillRange(arr, val, start, end) { return [...arr].fill(val, start, end); }

// Utilities
export function join(arr, sep) { return arr.join(sep); }
export function first(arr) { return arr[0]; }
export function last(arr) { return arr[arr.length - 1]; }
export function isEmpty(arr) { return arr.length === 0; }

// Sort (returns new sorted array)
// Note: Default JS sort for numbers needs comparison
export function sort(arr) { return [...arr].sort((a, b) => a - b); }
export function sortDesc(arr) { return [...arr].sort((a, b) => b - a); }
export function sortStr(arr) { return [...arr].sort(); }

// Numeric operations
export function sum(arr) { return arr.reduce((a, b) => a + b, 0); }
export function product(arr) { return arr.reduce((a, b) => a * b, 1); }
export function average(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
export function minVal(arr) { return Math.min(...arr); }
export function maxVal(arr) { return Math.max(...arr); }

// Unique values
export function unique(arr) { return [...new Set(arr)]; }

// Count occurrences
export function count(arr, val) { return arr.filter(x => x === val).length; }
