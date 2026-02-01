import fs from "fs";
import fsPath from "path";
export function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}
export function write(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}
export function append(filePath, content) {
  fs.appendFileSync(filePath, content, "utf8");
}
export function touch(filePath) {
  if (!fs.existsSync(filePath)) { fs.writeFileSync(filePath, ""); }
}
export function exists(filePath) {
  return fs.existsSync(filePath);
}
export function isFile(filePath) {
  try { return fs.statSync(filePath).isFile(); } catch { return false; }
}
export function isDir(filePath) {
  try { return fs.statSync(filePath).isDirectory(); } catch { return false; }
}
export function size(filePath) {
  return fs.statSync(filePath).size;
}
export function mtime(filePath) {
  return fs.statSync(filePath).mtimeMs;
}
export function mkdir(dirPath) {
  if (!fs.existsSync(dirPath)) { fs.mkdirSync(dirPath, { recursive: true }); }
}
export function rmdir(dirPath) {
  fs.rmdirSync(dirPath);
}
export function rmrf(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}
export function rm(filePath) {
  fs.unlinkSync(filePath);
}
export function cp(src, dst) {
  fs.copyFileSync(src, dst);
}
export function mv(oldPath, newPath) {
  fs.renameSync(oldPath, newPath);
}
export function basename(filePath) {
  return fsPath.basename(filePath);
}
export function dirname(filePath) {
  return fsPath.dirname(filePath);
}
export function ext(filePath) {
  return fsPath.extname(filePath);
}
export function realpath(filePath) {
  return fsPath.resolve(filePath);
}
export function relpath(from, to) {
  return fsPath.relative(from, to);
}
export function cprf(src, dst) {
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
