import fs from "fs";
import fsPath from "path";
export async function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}
export async function write(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}
export async function append(filePath, content) {
  fs.appendFileSync(filePath, content, "utf8");
}
export async function touch(filePath) {
  if (!fs.existsSync(filePath)) { fs.writeFileSync(filePath, ""); }
}
export async function exists(filePath) {
  return fs.existsSync(filePath);
}
export async function isFile(filePath) {
  try { return fs.statSync(filePath).isFile(); } catch { return false; }
}
export async function isDir(filePath) {
  try { return fs.statSync(filePath).isDirectory(); } catch { return false; }
}
export async function size(filePath) {
  return fs.statSync(filePath).size;
}
export async function mtime(filePath) {
  return fs.statSync(filePath).mtimeMs;
}
export async function mkdir(dirPath) {
  if (!fs.existsSync(dirPath)) { fs.mkdirSync(dirPath, { recursive: true }); }
}
export async function rmdir(dirPath) {
  fs.rmdirSync(dirPath);
}
export async function rmrf(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}
export async function rm(filePath) {
  fs.unlinkSync(filePath);
}
export async function cp(src, dst) {
  fs.copyFileSync(src, dst);
}
export async function mv(oldPath, newPath) {
  fs.renameSync(oldPath, newPath);
}
export async function basename(filePath) {
  return fsPath.basename(filePath);
}
export async function dirname(filePath) {
  return fsPath.dirname(filePath);
}
export async function ext(filePath) {
  return fsPath.extname(filePath);
}
export async function realpath(filePath) {
  return fsPath.resolve(filePath);
}
export async function relpath(from, to) {
  return fsPath.relative(from, to);
}
export async function cprf(src, dst) {
  fs.cpSync(src, dst, { recursive: true });
}
export function readBuf(filePath) { return fs.readFileSync(filePath); }
export function writeBuf(filePath, buffer) { fs.writeFileSync(filePath, buffer); }
export function ls(dirPath) { return fs.readdirSync(dirPath); }
export function lsl(dirPath) {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  return files.map((f) => ({ name: f.name, isFile: f.isFile(), isDir: f.isDirectory() }));
}
export function join(...parts) { return fsPath.join(...parts); }
export function find(dirPath) {
  const files = fs.readdirSync(dirPath);
  return files.map((f) => fsPath.join(dirPath, f));
}
export function rmBatch(filePaths) { filePaths.forEach((f) => fs.unlinkSync(f)); }