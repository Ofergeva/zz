export function upper(str) {
  return str.toUpperCase();
}
export function lower(str) {
  return str.toLowerCase();
}
export function trim(str) {
  return str.trim();
}
export function split(str, sep) {
  return str.split(sep);
}
export function has(str, sub) {
  return str.includes(sub);
}
export function find(str, sub) {
  return str.indexOf(sub);
}
export function starts(str, prefix) {
  return str.startsWith(prefix);
}
export function ends(str, suffix) {
  return str.endsWith(suffix);
}
export function slice(str, start, end) {
  return str.slice(start, end);
}
export function replace(str, old, replacement) {
  return str.replaceAll(old, replacement);
}
export function repeat(str, n) {
  return str.repeat(n);
}
export function padStart(str, len, pad) {
  return str.padStart(len, pad || " ");
}
export function padEnd(str, len, pad) {
  return str.padEnd(len, pad || " ");
}
export function join(arr, sep) {
  return arr.join(sep);
}
