import { upper } from "../../std/string.js";
export async function greet(name) {
  return `Hello, ${name}!`;
}
export async function shout(name) {
  return `${await upper(name)}!!!`;
}
export async function add(a, b) {
  return (a + b);
}