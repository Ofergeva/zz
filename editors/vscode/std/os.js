import os from "os";
export function platform() {
  return os.platform();
}
export function arch() {
  return os.arch();
}
export function type() {
  return os.type();
}
export function release() {
  return os.release();
}
export function hostname() {
  return os.hostname();
}
export function homedir() {
  return os.homedir();
}
export function tmpdir() {
  return os.tmpdir();
}
export function endianness() {
  return os.endianness();
}
export function username() {
  return os.userInfo().username;
}
export function uid() {
  return os.userInfo().uid;
}
export function gid() {
  return os.userInfo().gid;
}
export function cpuCount() {
  return os.cpus().length;
}
export function availableParallelism() {
  return os.availableParallelism();
}
export function totalMemory() {
  return os.totalmem();
}
export function freeMemory() {
  return os.freemem();
}
export function usedMemory() {
  return os.totalmem() - os.freemem();
}
export function uptime() {
  return os.uptime();
}
export function userInfo() { return os.userInfo(); }
export function cpus() { return os.cpus(); }
export function loadAverage() { return os.loadavg(); }
export function networkInterfaces() { return os.networkInterfaces(); }
export const EOL = os.EOL;
export const PLATFORM = os.platform();
export const ARCH = os.arch();
