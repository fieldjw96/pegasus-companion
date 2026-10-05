// Seats on the plane, worked out from the trip, so the seat map can show who
// sits where. A deterministic solver, not a model: the same trip always gets
// the same seats, and adding a traveler never moves the ones already seated.
//
// Layout: a demo A320neo cabin, 31 rows of 3-3 (186 seats). Extra legroom is
// rows 1, 2 and the two overwing exit rows; exit rows are adults only. Other
// passengers' seats are invented, stable for a given flight and date.

import { hash } from './flights.js';
import { typeOn } from './agent.js';
import { bundleById } from './data.js';

export const ROWS = 31;
export const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const LEGROOM = [1, 2, 11, 12];
export const EXITS = [11, 12];
const STANDARD = Array.from({ length: ROWS }, (_, i) => i + 1).filter((r) => !LEGROOM.includes(r));

// Two rows kept open for the party, so a group always fits side by side.
function zoneFor(f) {
  const pool = STANDARD.filter((r) => r >= 4 && r <= 24 && !EXITS.includes(r + 1));
  return pool[hash(`${f.no}${f.date}zone`) % pool.length];
}

// Other passengers: about two in three seats, never inside the party's zone
// or the front legroom rows (those are what Comfort Flex is sold on).
export function taken(f) {
  const zone = zoneFor(f);
  const keep = new Set([zone, zone + 1, 1, 2]);
  const out = new Set();
  for (let r = 1; r <= ROWS; r++) {
    if (keep.has(r)) continue;
    for (const c of COLS) if (hash(`${f.no}${f.date}${r}${c}`) % 100 < 66) out.add(`${r}${c}`);
  }
  return out;
}

// What the seats really are. A bundle with free seat choice (Saver Plus, Comfort
// Flex) means the companion picks them at no cost instead of leaving them to check-in.
export function seatMode(trip) {
  const b = bundleById(trip.bundle);
  if (trip.seat !== 'free' || !b.seat) return trip.seat;
  if (b.legroom) return 'legroom';
  return trip.travelers.filter((x) => x.type !== 'infant').length > 1 ? 'together' : 'window';
}

// Where everyone sits on one flight.
//   mode: 'free' (given at check-in), 'together', 'window', 'aisle', 'legroom'
// Babies on a lap get no seat; each rides with an adult, one per adult.
export function seatPlan(trip, f, mode = trip.seat) {
  const busy = taken(f);
  const seated = trip.travelers.filter((x) => typeOn(x, f.date) !== 'infant');
  const babies = trip.travelers.filter((x) => typeOn(x, f.date) === 'infant');
  const adults = seated.filter((x) => typeOn(x, f.date) === 'adult');
  const laps = {};
  babies.forEach((b, i) => adults[i] && (laps[adults[i].id] = b.id));

  const zone = zoneFor(f);
  const scattered = mode === 'free';
  const used = new Set();
  const free = (s) => !busy.has(s) && !used.has(s);
  const grownUp = (x) => typeOn(x, f.date) === 'adult' && !laps[x.id];
  const okFor = (x, r) => !EXITS.includes(r) || grownUp(x);

  // Fill order: legroom rows first if asked, then the open zone, then outward.
  const rowOrder = () => {
    const rest = [];
    for (let d = 0; d < ROWS; d++) for (const r of [zone + d, zone - d]) if (r >= 1 && r <= ROWS && !rest.includes(r)) rest.push(r);
    return mode === 'legroom' ? [...LEGROOM, ...rest.filter((r) => !LEGROOM.includes(r))] : rest.filter((r) => !LEGROOM.includes(r)).concat(LEGROOM);
  };
  const colOrder = mode === 'aisle' ? ['C', 'D', 'B', 'E', 'A', 'F'] : COLS;

  const seats = {};
  if (scattered) {
    // Check-in hands out whatever is left, spread over the cabin, but a child is
    // always seated beside an adult: each adult takes their children as one unit.
    const kids = seated.filter((x) => typeOn(x, f.date) !== 'adult');
    const units = adults.map((a) => [a]);
    if (!units.length) units.push([]);
    kids.forEach((k, i) => units[i % units.length].push(k));
    units.forEach((unit, u) => {
      const fits = [];
      for (let r = 3; r <= ROWS; r++) {
        if (r === zone || r === zone + 1 || (EXITS.includes(r) && unit.some((x) => !okFor(x, r)))) continue;
        for (const half of [COLS.slice(0, 3), COLS.slice(3)]) {
          for (let c = 0; c + unit.length <= 3; c++) {
            const run = half.slice(c, c + unit.length).map((col) => `${r}${col}`);
            if (run.every(free)) fits.push(run);
          }
        }
      }
      const run = fits.length ? fits[hash(`${f.no}${f.date}${unit[0] && unit[0].id}${u}`) % fits.length] : [];
      unit.forEach((x, i) => {
        if (run[i]) {
          seats[x.id] = run[i];
          used.add(run[i]);
        }
      });
    });
  }
  seated.forEach((x) => {
    if (seats[x.id]) return;
    let pick = null;
    for (const r of rowOrder()) {
      if (pick) break;
      if (!okFor(x, r)) continue;
      for (const c of colOrder) if (free(`${r}${c}`)) { pick = `${r}${c}`; break; }
    }
    used.add(pick);
    seats[x.id] = pick;
  });
  return { flight: f, zone, mode, scattered, busy, seats, laps, rows: rowsOf(Object.values(seats)) };
}

export const rowOf = (seat) => parseInt(seat, 10);
const rowsOf = (list) => [...new Set(list.map(rowOf))].sort((a, b) => a - b);

// True when every seated traveler is beside another one (same row, or the
// row just behind on the same side). One person counts as together.
export function sideBySide(plan) {
  const list = Object.values(plan.seats);
  if (list.length < 2) return true;
  const side = (s) => (COLS.indexOf(s.slice(-1)) < 3 ? 0 : 1);
  return list.every((s) => list.some((o) => o !== s && Math.abs(rowOf(o) - rowOf(s)) <= 1 && (rowOf(o) === rowOf(s) || side(o) === side(s))));
}

// One line about where the party sits, for the map caption.
export function seatSummary(plan) {
  const list = Object.values(plan.seats);
  if (plan.scattered) return list.length > 1 ? `At check-in: ${plan.rows.length} different row${plan.rows.length > 1 ? 's' : ''}` : 'At check-in: wherever is left';
  const rows = plan.rows;
  const letters = list.map((s) => s.slice(-1)).sort();
  const run = letters.length > 2 && letters.every((c, i) => !i || COLS.indexOf(c) === COLS.indexOf(letters[i - 1]) + 1);
  return rows.length === 1 ? `Row ${rows[0]}, ${run ? `${letters[0]} to ${letters[letters.length - 1]}` : letters.join(' ')}` : `Rows ${rows[0]} to ${rows[rows.length - 1]}, side by side`;
}
