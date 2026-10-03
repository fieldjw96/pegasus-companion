// Mock Pegasus schedule: four departures a day per direction, stable prices
// for a given route and date, and correct local arrival times.

import { HOME, TZ } from './data.js';
import { weekday, isEuSummer, hhmm } from './dates.js';

const OUT_SLOTS = [
  { slot: 'morning', dep: 7 * 60 + 5, mult: 0.84 },
  { slot: 'afternoon', dep: 12 * 60 + 40, mult: 1.0 },
  { slot: 'evening', dep: 19 * 60 + 35, mult: 1.16 },
  { slot: 'night', dep: 23 * 60 + 10, mult: 0.92 },
];
const BACK_SLOTS = [
  { slot: 'morning', dep: 8 * 60 + 15, mult: 0.9 },
  { slot: 'afternoon', dep: 14 * 60 + 5, mult: 1.0 },
  { slot: 'evening', dep: 20 * 60 + 30, mult: 1.12 },
  { slot: 'night', dep: 23 * 60 + 50, mult: 0.88 },
];

export function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export const utcOffset = (tz, iso) => TZ[tz][['CET', 'UK', 'EET'].includes(tz) && isEuSummer(iso) ? 1 : 0];

export function flightsFor(dest, date, dir) {
  const out = dir === 'out';
  const mins = out ? dest.out : dest.back;
  const shift = (utcOffset(out ? dest.tz : HOME.tz, date) - utcOffset(out ? HOME.tz : dest.tz, date)) * 60;
  const wd = weekday(date);
  const peak = out ? (wd === 4 || wd === 5 ? 1.14 : 1) : wd === 0 || wd === 1 ? 1.12 : 1;
  const base = (dest.intl ? 1000 : 2000) + (hash(dest.code) % 450) * 2;
  return (out ? OUT_SLOTS : BACK_SLOTS).map((s, i) => {
    const arr = s.dep + mins + shift;
    const jitter = (hash(`${dest.code}${date}${dir}${i}`) % 13) - 6;
    return {
      no: `PC${base + i * 6 + (out ? 1 : 2)}`,
      slot: s.slot,
      date,
      from: out ? HOME.code : dest.code,
      to: out ? dest.code : HOME.code,
      dep: hhmm(s.dep),
      arr: hhmm(((arr % 1440) + 1440) % 1440),
      nextDay: arr >= 1440 ? 1 : 0,
      mins,
      fare: Math.max(19, Math.round(dest.fare * s.mult * peak + jitter)),
    };
  });
}

// Cheapest flight inside the asked-for part of the day ("any" = whole day).
export function pickFlight(list, slot) {
  const pool = slot && slot !== 'any' ? list.filter((f) => f.slot === slot) : list;
  return [...pool].sort((a, b) => a.fare - b.fare || a.dep.localeCompare(b.dep))[0];
}
