// The seat map's solver: side by side when asked, stable when someone is added,
// Pegasus fare rules on which seats are free, and the edge cases that break it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seatPlan, seatMode, sideBySide, seatSummary, taken, EXITS, LEGROOM, rowOf } from '../lib/seats.js';

const F = { no: 'PC1201', date: '2026-10-10' };
const trip = (types, seat = 'together', bundle = 'saver', extra = {}) => ({
  seat,
  bundle,
  travelers: types.map((type, i) => ({ id: `p${i}`, first: `P${i}`, type, ...(extra[i] || {}) })),
});
const seats = (plan) => Object.values(plan.seats);

test('together: a party of up to six sits in one row', () => {
  for (let n = 2; n <= 6; n++) {
    const plan = seatPlan(trip(Array(n).fill('adult')), F);
    assert.equal(plan.rows.length, 1, `party of ${n}`);
    assert.ok(sideBySide(plan));
  }
});

test('adding someone never moves the people already seated', () => {
  for (let n = 1; n < 10; n++) {
    const a = seatPlan(trip(Array(n).fill('adult')), F);
    const b = seatPlan(trip(Array(n + 1).fill('adult')), F);
    for (const [id, s] of Object.entries(a.seats)) assert.equal(b.seats[id], s, `p${id} moved when person ${n + 1} joined`);
  }
});

test('nobody gets a seat that is taken, and no seat is used twice', () => {
  for (const mode of ['free', 'together', 'window', 'aisle', 'legroom']) {
    for (const n of [1, 3, 7, 30]) {
      const plan = seatPlan(trip(Array(n).fill('adult'), mode), F);
      const list = seats(plan);
      assert.equal(new Set(list).size, n, `${mode} ${n}: duplicate seat`);
      assert.ok(list.every((s) => s && !taken(F).has(s)), `${mode} ${n}: took a taken seat`);
    }
  }
});

test('babies on a lap get no seat, and each rides with a different adult', () => {
  const plan = seatPlan(trip(['adult', 'adult', 'infant', 'infant']), F);
  assert.equal(seats(plan).length, 2);
  assert.deepEqual(Object.keys(plan.laps).sort(), ['p0', 'p1']);
  assert.deepEqual(Object.values(plan.laps).sort(), ['p2', 'p3']);
});

test('exit rows are adults only: no child and no adult holding a baby', () => {
  // twelve adults fill the front legroom rows, so the next people reach the exit rows
  const t = trip([...Array(12).fill('adult'), 'adult', 'adult', 'child', 'infant'], 'legroom');
  const plan = seatPlan(t, F);
  const child = plan.seats.p14;
  const holder = Object.keys(plan.laps)[0];
  assert.ok(!EXITS.includes(rowOf(child)), `child in exit row ${child}`);
  assert.ok(!EXITS.includes(rowOf(plan.seats[holder])), `lap holder in exit row ${plan.seats[holder]}`);
  assert.ok(EXITS.includes(rowOf(plan.seats.p12)), 'an adult without a baby can take the exit row');
  for (const x of ['free', 'together']) {
    const p = seatPlan(trip(['adult', 'child', 'child', 'child'], x), F);
    assert.ok([p.seats.p1, p.seats.p2, p.seats.p3].every((s) => !EXITS.includes(rowOf(s))), `${x}: child in an exit row`);
  }
});

test('legroom puts you in the legroom rows; window and aisle mean window and aisle', () => {
  assert.ok(LEGROOM.includes(rowOf(seatPlan(trip(['adult'], 'legroom'), F).seats.p0)));
  assert.match(seatPlan(trip(['adult'], 'window'), F).seats.p0, /[AF]$/);
  assert.match(seatPlan(trip(['adult'], 'aisle'), F).seats.p0, /[CD]$/);
});

test('at check-in a group is scattered, and says so', () => {
  const plan = seatPlan(trip(Array(4).fill('adult'), 'free'), F);
  assert.ok(plan.scattered && plan.rows.length > 1);
  assert.match(seatSummary(plan), /^At check-in: \d different rows$/);
});

test('a baby who turns two before the flight home has a seat on it', () => {
  const t = trip(['adult', 'infant'], 'together', 'saver', { 1: { turnsTwo: '2026-10-12' } });
  assert.equal(seats(seatPlan(t, F)).length, 1);
  assert.equal(seats(seatPlan(t, { no: 'PC1202', date: '2026-10-14' })).length, 2);
});

test('the same flight always gives the same seats', () => {
  const t = trip(Array(5).fill('adult'), 'free');
  assert.deepEqual(seatPlan(t, F).seats, seatPlan(t, F).seats);
});

test('Pegasus bundles: free seat choice in Saver Plus, legroom only in Comfort Flex', () => {
  assert.equal(seatMode(trip(['adult', 'adult'], 'free', 'saver')), 'free');
  assert.equal(seatMode(trip(['adult'], 'free', 'light')), 'free');
  assert.equal(seatMode(trip(['adult', 'adult'], 'free', 'saverplus')), 'together');
  assert.equal(seatMode(trip(['adult'], 'free', 'saverplus')), 'window');
  assert.equal(seatMode(trip(['adult', 'infant'], 'free', 'saverplus')), 'window');
  assert.equal(seatMode(trip(['adult', 'adult'], 'free', 'comfortflex')), 'legroom');
  // something you asked for always wins
  assert.equal(seatMode(trip(['adult'], 'aisle', 'comfortflex')), 'aisle');
});

test('captions read like a person wrote them', () => {
  assert.equal(seatSummary(seatPlan(trip(Array(6).fill('adult')), F)).replace(/\d+/, 'N'), 'Row N, A to F');
  assert.equal(seatSummary(seatPlan(trip(['adult', 'adult']), F)).replace(/\d+/, 'N'), 'Row N, A B');
  assert.match(seatSummary(seatPlan(trip(Array(8).fill('adult')), F)), /^Rows \d+ to \d+, side by side$/);
});

test('at check-in every child sits beside an adult; only adults can land apart', () => {
  const side = (s) => (['A', 'B', 'C'].includes(s.slice(-1)) ? 0 : 1);
  const beside = (a, b) => rowOf(a) === rowOf(b) && side(a) === side(b) && Math.abs(a.charCodeAt(a.length - 1) - b.charCodeAt(b.length - 1)) === 1;
  for (const date of ['2026-10-10', '2026-11-20', '2026-12-24']) {
    const f = { no: 'PC2001', date };
    const one = seatPlan(trip(['adult', 'child'], 'free'), f);
    assert.ok(beside(one.seats.p0, one.seats.p1), `${date}: child ${one.seats.p1} not beside ${one.seats.p0}`);
    const two = seatPlan(trip(['adult', 'adult', 'child', 'child', 'infant'], 'free'), f);
    assert.ok(beside(two.seats.p0, two.seats.p2) && beside(two.seats.p1, two.seats.p3), `${date}: ${JSON.stringify(two.seats)}`);
    assert.ok(Object.values(two.seats).every((s) => !EXITS.includes(rowOf(s))));
  }
});
