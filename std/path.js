import pathModule from "path";
export class Path {
  constructor(path) {
    this.path = path;
  }
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
      return ext.length > 0 ? base.slice(0, -ext.length) : base;
  }
  resolve() {
    return pathModule.resolve(this.path);
  }
  normalize() {
    return pathModule.normalize(this.path);
  }
  isAbsolute() {
    return pathModule.isAbsolute(this.path);
  }
  isRelative() {
    return !pathModule.isAbsolute(this.path);
  }
  relative(to) {
    return pathModule.relative(this.path, to);
  }
  string() {
    return this.path;
  }
  valueOf() {
    return this.path;
  }
}
export function dirname(pathString) {
  return pathModule.dirname(pathString);
}
export function basename(pathString) {
  return pathModule.basename(pathString);
}
export function ext(pathString) {
  return pathModule.extname(pathString);
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
export function join(...parts) { return pathModule.join(...parts); }
export const sep = pathModule.sep;
export const cwd = process.cwd();
export const delimiter = pathModule.delimiter;
