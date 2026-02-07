export async function upper(str) {
  return str.toUpperCase();
}
export async function lower(str) {
  return str.toLowerCase();
}
export async function trim(str) {
  return str.trim();
}
export async function split(str, sep) {
  return str.split(sep);
}
export async function has(str, sub) {
  return str.includes(sub);
}
export async function find(str, sub) {
  return str.indexOf(sub);
}
export async function starts(str, prefix) {
  return str.startsWith(prefix);
}
export async function ends(str, suffix) {
  return str.endsWith(suffix);
}
export async function slice(str, start, end) {
  return str.slice(start, end);
}
export async function replace(str, old, replacement) {
  return str.replaceAll(old, replacement);
}
export async function repeat(str, n) {
  return str.repeat(n);
}
export async function padStart(str, len, pad) {
  return str.padStart(len, pad || " ");
}
export async function padEnd(str, len, pad) {
  return str.padEnd(len, pad || " ");
}
export async function join(arr, sep) {
  return arr.join(sep);
}