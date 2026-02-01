export async function rand() {
  return Math.random();
}
export async function randInt(max) {
  return Math.floor(Math.random() * max);
}
export async function randRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export async function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}
export async function randBool() {
  return Math.random() < 0.5;
}
export async function dice(sides) {
  return Math.floor(Math.random() * sides) + 1;
}
export async function rollDice(count, sides) {
  let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
}
export async function coin() {
  return Math.random() < 0.5 ? "heads" : "tails";
}
export async function chance(probability) {
  return Math.random() < probability;
}
export async function randomId(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function sample(arr, count) {
  const result = [];
  const indices = new Set();
  while (result.length < Math.min(count, arr.length)) {
    const idx = Math.floor(Math.random() * arr.length);
    if (!indices.has(idx)) {
      indices.add(idx);
      result.push(arr[idx]);
    }
  }
  return result;
}

export function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function gaussian(mean = 0, stdDev = 1) {
  let u1, u2;
  do { u1 = Math.random(); } while (u1 <= 1e-6);
  u2 = Math.random();
  return mean + stdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function exponential(lambda = 1) {
  return -Math.log(1 - Math.random()) / lambda;
}

export function weighted(items, weights) {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function pickN(arr, n) {
  return sample(arr, n);
}