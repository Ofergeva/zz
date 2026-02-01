export class Instant {
  constructor(millis) {
    this.millis = millis;
  }

}
export class Duration {
  constructor(millis) {
    this.millis = millis;
  }

}
export async function now() {
  return new Instant(Date.now());
}
export async function millis(n) {
  return new Duration(n);
}
export async function seconds(n) {
  return new Duration(n * 1000);
}
export async function minutes(n) {
  return new Duration(n * 60000);
}
export async function hours(n) {
  return new Duration(n * 3600000);
}
export async function days(n) {
  return new Duration(n * 86400000);
}
export async function addInstant(inst, dur) {
  return new Instant(inst.millis + dur.millis);
}
export async function diffInstant(a, b) {
  return new Duration(a.millis - b.millis);
}
export async function addDuration(a, b) {
  return new Duration(a.millis + b.millis);
}
export async function subDuration(a, b) {
  return new Duration(a.millis - b.millis);
}
export async function instantMillis(inst) {
  return inst.millis;
}
export async function durationMillis(dur) {
  return dur.millis;
}
export async function durationSeconds(dur) {
  return Math.trunc(dur.millis / 1000);
}
export async function year(inst) {
  return new Date(inst.millis).getUTCFullYear();
}
export async function month(inst) {
  return new Date(inst.millis).getUTCMonth() + 1;
}
export async function day(inst) {
  return new Date(inst.millis).getUTCDate();
}
export async function weekday(inst) {
  const d = new Date(inst.millis).getUTCDay();
    return d === 0 ? 7 : d;
}
export async function sleep(dur) {
  return new Promise((resolve) => setTimeout(resolve, dur.millis));
}
export function format(inst, fmt) {
  const d = new Date(inst.millis);
  const map = {
    YYYY: d.getUTCFullYear().toString().padStart(4, "0"),
    MM: (d.getUTCMonth() + 1).toString().padStart(2, "0"),
    DD: d.getUTCDate().toString().padStart(2, "0"),
    HH: d.getUTCHours().toString().padStart(2, "0"),
    mm: d.getUTCMinutes().toString().padStart(2, "0"),
    ss: d.getUTCSeconds().toString().padStart(2, "0"),
  };
  return fmt.replace(/YYYY|MM|DD|HH|mm|ss/g, (t) => map[t]);
}

export function parse(fmt, value) {
  const reTokens = /(YYYY|MM|DD|HH|mm|ss)/g;
  const order = [];
  const regex = new RegExp(
    "^" + fmt.replace(reTokens, (t) => { order.push(t); return "(\\d+)"; }) + "$"
  );
  const match = value.match(regex);
  if (!match) return null;
  const parts = {};
  for (let i = 0; i < order.length; i++) {
    parts[order[i]] = Number(match[i + 1]);
  }
  const year = parts.YYYY ?? 1970;
  const month = (parts.MM ?? 1) - 1;
  const day = parts.DD ?? 1;
  const hour = parts.HH ?? 0;
  const min = parts.mm ?? 0;
  const sec = parts.ss ?? 0;
  const ms = Date.UTC(year, month, day, hour, min, sec);
  if (Number.isNaN(ms)) return null;
  return new Instant(ms);
}