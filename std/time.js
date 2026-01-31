// =======================
// Internal helpers
// =======================

function makeInstant(millis) {
	return { __type: "Instant", millis };
}

function makeDuration(millis) {
	return { __type: "Duration", millis };
}

function assertInstant(x) {
	if (!x || x.__type !== "Instant") {
		throw new TypeError("Expected Instant");
	}
}

function assertDuration(x) {
	if (!x || x.__type !== "Duration") {
		throw new TypeError("Expected Duration");
	}
}

// =======================
// Construction
// =======================

export function now() {
	return makeInstant(Date.now());
}

export function millis(n) {
	return makeDuration(n);
}

export function seconds(n) {
	return makeDuration(n * 1_000);
}

export function minutes(n) {
	return makeDuration(n * 60_000);
}

export function hours(n) {
	return makeDuration(n * 3_600_000);
}

export function days(n) {
	return makeDuration(n * 86_400_000);
}

// =======================
// Arithmetic
// =======================

export function addInstant(inst, dur) {
	assertInstant(inst);
	assertDuration(dur);
	return makeInstant(inst.millis + dur.millis);
}

export function diffInstant(a, b) {
	assertInstant(a);
	assertInstant(b);
	return makeDuration(a.millis - b.millis);
}

export function addDuration(a, b) {
	assertDuration(a);
	assertDuration(b);
	return makeDuration(a.millis + b.millis);
}

export function subDuration(a, b) {
	assertDuration(a);
	assertDuration(b);
	return makeDuration(a.millis - b.millis);
}

// =======================
// Accessors
// =======================

export function instantMillis(inst) {
	assertInstant(inst);
	return inst.millis;
}

export function durationMillis(dur) {
	assertDuration(dur);
	return dur.millis;
}

export function durationSeconds(dur) {
	assertDuration(dur);
	return Math.trunc(dur.millis / 1_000);
}

// =======================
// Calendar (UTC only)
// =======================

export function year(inst) {
	assertInstant(inst);
	return new Date(inst.millis).getUTCFullYear();
}

export function month(inst) {
	assertInstant(inst);
	return new Date(inst.millis).getUTCMonth() + 1; // 1–12
}

export function day(inst) {
	assertInstant(inst);
	return new Date(inst.millis).getUTCDate();
}

export function weekday(inst) {
	assertInstant(inst);
	const d = new Date(inst.millis).getUTCDay();
	return d === 0 ? 7 : d; // 1=Mon .. 7=Sun
}

// =======================
// Formatting / Parsing
// =======================
// Supported tokens: YYYY MM DD HH mm ss
// UTC only, zero-padded

export function format(inst, fmt) {
	assertInstant(inst);
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
		"^" +
			fmt.replace(reTokens, (t) => {
				order.push(t);
				return "(\\d+)";
			}) +
			"$",
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

	return makeInstant(ms);
}

// =======================
// Async
// =======================

export function sleep(duration) {
	assertDuration(duration);
	return new Promise((resolve) => setTimeout(resolve, duration.millis));
}
