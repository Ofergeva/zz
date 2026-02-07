export async function sort(arr) {
  return [...arr].sort((a, b) => a - b);
}
export async function sortDesc(arr) {
  return [...arr].sort((a, b) => b - a);
}
export async function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}
export async function product(arr) {
  return arr.reduce((a, b) => a * b, 1);
}
export async function average(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
export async function minVal(arr) {
  return Math.min(...arr);
}
export async function maxVal(arr) {
  return Math.max(...arr);
}
export function includes(arr, val) { return arr.includes(val); }
export function indexOf(arr, val) { return arr.indexOf(val); }
export function lastIndexOf(arr, val) { return arr.lastIndexOf(val); }
export function reverse(arr) { return [...arr].reverse(); }
export function slice(arr, start, end) { return arr.slice(start, end); }
export function concat(arr1, arr2) { return arr1.concat(arr2); }
export function flat(arr) { return arr.flat(); }
export function flatDeep(arr) { return arr.flat(Infinity); }
export function fill(arr, val) { return [...arr].fill(val); }
export function fillRange(arr, val, start, end) { return [...arr].fill(val, start, end); }
export function join(arr, sep) { return arr.join(sep); }
export function first(arr) { return arr[0]; }
export function last(arr) { return arr[arr.length - 1]; }
export function isEmpty(arr) { return arr.length === 0; }
export function sortStr(arr) { return [...arr].sort(); }
export function unique(arr) { return [...new Set(arr)]; }
export function count(arr, val) { return arr.filter(x => x === val).length; }