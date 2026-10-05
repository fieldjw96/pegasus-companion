// Talking to change the trip (lib/talk.js). Every sentence after the first is a
// change with a receipt; nothing changes silently, and every change can be undone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replay, gate, headsUp } from '../lib/talk.js';
import { flightOf, priceTrip } from '../lib/agent.js';
import { DEMO_UTTERANCE, DEMO_CHANGE } from '../lib/data.js';

const TODAY = '2026-10-03';
let n = 0;
const say = (text) => ({ id: `e${++n}`, k: 'say', text });
const view = (...events) => replay(events, TODAY);
const last = (v) => v.said[v.said.length - 1];
const names = (v) => v.trip.travelers.map((x) => x.first);
const base = () => say(DEMO_UTTERANCE);

test('the demo: one sentence fills the trip, the next one changes it, with a receipt', () => {
  const b = base();
  const before = view(b);
  assert.deepEqual([before.trip.dest, before.trip.out, before.trip.back], ['AYT', '2026-11-10', '2026-11-14']);
  const v = view(b, say(DEMO_CHANGE));
  assert.equal(v.trip.back, '2026-11-15');
  assert.deepEqual(names(v), ['Yitzy', 'Dana', 'Baby', 'Mom']);
  const r = last(v).receipt;
  assert.deepEqual(r.slice(0, 2), ['Back Sun 15 Nov', 'Mom added']);
  assert.equal(+r[2].match(/^€(\d+) more$/)[1], priceTrip(v.trip).total - priceTrip(before.trip).total, 'the receipt shows the real price change');
});

test('undo is dropping the event, and taps made after it survive', () => {
  const b = base();
  const tap = { id: 'tap', k: 'flight', dir: 'back', no: view(b).trip.flights.back.list[2].no };
  const undone = view(b, tap);
  assert.deepEqual([undone.trip.back, names(undone).join()], ['2026-11-14', 'Yitzy,Dana,Baby']);
  assert.equal(undone.trip.flights.back.pick, tap.no);
});

test('a change keeps your taps unless it touches them', () => {
  const b = base();
  const list = view(b).trip.flights.back.list;
  const tap = { id: 't1', k: 'flight', dir: 'back', no: list[1].no };
  assert.equal(view(b, tap, say('add my mom')).trip.flights.back.pick, list[1].no, 'adding someone keeps the flight you tapped');
  const reset = view(b, tap, say('evening flights back'));
  assert.equal(flightOf(reset.trip, 'back').slot, 'evening', 'a new time of day replaces it');
  const outTap = { id: 't2', k: 'flight', dir: 'out', no: view(b).trip.flights.out.list[1].no };
  const both = view(b, outTap, say('evening flights back'));
  assert.equal(both.trip.flights.out.pick, outTap.no, 'and the flight out you tapped stays yours');
  assert.equal(flightOf(both.trip, 'back').slot, 'evening');
});

test('details typed for one person stay with that person when others come and go', () => {
  const b = base();
  const add = say('add my mom');
  const mom = view(b, add).trip.travelers.find((x) => x.first === 'Mom');
  const fill = { id: 'p1', k: 'person', pid: mom.id, data: { first: 'Leah', last: 'Rosenberg', dob: '1966-03-09', src: 'you', confirmed: true } };
  assert.deepEqual(names(view(b, add, fill, say('drop the baby'))), ['Yitzy', 'Dana', 'Leah']);
});

test('dates by talking: nights, one more, earlier, later, new dates, one way, same day', () => {
  const cases = [
    ['make it five nights', '2026-11-10', '2026-11-15'],
    ['one more night', '2026-11-10', '2026-11-15'],
    ['one night less', '2026-11-10', '2026-11-13'],
    ['a day earlier', '2026-11-09', '2026-11-13'],
    ['leave a day later', '2026-11-11', '2026-11-14'],
    ['20 to 24 Nov', '2026-11-20', '2026-11-24'],
    ['one way', '2026-11-10', null],
    ['back the same day', '2026-11-10', '2026-11-10'],
  ];
  for (const [text, out, back] of cases) {
    const v = view(base(), say(text));
    assert.deepEqual([v.trip.out, v.trip.back], [out, back], text);
    assert.equal(v.orange.length, 0, `${text}: every word used`);
  }
});

test('in a change, a weekday means the one nearest the trip, not the one nearest today', () => {
  const v = view(base(), say('leave on Friday'));
  assert.deepEqual([v.trip.out, v.trip.back], ['2026-11-13', '2026-11-17'], 'that week, same 4 nights');
  assert.equal(view(base(), say('back on Sunday')).trip.back, '2026-11-15');
});

test("people by talking: add, drop, can't come, just me, head counts", () => {
  const b = base();
  assert.deepEqual(names(view(b, say('drop the baby'))), ['Yitzy', 'Dana']);
  assert.deepEqual(names(view(b, say('without my wife'))), ['Yitzy', 'Baby']);
  assert.deepEqual(names(view(b, say('add my mom'), say("my mom can't come"))), ['Yitzy', 'Dana', 'Baby']);
  assert.deepEqual(names(view(b, say('just me'))), ['Yitzy']);
  const two = view(b, say('add two friends'));
  assert.deepEqual([two.trip.travelers.length, last(two).receipt[0]], [5, '2 more travelers added']);
  assert.equal(view(b, say('we are 5')).trip.travelers.length, 5);
  assert.equal(names(view(b, say('add my mom'), say('add my mom'))).filter((x) => x === 'Mom').length, 1, 'one mom');
});

test('bundle and extras by talking; Light on a domestic flight is refused with the reason', () => {
  const b = base();
  assert.equal(view(b, say('switch to Saver Plus')).trip.bundle, 'saverplus');
  const light = view(b, say('switch to Light'));
  assert.equal(light.trip.bundle, 'saver');
  assert.ok(last(light).receipt.includes("Light isn't sold on domestic flights"));
  const extras = view(b, say('add insurance and seats together'));
  assert.deepEqual([extras.trip.extras.insurance, extras.trip.seat], [true, 'together']);
  assert.deepEqual(last(view(b, say('no bags'))).receipt, ["Saver, since Light isn't sold on domestic flights"], 'no change still says why');
});

test('"a later flight" moves one flight, and says so when there is none', () => {
  const b = base();
  assert.deepEqual(last(view(b, say('earlier flight'))).receipt, ['No earlier flight that day']);
  const later = view(b, say('later flight'));
  assert.equal(flightOf(later.trip, 'out').dep, '12:40');
  assert.equal(later.trip.flights.out.bySaid, true);
});

test('a missing piece can be answered by talking, and a tapped answer can be changed by talking', () => {
  const s = say('Berlin with Dana, carry-on only');
  assert.deepEqual(view(s).r.missing, ['when', 'time']);
  const v = view(s, say('20 to 22 Nov, evening'));
  assert.equal(v.trip.out, '2026-11-20');
  assert.ok(last(v).receipt.includes('Leave Fri 20 Nov'));
  const boys = say('Barcelona with the boys, cheapest, no bags');
  const pick = { id: 'pk', k: 'pick', slot: 'when', value: { out: '2026-11-13', back: '2026-11-16' } };
  assert.equal(view(boys, pick).r.slots.when.src, 'you');
  const longer = view(boys, pick, say('one more night'));
  assert.deepEqual([longer.trip.back, longer.r.slots.when.src], ['2026-11-17', 'said']);
});

test('a word it cannot use stays orange and holds Book until tapped; nothing changes silently', () => {
  const b = base();
  const c = say('make it purple');
  const v = view(b, c);
  assert.deepEqual(last(v).receipt, ['Nothing changed']);
  assert.deepEqual(v.orange.map((o) => o.word), ['purple']);
  assert.equal(gate(v).k, 'orange');
  assert.equal(gate(view(b, c, { id: 'c1', k: 'clear', say: c.id, word: 'purple' })).k, 'names', "then it waits for the baby's details");
  const past = view(say('Ankara next weekend, morning'), say('two weeks earlier'));
  assert.ok(last(past).receipt.includes('That would be in the past, so the dates stay'));
});

test('heads-up lines can lower or raise the price, one tap each, two at most', () => {
  const boys = say("I'm going to Barcelona with five of my friends. No bags, cheapest.");
  const pick = { id: 'pk2', k: 'pick', slot: 'when', value: { out: '2026-11-13', back: '2026-11-16' } };
  const v = view(boys, pick);
  assert.equal(v.trip.bundle, 'light');
  const tips = headsUp(v.trip);
  assert.deepEqual(tips.map((x) => x.k), ['late', 'apart']);
  assert.match(tips[0].text, /^Lands 05:10 the next morning\. The 08:15 lands/);
  const together = view(boys, pick, { id: 's1', k: 'seat', v: 'together' });
  assert.deepEqual(headsUp(together.trip).map((x) => x.k), ['late', 'light'], 'seats together, so the Light bag line gets its turn');
  const evening = view(say('Berlin 20 to 22 Nov, leave in the evening, back in the morning, carry-on'));
  const cheaper = headsUp(evening.trip).find((x) => x.k === 'cheaper');
  assert.match(cheaper.text, /^The 07:05 is €\d+ less each\.$/, 'down as well as up');
  assert.equal(headsUp(view(base(), say('make it five nights')).trip).some((x) => x.k === 'cheaper'), false, 'never a €1 saving that lands after midnight');
});
