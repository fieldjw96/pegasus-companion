import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from '../lib/parse.js';
import { resolve, optionsFor, buildTrip, priceTrip, buildSteps, bundleWhy, chooseBundle } from '../lib/agent.js';
import { flightsFor, pickFlight } from '../lib/flights.js';
import { BUNDLES, bundlesFor, BAGS, byCode, THREADS, SUGGESTIONS, DEMO_UTTERANCE, EXTRAS } from '../lib/data.js';

const TODAY = '2026-10-03'; // Saturday, build day
const run = (text, ctx = {}) => resolve(parse(text, TODAY), ctx);

test('the spoken demo sentence becomes a complete trip without a single question', () => {
  const r = run(DEMO_UTTERANCE);
  assert.equal(r.complete, true);
  assert.equal(r.slots.where.code, 'BCN');
  assert.deepEqual([r.slots.when.out, r.slots.when.back, r.slots.when.src], ['2026-11-13', '2026-11-16', 'whatsapp']);
  assert.deepEqual([r.slots.time.out, r.slots.time.src], ['any', 'guess']);
  const t = buildTrip(r);
  assert.equal(t.travelers.length, 6);
  assert.equal(t.bundle, 'light');
  assert.equal(t.extras.insurance, false);
  assert.equal(t.extrasSrc.insurance, 'said');
  assert.equal(t.seat, 'free');
  assert.match(buildSteps(t).map((s) => s.text).join('|'), /Dates from The Boys/);
  const josh = t.travelers.find((p) => p.id === 'josh');
  assert.equal(josh.dob, null, 'Josh has no birthday on file, so the group link has a job');
});

test('Barbados is not on the network: ask once, then domestic Saver instead of Light', () => {
  const p = parse(DEMO_UTTERANCE.replace('Barcelona', 'Barbados'), TODAY);
  const r = resolve(p);
  assert.equal(r.slots.where, undefined);
  assert.deepEqual(r.missing, ['where']);
  assert.equal(p.unknown.name, 'Barbados');
  assert.deepEqual(optionsFor('where', r, TODAY).map((o) => o.value), ['AYT', 'BJV', 'BCN']);
  const t = buildTrip(resolve(p, { picks: { where: 'AYT' } }));
  assert.equal(t.bundle, 'saver');
  assert.match(bundleWhy(t).text, /Light isn't sold on domestic flights/);
});

test('switching WhatsApp off stops the companion from borrowing the group chat dates', () => {
  const r = run(DEMO_UTTERANCE, { connections: { whatsapp: false } });
  assert.deepEqual(r.missing, ['when']);
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
  assert.deepEqual([parse('Rome with Dana', TODAY).party.count, parse('Rome with Dana', TODAY).party.src], [2, 'contacts']);
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
  const funeral = buildTrip(run(THREADS.find((t) => t.id === 'grandma').intent));
  assert.equal(funeral.bundle, 'comfortflex');
});

test('local arrival times respect time zones and summer time', () => {
  const bcn = byCode('BCN');
  assert.equal(flightsFor(bcn, '2026-11-13', 'out')[0].arr, '08:45', '07:05 + 3h40, Istanbul is 2h ahead in winter');
  assert.equal(flightsFor(bcn, '2026-06-11', 'out')[0].arr, '09:45', 'one hour ahead in summer');
  const late = flightsFor(bcn, '2026-11-16', 'back')[3];
  assert.deepEqual([late.dep, late.arr, late.nextDay], ['23:50', '05:10', 1]);
  assert.equal(pickFlight(flightsFor(bcn, '2026-11-13', 'out'), 'evening').slot, 'evening');
});

test('every thread and suggestion uses a real destination, and only the designed ones ask a question', () => {
  const asks = { berlin: ['when'], ski: ['when'], wedding: ['time'], newyear: ['time'] };
  for (const item of [...THREADS, ...SUGGESTIONS]) {
    const r = run(item.intent);
    assert.ok(r.p.dest, `${item.id} has a Pegasus destination`);
    assert.deepEqual(r.missing, asks[item.id] || [], item.id);
    if (r.complete) {
      const t = buildTrip(r);
      const price = priceTrip(t);
      assert.equal(price.lines.reduce((s, l) => s + l.amount, 0), price.total, `${item.id} total adds up`);
    }
  }
});

test('extras change the total by exactly their price', () => {
  const t = buildTrip(run(DEMO_UTTERANCE));
  const before = priceTrip(t).total;
  t.extras.insurance = true;
  assert.equal(priceTrip(t).total - before, EXTRAS.insurance * 6);
});

test('nothing we ship contains an em dash or en dash', () => {
  const root = new URL('../', import.meta.url);
  const files = ['index.html', 'styles.css', 'app.js', 'README.md', ...readdirSync(new URL('lib/', root)).map((f) => `lib/${f}`)];
  for (const f of files) {
    const text = readFileSync(new URL(f, root), 'utf8');
    assert.equal(/[\u2013\u2014]/.test(text), false, f);
  }
});
