// ZZ Node.js Standard Library: OS
// Wraps Node.js os module functions

import os from "os";

// Platform and Architecture
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

// System Info
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

// User Info
export function userInfo() {
	return os.userInfo();
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

// CPU Info
export function cpuCount() {
	return os.cpus().length;
}

export function cpus() {
	return os.cpus();
}

export function availableParallelism() {
	return os.availableParallelism();
}

// Memory
export function totalMemory() {
	return os.totalmem();
}

export function freeMemory() {
	return os.freemem();
}

export function usedMemory() {
	return os.totalmem() - os.freemem();
}

// System Uptime
export function uptime() {
	return os.uptime();
}

export function loadAverage() {
	return os.loadavg();
}

// Network
export function networkInterfaces() {
	return os.networkInterfaces();
}

// Constants
export const EOL = os.EOL;
export const PLATFORM = os.platform();
export const ARCH = os.arch();
