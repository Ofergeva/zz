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
export function now() {
  return new Instant(Date.now());
}
export function millis(n) {
  return new Duration(n);
}
export function seconds(n) {
  return new Duration(n * 1000);
}
export function minutes(n) {
  return new Duration(n * 60000);
}
export function hours(n) {
  return new Duration(n * 3600000);
}
export function days(n) {
  return new Duration(n * 86400000);
}
export function addInstant(inst, dur) {
  return new Instant(inst.millis + dur.millis);
}
export function diffInstant(a, b) {
  return new Duration(a.millis - b.millis);
}
export function addDuration(a, b) {
  return new Duration(a.millis + b.millis);
}
export function subDuration(a, b) {
  return new Duration(a.millis - b.millis);
}
export function instantMillis(inst) {
  return inst.millis;
}
export function durationMillis(dur) {
  return dur.millis;
}
export function durationSeconds(dur) {
  return Math.trunc(dur.millis / 1000);
}
export function year(inst) {
  return new Date(inst.millis).getUTCFullYear();
}
export function month(inst) {
  return new Date(inst.millis).getUTCMonth() + 1;
}
export function day(inst) {
  return new Date(inst.millis).getUTCDate();
}
export function weekday(inst) {
  const d = new Date(inst.millis).getUTCDay();
    return d === 0 ? 7 : d;
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

export function sleep(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration.millis));
}
