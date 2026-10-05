// Scorecard (judgment 2026-10-03-1840, MUST 1): one sentence per row. A row passes
// if the trip is right, or if the companion visibly asks (a question) or shows the
// word it could not place (orange). A silent error, a wrong trip with no flag, fails.
// Still to add: real voice memos from classmates, transcribed as they were spoken (judgment 1840).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../lib/parse.js';
import { resolve, buildTrip, priceTrip, flightOf, optionsFor, SAME_DAY_BUFFER } from '../lib/agent.js';
import { daysBetween } from '../lib/dates.js';

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
  // judgment 2026-10-05-0155, MUST 3: the second pass, by class
  ...[
    ['Izmir tomorrow morning, back Sunday', '2026-10-04', '2026-10-11'],
    ['Izmir today, home Sunday, evening', '2026-10-03', '2026-10-04'],
    ['Ankara in 3 days, back on Friday, morning', '2026-10-06', '2026-10-09'],
    ['Ankara next week, back Friday, morning', '2026-10-05', '2026-10-09'],
    ['Izmir this weekend, back Monday, morning', '2026-10-09', '2026-10-12'],
    ['From the 10th to the 14th of November, Izmir, evening', '2026-11-10', '2026-11-14'],
    ['Izmir on the 10th, back on the 14th, morning', '2026-10-10', '2026-10-14'],
  ].map(([text, out, back]) => [text, (r) => r.slots.when.out === out && r.slots.when.back === back && !r.p.unplaced.length && !r.p.purpose]),
  ['Izmir 10 to 14 Nov, no morning flights', (r) => asks(r, 'time') && orange(r, 'morning')],
  ['Izmir 10 to 14 Nov, not in the morning please', (r) => asks(r, 'time') && orange(r, 'morning')],
  ['Izmir 10 to 14 Nov, cheapest, but not in the morning', (r) => asks(r, 'time') && !optionsFor('time', r, TODAY).some((o) => o.value === 'morning')],
  ['Antalya 10 to 14 Nov, morning, 2 adults, 2 children and an infant', (r) => party(r).join() === '2,2,1'],
  ['Antalya 10 to 14 Nov, morning, 3 adults and 1 child', (r) => party(r).join() === '3,1,0'],
  ['Antalya 10 to 14 Nov, morning, with a kid', (r) => party(r).join() === '1,1,0'],
  ['Bodrum with my toddler 10 to 13 Nov, morning', (r) => party(r).join() === '1,1,0'],
  ['London with my teen 4 to 6 Dec, afternoon', (r) => party(r).join() === '2,0,0'],
  ['Antalya with my five year old 10 to 14 Nov, morning', (r) => party(r).join() === '1,1,0'],
  ['Izmir for a couple of days from Friday, morning', (r) => r.complete && party(r).join() === '1,0,0'],
  ['Paris in November for a week, morning', (r) => asks(r, 'when') && optionsFor('when', r, TODAY).every((o) => o.value === 'pick' || daysBetween(o.value.out, o.value.back) === 7)],
  ['Antalya with my mom, not with my dad, 10 to 14 Nov, morning', (r) => party(r).join() === '2,0,0' && orange(r, 'dad')],
  ['From Istanbul to Rome 20 to 22 Nov, evening', (r) => r.complete && !r.p.unplaced.length],
  ['Grandma passed. Get me home to Izmir on 8 Oct, morning', (r) => buildTrip(r).bundle === 'saver'],
  ['Izmir 10 to 12 Nov, morning, I might cancel', (r) => buildTrip(r).bundle === 'saver' && !r.p.unplaced.length],
  // no dates said and none taken from a group chat: it asks
  ["I'm going to Barcelona with five of my friends. I don't need any bags, I just want the cheapest option.", (r) => party(r).join() === '6,0,0' && asks(r, 'when')],
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
