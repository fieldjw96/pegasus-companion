// Calendar helpers. Dates travel as plain 'YYYY-MM-DD' strings so nothing
// shifts with the viewer's time zone.

const DAY_MS = 86400000;
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');
const utc = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export const makeISO = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export const todayISO = (now = new Date()) => makeISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
export const addDays = (iso, n) => new Date(utc(iso) + n * DAY_MS).toISOString().slice(0, 10);
export const weekday = (iso) => new Date(utc(iso)).getUTCDay();
export const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / DAY_MS);

export function isRealDate(y, m, d) {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// First given weekday strictly after `iso` (or on it, when inclusive).
export function nextWeekday(iso, wd, inclusive = false) {
  let delta = (wd - weekday(iso) + 7) % 7;
  if (delta === 0 && !inclusive) delta = 7;
  return addDays(iso, delta);
}

// "Fri 13 Nov"
export function fmtDay(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[weekday(iso)]} ${d} ${MONTHS[m - 1]}`;
}

// "13 to 16 Nov", "28 Nov to 2 Dec", or "13 Nov" when there is no return.
export function fmtRange(a, b) {
  const [, ma, da] = a.split('-').map(Number);
  if (!b) return `${da} ${MONTHS[ma - 1]}`;
  const [, mb, db] = b.split('-').map(Number);
  return ma === mb ? `${da} to ${db} ${MONTHS[mb - 1]}` : `${da} ${MONTHS[ma - 1]} to ${db} ${MONTHS[mb - 1]}`;
}

export function fmtDob(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// EU and UK summer time runs from the last Sunday of March to the last Sunday of October.
function lastSunday(y, m) {
  const last = makeISO(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate());
  return addDays(last, -weekday(last));
}
export function isEuSummer(iso) {
  const y = +iso.slice(0, 4);
  return iso >= lastSunday(y, 3) && iso < lastSunday(y, 10);
}

// Minutes after midnight <-> "HH:MM"
export const hhmm = (mins) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
export const fmtDuration = (mins) => `${Math.floor(mins / 60)}h ${pad(mins % 60)}m`;
