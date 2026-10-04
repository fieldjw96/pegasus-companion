// Scorecard (judgment 2026-10-03-1840, MUST 1): one sentence per row. A row passes
// if the trip is right, or if the companion visibly asks (a question) or shows the
// word it could not place (orange). A silent error, a wrong trip with no flag, fails.
// Still to add: real voice memos from classmates, transcribed as they were spoken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../lib/parse.js';
import { resolve, buildTrip, priceTrip, flightOf, SAME_DAY_BUFFER } from '../lib/agent.js';

const TODAY = '2026-10-03';
const mins = (hhmm) => hhmm.split(':').map(Number).reduce((h, m) => h * 60 + m);
const run = (text, picks = {}) => resolve(parse(text, TODAY), { picks });
const asks = (r, k) => r.missing.includes(k);
const orange = (r, w) => r.p.unplaced.some((u) => u.word === w);
const party = (r) => [r.party.adults, r.party.children, r.party.infants];

const ROWS = [
  // the three sentences that killed v1
  ['Izmir with my mom and dad 20 to 23 Dec evening', (r) => r.complete && party(r).join() === '3,0,0'],
  ['Antalya with my wife and my 6 month old baby, 10 to 14 Nov, morning', (r) => r.complete && party(r).join() === '2,0,1'],
  ['Ankara for a job interview on Monday morning, back the same day in the evening', (r) => {
    const t = buildTrip(r);
    return t.back === t.out && mins(flightOf(t, 'back').dep) >= mins(flightOf(t, 'out').arr) + SAME_DAY_BUFFER;
  }],
  // the twelve off-script sentences from judgment 1840
  ['Antalya with my wife and a newborn, 10 to 14 Nov, morning', (r) => party(r).join() === '2,0,1'],
  ['Bodrum with the twins, they are 18 months, 10 to 13 Nov, morning', (r) => party(r).join() === '1,0,2' && asks(r, 'lap')],
  ['Berlin with my colleague 20 to 22 Nov, morning', (r) => party(r).join() === '2,0,0'],
  ["Annemle babamla yılbaşında İzmir'e, akşam uçuşu", (r) => party(r).join() === '3,0,0' && orange(r, 'yilbasinda') && asks(r, 'when')],
  ['Me and my two babies to Antalya 10 to 14 Nov, morning', (r) => asks(r, 'lap')],
  ['Ankara on Monday morning, back that night', (r) => {
    const t = buildTrip(r);
    return t.back === t.out && mins(flightOf(t, 'back').dep) >= mins(flightOf(t, 'out').arr) + SAME_DAY_BUFFER;
  }],
  ['Antalya with my son, he is 13, 10 to 14 Nov, morning', (r) => party(r).join() === '2,0,0'],
  ['Izmir with my daughter, she turns two on 20 December, 10 to 27 Dec, morning', (r) => {
    const t = buildTrip(r);
    const p = priceTrip(t);
    return t.travelers[1].turnsTwo === '2026-12-20' && p.seated === 2 && t.heard.some((h) => h.k === 'two');
  }],
  ['Bodrum with our baby and my in-laws 10 to 13 Nov, morning', (r) => asks(r, 'who') && r.party.infants === 1],
  ['London with a friend next weekend, evening', (r) => party(r).join() === '2,0,0'],
  ['Tbilisi with my 12 year old 10 to 13 Nov, morning', (r) => party(r).join() === '1,1,0'],
  ['Amsterdam with my sister and her 2 year old, 20 to 23 Nov, evening', (r) => party(r).join() === '2,1,0'],
  // more people, ages and Turkish
  ['Rome with my 2 kids and my wife', (r) => party(r).join() === '2,2,0' && asks(r, 'when')],
  ['Berlin with my cousins 20 to 22 Nov, morning', (r) => asks(r, 'who')],
  ['Dubai with my boss, Sunday to Wednesday, morning', (r) => party(r).join() === '2,0,0'],
  ["Eşimle ve bebeğimle Antalya'ya 10 to 14 Nov, sabah", (r) => party(r).join() === '2,0,1' && r.slots.time.out === 'morning'],
  ['Ankara tomorrow with my mom, she is 70, evening', (r) => party(r).join() === '2,0,0'],
  ['Paris with my wife and our son and daughter 5 to 9 Dec, morning', (r) => party(r).join() === '2,2,0'],
  ['Izmir with my newborn twins 10 to 14 Nov, morning', (r) => party(r).join() === '1,0,2' && asks(r, 'lap')],
  ['Trabzon with my wife and 2 babies 10 to 14 Nov, morning', (r) => party(r).join() === '2,0,2' && !asks(r, 'lap')],
  ['Berlin with Dana and her mom 20 to 22 Nov, evening', (r) => party(r).join() === '3,0,0'],
  ['Antalya 10 to 14 Nov, she turns 2 soon', (r) => orange(r, 'turns') || asks(r, 'who')],
  ["I'm going to Barcelona with five of my friends. I don't need any bags, I just want the cheapest option.", (r) => r.complete && party(r).join() === '6,0,0'],
];

test(`scorecard: ${ROWS.length} sentences, no silent errors`, () => {
  const failed = ROWS.filter(([s, ok]) => !ok(run(s))).map(([s]) => s);
  assert.deepEqual(failed, []);
});

test('answering the lap question keeps both babies on the booking', () => {
  const seat = run('Me and my two babies to Antalya 10 to 14 Nov, morning', { lap: 'seat' });
  assert.deepEqual(party(seat), [1, 1, 1]);
  const t = buildTrip(seat);
  assert.equal(t.travelers.length, 3);
  assert.ok(t.heard.some((h) => h.k === 'lapseat'));
  const adult = run('Me and my two babies to Antalya 10 to 14 Nov, morning', { lap: 'adult' });
  assert.deepEqual(party(adult), [2, 0, 2]);
});

test('answering "how many" keeps the baby', () => {
  const r = run('Bodrum with our baby and my in-laws 10 to 13 Nov, morning', { who: 4 });
  assert.equal(r.complete, true);
  assert.equal(r.party.infants, 1);
  assert.equal(buildTrip(r).travelers.length, 4);
});
