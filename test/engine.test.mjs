import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from '../lib/parse.js';
import { resolve, optionsFor, buildTrip, priceTrip, bundleWhy, chooseBundle, waitingOn } from '../lib/agent.js';
import { flightsFor, pickFlight } from '../lib/flights.js';
import { BUNDLES, bundlesFor, BAGS, byCode, DEMO_UTTERANCE, EXTRAS, ME } from '../lib/data.js';

const TODAY = '2026-10-03'; // Saturday, build day
const run = (text, ctx = {}) => resolve(parse(text, TODAY), ctx);

// Everyday sentences (they were the old landing page's threads and suggestions).
const SENTENCES = {
  boys: 'Barcelona with the boys, cheapest, no bags, no insurance',
  grandma: 'Grandma passed. Get me home to Izmir on 6 Oct, morning flight, back 9 Oct, plans might change, one bag',
  berlin: 'Berlin for client meetings, carry-on only, morning flights',
  mom60: "Ankara with Dana for Mom's 60th, 27 to 29 Nov, evening, carry-on",
  ski: 'Ski weekend in Erzurum with the boys in January, evening flights, one bag',
  tbilisi: 'Tbilisi with Dana 14 to 17 Aug 2026, cheapest, carry-on',
  athens: 'Athens with Dana 5 to 8 Jun 2026, morning, one bag',
  dubai: 'Dubai solo 2 to 5 May 2026, night flight, carry-on',
  prague: 'Prague with Ali and Mert 30 Dec 2025 to 2 Jan 2026, cheapest, no bags',
  wedding: "Antalya for Elif and Can's wedding with Dana, 11 to 13 Jun, one bag",
  newyear: 'Ankara with Dana 31 Dec to 2 Jan, carry-on',
  offsite: 'Amsterdam for the work offsite 23 to 25 Nov, morning flights, carry-on',
  holiday: 'Tbilisi with Dana 29 Oct to 1 Nov, cheapest, carry-on',
  bday: 'Rome with Dana for her birthday, 20 to 22 Nov, evening, carry-on',
  vienna: 'Vienna with Dana 11 to 13 Dec, cheapest, carry-on',
  baku: 'Baku solo 6 to 8 Nov, cheapest, no bags',
  concert: 'London with Daniel 4 to 6 Dec, afternoon, carry-on',
  mom: 'Ankara solo next weekend, evening, carry-on',
};

test('the spoken demo sentence becomes a complete trip without a single question', () => {
  const r = run(DEMO_UTTERANCE);
  assert.equal(r.complete, true);
  assert.equal(r.slots.where.code, 'AYT');
  assert.deepEqual([r.slots.when.out, r.slots.when.back, r.slots.when.src], ['2026-11-10', '2026-11-14', 'said']);
  assert.deepEqual([r.slots.time.out, r.slots.time.src], ['morning', 'said']);
  const t = buildTrip(r);
  assert.deepEqual(t.travelers.map((x) => [x.first, x.type, x.src]), [[ME.first, 'adult', 'profile'], ['Dana', 'adult', 'trip'], ['Baby', 'infant', 'said']]);
  assert.equal(t.bundle, 'saver', 'one bag on a domestic flight');
  assert.equal(t.seat, 'free');
  assert.deepEqual(waitingOn(t).map((x) => x.first), ['Baby'], 'only the baby still needs a name and birthday');
});

test('Barbados is not on the network: ask once, then domestic Saver instead of Light', () => {
  const p = parse("I'm going to Barbados with five of my friends 13 to 16 Nov. No bags, cheapest.", TODAY);
  const r = resolve(p);
  assert.equal(r.slots.where, undefined);
  assert.deepEqual(r.missing, ['where']);
  assert.equal(p.unknown.name, 'Barbados');
  assert.deepEqual(optionsFor('where', r, TODAY).map((o) => o.value), ['AYT', 'BJV', 'BCN']);
  const t = buildTrip(resolve(p, { picks: { where: 'AYT' } }));
  assert.equal(t.bundle, 'saver');
  assert.match(bundleWhy(t).text, /Light isn't sold on domestic flights/);
});

test('"the boys" come from past Pegasus trips, and the past-trips switch really stops that', () => {
  const on = run('Barcelona with the boys 13 to 16 Nov, cheapest');
  assert.deepEqual([on.party.count, on.party.src, on.complete], [6, 'trip', true]);
  const off = run('Barcelona with the boys 13 to 16 Nov, cheapest', { connections: { trip: false } });
  assert.deepEqual(off.missing, ['who'], 'nothing left to count from, so it asks');
  const said = run("Barcelona with five of my friends 13 to 16 Nov, cheapest", { connections: { trip: false } });
  assert.equal(said.complete, true, 'a head count you said needs no history');
  assert.equal(buildTrip(said).travelers.filter((x) => x.placeholder).length, 5);
});

test('dates', () => {
  const cases = [
    ['13 to 16 Nov', '2026-11-13', '2026-11-16'],
    ['Nov 13-16', '2026-11-13', '2026-11-16'],
    ['28 Nov to 2 Dec', '2026-11-28', '2026-12-02'],
    ['from the 13th to the 16th of November', '2026-11-13', '2026-11-16'],
    ['Dec 30 to Jan 2', '2026-12-30', '2027-01-02'],
    ['31 Dec to 2 Jan', '2026-12-31', '2027-01-02'],
    ['this weekend', '2026-10-09', '2026-10-11'],
    ['friday to monday', '2026-10-09', '2026-10-12'],
    ['on 6 Oct, morning flight, back 9 Oct', '2026-10-06', '2026-10-09'],
    ['Nov 13 for 3 nights', '2026-11-13', '2026-11-16'],
    ['13/11 - 16/11', '2026-11-13', '2026-11-16'],
    ['March 3 to 5', '2027-03-03', '2027-03-05'],
    ['14 to 17 Aug 2026', '2026-08-14', '2026-08-17'],
  ];
  for (const [text, out, back] of cases) {
    const d = parse(`Barcelona ${text}`, TODAY).dates;
    assert.deepEqual([d.out, d.back], [out, back], text);
  }
  assert.equal(parse('Erzurum in January', TODAY).dates.monthOnly, 1);
  assert.equal(parse('Izmir 6 Oct one way', TODAY).dates.oneWay, true);
});

test('words that only look like dates stay words', () => {
  assert.equal(parse('Antalya for the wedding', TODAY).dates.out, null, 'wedding is not Wednesday');
  assert.equal(parse('Berlin, plans may change', TODAY).dates.monthOnly, null, 'may is not May');
  assert.equal(parse('somewhere with sun, Athens', TODAY).dates.out, null, 'sun is not Sunday');
  assert.equal(parse('Barcelona with my friends', TODAY).dates.out, null, 'friends is not Friday');
});

test('time of day, per direction', () => {
  assert.deepEqual(parse('Rome, leave friday evening, back monday morning', TODAY).time, { out: 'evening', back: 'morning' });
  assert.deepEqual(parse('Rome at 7pm', TODAY).time, { out: 'evening', back: 'evening' });
  assert.equal(parse('Rome in early November', TODAY).time, null, '"early" alone is not a morning flight');
});

test('bags and party size', () => {
  assert.deepEqual(parse('I want one bag', TODAY).bags, { kind: 'checked', count: 1 });
  assert.equal(parse('carry-on only', TODAY).bags.kind, 'cabin');
  assert.equal(parse('just a backpack', TODAY).bags.kind, 'none');
  assert.equal(parse('no luggage', TODAY).bags.kind, 'none');
  const four = parse('Prague, me and 3 friends', TODAY).party;
  assert.deepEqual([four.count, four.guests, four.group], [4, 3, null]);
  assert.deepEqual([parse('Rome with Dana', TODAY).party.count, parse('Rome with Dana', TODAY).party.src], [2, 'said']);
  assert.equal(parse('Dubai solo', TODAY).party.src, 'said');
  assert.equal(parse('Dubai', TODAY).party.src, 'guess');
  assert.equal(parse('Bali', TODAY).party.members.includes('ali'), false);
});

test('fare families match the real Pegasus rules (rubric R9)', () => {
  assert.equal(bundlesFor(false).some((b) => b.id === 'light'), false, 'Light is international only');
  assert.deepEqual(BAGS.checkedKg, { dom: 15, intl: 20 });
  assert.equal(BAGS.under, '40×30×15 cm · 3 kg');
  assert.equal(BAGS.cabin, '55×40×23 cm · 8 kg');
  const [light, saver, plus, flex] = BUNDLES;
  assert.equal(plus.seat && !plus.legroom, true, 'Saver Plus seats are not extra-legroom');
  assert.equal(flex.legroom && flex.change && flex.refund, true);
  for (const [lower, higher] of [[light, saver], [saver, plus], [plus, flex]]) {
    for (const k of ['under', 'cabin', 'checked', 'seat', 'legroom', 'meal', 'watch', 'change', 'refund']) {
      if (lower[k]) assert.equal(higher[k], true, `${higher.name} keeps ${k} from ${lower.name}`);
    }
  }
});

test('the bundle is the cheapest one that covers what was asked', () => {
  const needs = (o) => ({ bags: 'none', bagCount: 0, flex: false, comfort: false, seat: null, meal: false, ...o });
  assert.equal(chooseBundle(needs(), true), 'light');
  assert.equal(chooseBundle(needs(), false), 'saver');
  assert.equal(chooseBundle(needs({ bags: 'cabin' }), true), 'saver');
  assert.equal(chooseBundle(needs({ bags: 'checked', bagCount: 1 }), true), 'saver');
  assert.equal(chooseBundle(needs({ flex: true }), true), 'comfortflex');
  assert.equal(chooseBundle(needs({ seat: 'together' }), true), 'light', 'Light plus paid seats beats Saver Plus');
  const funeral = buildTrip(run(SENTENCES.grandma));
  assert.equal(funeral.bundle, 'saver', 'nothing paid unasked, a funeral included (a blue line offers Comfort Flex)');
  assert.equal(buildTrip(run('Izmir 10 to 12 Nov, morning, refundable please')).bundle, 'comfortflex', 'asked for in words');
  assert.equal(buildTrip(run('Izmir 10 to 12 Nov, morning, I might cancel')).bundle, 'saver', '"cancel" never upgrades');
});

test('local arrival times respect time zones and summer time', () => {
  const bcn = byCode('BCN');
  assert.equal(flightsFor(bcn, '2026-11-13', 'out')[0].arr, '08:45', '07:05 + 3h40, Istanbul is 2h ahead in winter');
  assert.equal(flightsFor(bcn, '2026-06-11', 'out')[0].arr, '09:45', 'one hour ahead in summer');
  const late = flightsFor(bcn, '2026-11-16', 'back')[3];
  assert.deepEqual([late.dep, late.arr, late.nextDay], ['23:50', '05:10', 1]);
  assert.equal(pickFlight(flightsFor(bcn, '2026-11-13', 'out'), 'evening').slot, 'evening');
});

test('everyday sentences reach a real destination, and only the designed ones ask a question', () => {
  const asks = { boys: ['when'], berlin: ['when'], ski: ['when'], wedding: ['time'], newyear: ['time'] };
  for (const [id, text] of Object.entries(SENTENCES)) {
    const r = run(text);
    assert.ok(r.p.dest, `${id} has a Pegasus destination`);
    assert.deepEqual(r.missing, asks[id] || [], id);
    if (r.complete) {
      const t = buildTrip(r);
      const price = priceTrip(t);
      assert.equal(price.lines.reduce((s, l) => s + l.amount, 0), price.total, `${id} total adds up`);
    }
  }
});

test('extras change the total by exactly their price', () => {
  const t = buildTrip(run(DEMO_UTTERANCE));
  const before = priceTrip(t).total;
  t.extras.insurance = true;
  assert.equal(priceTrip(t).total - before, EXTRAS.insurance * t.travelers.length);
});

test('nothing we ship contains an em dash or en dash', () => {
  const root = new URL('../', import.meta.url);
  const files = ['index.html', 'styles.css', 'app.js', 'README.md', ...readdirSync(new URL('lib/', root)).map((f) => `lib/${f}`)];
  for (const f of files) {
    const text = readFileSync(new URL(f, root), 'utf8');
    assert.equal(/[\u2013\u2014]/.test(text), false, f);
  }
});
