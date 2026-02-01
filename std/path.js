import pathModule from "path";
export class Path {
  constructor(path) {
    this.path = path;
  }
  async basename() {
    return pathModule.basename(this.path);
  }
  async dirname() {
    return pathModule.dirname(this.path);
  }
  async ext() {
    return pathModule.extname(this.path);
  }
  async stem() {
    const base = pathModule.basename(this.path);
      const ext = pathModule.extname(this.path);
      return ext.length > 0 ? base.slice(0, -ext.length) : base;
  }
  async resolve() {
    return pathModule.resolve(this.path);
  }
  async normalize() {
    return pathModule.normalize(this.path);
  }
  async isAbsolute() {
    return pathModule.isAbsolute(this.path);
  }
  async isRelative() {
    return !pathModule.isAbsolute(this.path);
  }
  async relative(to) {
    return pathModule.relative(this.path, to);
  }
  async string() {
    return this.path;
  }
  async valueOf() {
    return this.path;
  }
}
export async function dirname(pathString) {
  return pathModule.dirname(pathString);
}
export async function basename(pathString) {
  return pathModule.basename(pathString);
}
export async function ext(pathString) {
  return pathModule.extname(pathString);
}
export async function resolve(pathString) {
  return pathModule.resolve(pathString);
}
export async function normalize(pathString) {
  return pathModule.normalize(pathString);
}
export async function isAbsolute(pathString) {
  return pathModule.isAbsolute(pathString);
}
export async function relative(from, to) {
  return pathModule.relative(from, to);
}
export async function pwd() {
  console.log(process.cwd());
}
export function join(...parts) { return pathModule.join(...parts); }
export const sep = pathModule.sep;
export const cwd = process.cwd();
export const delimiter = pathModule.delimiter;