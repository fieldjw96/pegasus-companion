// The silent errors judgment 2026-10-03-1613 found, each pinned so it can't come back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../lib/parse.js';
import { resolve, buildTrip, priceTrip, waitingOn, optionsFor, partyLabel } from '../lib/agent.js';
import { EXTRAS } from '../lib/data.js';

const TODAY = '2026-10-03';
const run = (text, ctx = {}) => resolve(parse(text, TODAY), ctx);

test('"with my mom and dad" is three adults, and booking waits for their names', () => {
  const r = run('Izmir with my mom and dad 20 to 23 Dec evening');
  assert.equal(r.complete, true);
  const t = buildTrip(r);
  assert.deepEqual(t.travelers.map((p) => [p.first, p.type, !!p.placeholder]), [['Yitzy', 'adult', false], ['Mom', 'adult', true], ['Dad', 'adult', true]]);
  assert.equal(t.title, 'Family trip');
  assert.equal(waitingOn(t).length, 2, 'no booking reference until both names are in');
  assert.equal(priceTrip(t).seated, 3);
});

test('a baby is kept as an infant on a lap and priced as one', () => {
  const t = buildTrip(run('Antalya with my wife and my 6 month old baby, 10 to 14 Nov, morning'));
  assert.deepEqual(t.travelers.map((p) => p.type), ['adult', 'adult', 'infant']);
  const price = priceTrip(t);
  assert.equal(price.seated, 2);
  assert.equal(price.lines.find((l) => l.key === 'infant').amount, EXTRAS.infant * 2, 'infant fee on both flights');
  assert.equal(waitingOn(t).length, 1, 'the baby still needs a name and birthday');
  assert.equal(partyLabel(r2party('Antalya with my wife and my 6 month old baby')), '2 adults, 1 baby');
});

test('"back the same day" returns the same day, and says so', () => {
  const r = run('Ankara for a job interview on Monday morning, back the same day in the evening');
  assert.deepEqual([r.slots.when.out, r.slots.when.back], ['2026-10-05', '2026-10-05']);
  assert.match(r.slots.when.label, /same day/);
  assert.deepEqual([r.slots.time.out, r.slots.time.back], ['morning', 'evening']);
});

test('a guessed return is labelled as a guess from past trips, not as "you said"', () => {
  const r = run('Paris tomorrow evening');
  assert.equal(r.slots.when.backSrc, 'trip');
  assert.match(r.slots.when.label, /\+ 3 nights/);
  const back = buildTrip(r).heard.find((h) => h.k === 'back');
  assert.equal(back.src, 'trip');
});

test('a people word it cannot count becomes a one-tap question', () => {
  const r = run('Bodrum with my family 10 to 12 Nov, evening');
  assert.deepEqual(r.missing, ['who']);
  assert.equal(optionsFor('who', r, TODAY)[0].label, 'Just me');
  const picked = run('Bodrum with my family 10 to 12 Nov, evening', { picks: { who: 4 } });
  assert.equal(picked.complete, true);
  assert.equal(buildTrip(picked).travelers.length, 4);
});

test('possessives and purposes are not travelers', () => {
  assert.equal(parse("Ankara with Dana for Mom's 60th, 27 to 29 Nov", TODAY).party.count, 2);
  assert.equal(parse('Grandma passed. Get me home to Izmir on 6 Oct', TODAY).party.count, 1);
  assert.equal(parse('Dad and I to Ankara next weekend', TODAY).party.count, 2);
});

test('ages decide the passenger type', () => {
  assert.equal(parse('Antalya with my 3 year old son', TODAY).party.children, 1);
  assert.equal(parse('Antalya with my 14 year old daughter', TODAY).party.adults, 2);
  assert.equal(parse('Rome with my 2 kids and my wife', TODAY).party.children, 2);
});

function r2party(text) {
  return run(`${text}, 10 to 14 Nov, morning`).party;
}

test('switches off really means off: no group roster, no contacts, no habits', () => {
  const off = { whatsapp: false, gmail: false, calendar: false, contacts: false, work: false, trip: false, link: false };
  const r = run("I'm going to Barcelona with five of my friends 13 to 16 Nov, no bags, cheapest", { connections: off });
  const t = buildTrip(r);
  assert.equal(t.travelers.length, 6);
  assert.equal(t.travelers.filter((p) => p.placeholder).length, 5, 'friends become invites, not names from a chat');
  assert.equal(t.group, null);
  const dana = buildTrip(run('Rome with Dana 20 to 22 Nov, evening', { connections: off })).travelers[1];
  assert.deepEqual([dana.first, !!dana.placeholder], ['Dana', true], 'Dana is a name you said, details still needed');
  const habits = buildTrip(run('Paris 20 Nov, evening', { connections: off }));
  assert.equal(habits.needs.bagsSrc, 'guess', 'no past-trip bag habit');
  assert.equal(habits.heard.find((h) => h.k === 'back').src, 'guess', 'no past-trip trip length');
  for (const h of [...t.heard, ...habits.heard]) assert.ok(!Object.keys(off).includes(h.src), `${h.k} still uses ${h.src}`);
});
