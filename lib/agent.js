// The companion's decisions. It needs three things before it acts: where,
// when, and what time of day. It fills them from what you said, then from
// connected context, and only asks for what is still missing. Everything
// after that it decides on its own and records why, so the trip page can
// show its reasoning next to every choice.

import { byCode, bundleById, bundlesFor, BUNDLE_ADD, BAGS, EXTRAS, ME, PEOPLE, GROUPS, HISTORY, ALTERNATIVES, POPULAR } from './data.js';
import { flightsFor, pickFlight, hash } from './flights.js';
import { addDays, fmtRange, daysBetween, makeISO, nextWeekday } from './dates.js';
import { weekendFriday } from './parse.js';

export const REQUIRED = ['where', 'when', 'time'];
export const TIME_LABEL = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night', any: 'Any time' };

function timeLabel({ out, back, src }) {
  if (out === back) return out === 'any' ? (src === 'guess' ? 'Cheapest time' : 'Any time') : TIME_LABEL[out];
  return `${TIME_LABEL[out]}, back ${TIME_LABEL[back].toLowerCase()}`;
}

// ---- the three must-haves ----------------------------------------------

export function resolve(p, { picks = {}, connections = {} } = {}) {
  const on = (src) => connections[src] !== false;
  const slots = {};

  if (p.dest && (p.destSrc !== 'link' || on('link'))) slots.where = { code: p.dest.code, label: p.dest.city, src: p.destSrc };
  else if (picks.where) slots.where = { code: picks.where, label: byCode(picks.where).city, src: 'you' };

  const d = p.dates;
  if (d.out) {
    const back = d.oneWay ? null : d.back || addDays(d.out, d.nights || HISTORY.usualNights);
    slots.when = { out: d.out, back, src: 'said', backSrc: d.back || d.oneWay || d.nights ? 'said' : 'trip' };
  } else if (picks.when) {
    slots.when = { ...picks.when, src: 'you', backSrc: 'you' };
  } else if (!d.monthOnly && p.party.group === 'boys' && on('whatsapp')) {
    const { plan, name } = GROUPS.boys;
    slots.when = { out: plan.out, back: plan.back, src: 'whatsapp', backSrc: 'whatsapp', note: `${name}: "${plan.quote}"` };
  }
  if (slots.when) slots.when.label = slots.when.back ? fmtRange(slots.when.out, slots.when.back) : `${fmtRange(slots.when.out)} · one way`;

  if (p.time) slots.time = { ...p.time, src: 'said' };
  else if (picks.time) slots.time = { out: picks.time, back: picks.time, src: 'you' };
  else if (p.budget.cheapest) slots.time = { out: 'any', back: 'any', src: 'guess', note: 'You said cheapest' };
  if (slots.time) slots.time.label = timeLabel(slots.time);

  const missing = REQUIRED.filter((k) => !slots[k]);
  return { p, slots, missing, complete: !missing.length };
}

// One-tap answers for a missing slot.
export function optionsFor(slot, r, today) {
  if (slot === 'where') {
    return (r.p.unknown ? ALTERNATIVES[r.p.unknown.vibe] : POPULAR).map((code) => ({ value: code, label: byCode(code).city }));
  }
  if (slot === 'time') {
    return ['morning', 'afternoon', 'evening', 'any'].map((k) => ({ value: k, label: k === 'any' ? 'Cheapest' : TIME_LABEL[k] }));
  }
  let fri = weekendFriday(today);
  const mo = r.p.dates.monthOnly;
  if (mo) {
    let y = +today.slice(0, 4);
    if (makeISO(y, mo, 28) < today) y += 1;
    fri = nextWeekday(makeISO(y, mo, 1), 5, true);
    if (fri < today) fri = weekendFriday(today);
  }
  const weekends = [0, 1, 2].map((i) => {
    const out = addDays(fri, 7 * i);
    const back = addDays(out, 2);
    return { value: { out, back }, label: fmtRange(out, back) };
  });
  return [...weekends, { value: 'pick', label: 'Pick dates' }];
}

// ---- what to buy -------------------------------------------------------

function needsFrom(p) {
  const bags = p.bags || { kind: HISTORY.usualBags, count: 0 };
  return {
    bags: bags.kind,
    bagCount: bags.kind === 'checked' ? Math.max(1, bags.count) : 0,
    bagsSrc: p.bags ? 'said' : 'trip',
    flex: p.budget.flex || p.purpose === 'funeral',
    flexSrc: p.budget.flex ? 'said' : 'guess',
    comfort: p.budget.comfort,
    seat: p.seats,
    meal: p.meal === true,
  };
}

// What a bundle still needs bought on top, per person per flight.
export function extrasPerLeg(bundleId, needs, intl) {
  const b = bundleById(bundleId);
  let cost = Math.max(0, needs.bagCount - (b.checked ? 1 : 0)) * EXTRAS.bag[intl ? 'intl' : 'dom'];
  if (['together', 'window', 'aisle'].includes(needs.seat) && !b.seat) cost += EXTRAS.seat;
  if (needs.seat === 'legroom' && !b.legroom) cost += EXTRAS.legroom;
  if (needs.meal && !b.meal) cost += EXTRAS.meal;
  return cost;
}

// Cheapest bundle-plus-extras that covers everything asked for.
export function chooseBundle(needs, intl) {
  const market = intl ? 'intl' : 'dom';
  let best = null;
  for (const b of bundlesFor(intl)) {
    if (needs.flex && !b.change) continue;
    if (needs.comfort && !b.legroom) continue;
    if (needs.bags === 'cabin' && !b.cabin) continue;
    const cost = BUNDLE_ADD[market][b.id] + extrasPerLeg(b.id, needs, intl);
    if (!best || cost < best.cost) best = { id: b.id, cost };
  }
  return best.id;
}

export function bundleWhy(t) {
  const n = t.needs;
  if (t.bundleSrc === 'you') return { text: 'Your pick', src: 'you' };
  if (t.bundle === 'comfortflex' && n.flex) {
    return { text: t.purpose === 'funeral' ? 'Comfort Flex: plans can shift' : 'Comfort Flex: free change and refund', src: n.flexSrc };
  }
  if (t.bundle === 'comfortflex') return { text: 'Comfort Flex: extra legroom', src: 'said' };
  if (t.bundle === 'light') return { text: 'No bags, so Light', src: n.bagsSrc };
  if (n.bags === 'none' && !t.intl) return { text: "Saver, since Light isn't sold on domestic flights", src: 'pegasus' };
  if (t.bundle === 'saver' && n.bags === 'checked') return { text: `Saver: ${BAGS.checkedKg[t.intl ? 'intl' : 'dom']} kg bag included`, src: n.bagsSrc };
  if (t.bundle === 'saver') return { text: n.bagsSrc === 'trip' ? 'Saver: you usually bring a cabin bag' : 'Saver: cabin bag included', src: n.bagsSrc };
  return { text: 'Saver Plus: seat and meal for less', src: 'pegasus' };
}

// ---- the trip ----------------------------------------------------------

function titleFor(p) {
  const byPurpose = {
    funeral: p.grandma ? "Grandma's funeral" : 'Funeral',
    wedding: 'Wedding', bachelor: 'Bachelor party', birthday: 'Birthday', work: 'Work trip', ski: 'Ski weekend', newyear: 'New Year',
  };
  if (byPurpose[p.purpose]) return byPurpose[p.purpose];
  if (p.party.group === 'boys') return "Boys' trip";
  if (p.party.count === 1) return 'Solo trip';
  if (p.party.count === 2 && p.party.members.length === 1) return `With ${PEOPLE[p.party.members[0]].first}`;
  return 'Getaway';
}

function emojiFor(p) {
  const byPurpose = { funeral: '🕊️', wedding: '💍', bachelor: '🥂', birthday: '🎂', work: '💼', ski: '⛷️', newyear: '🎆' };
  return byPurpose[p.purpose] || (p.party.group === 'boys' ? '🎉' : '✈️');
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function codeFor(seed, len = 6) {
  let h = hash(seed);
  let s = '';
  for (let i = 0; i < len; i++) {
    s += CODE_CHARS[h % 32];
    h = hash(`${seed}${i}${h}`);
  }
  return s;
}

function heardChips(r, needs, travelers) {
  const { p, slots } = r;
  const n = travelers.length;
  const bagLabel = { none: 'No bags', cabin: 'Cabin bag', checked: `${needs.bagCount} bag${needs.bagCount > 1 ? 's' : ''} each` }[needs.bags];
  const chips = [
    { k: 'where', icon: 'pin', label: slots.where.label, src: slots.where.src },
    { k: 'when', icon: 'calendar', label: slots.when.label, src: slots.when.src },
    { k: 'time', icon: 'clock', label: slots.time.label, src: slots.time.src },
    { k: 'who', icon: 'people', label: n === 1 ? 'Just you' : `${n} people`, src: p.party.src },
    { k: 'bags', icon: needs.bags === 'none' ? 'backpack' : needs.bags === 'cabin' ? 'cabin' : 'suitcase', label: bagLabel, src: needs.bagsSrc },
  ];
  if (p.budget.cheapest) chips.push({ k: 'cheap', icon: 'tag', label: 'Cheapest', src: 'said' });
  if (needs.flex) chips.push({ k: 'flex', icon: 'refresh', label: 'Flexible', src: needs.flexSrc });
  if (p.insurance !== null) chips.push({ k: 'ins', icon: 'shield', label: p.insurance ? 'Insurance' : 'No insurance', src: 'said', off: !p.insurance });
  if (p.seats) chips.push({ k: 'seat', icon: 'seat', label: { together: 'Sit together', legroom: 'Legroom', window: 'Window', aisle: 'Aisle' }[p.seats], src: 'said' });
  if (p.autopilot) chips.push({ k: 'auto', icon: 'spark', label: 'No steps', src: 'said' });
  if (p.link) chips.push({ k: 'link', icon: 'link', label: p.link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0], src: 'link' });
  return chips;
}

let seq = 0;
export function buildTrip(r, { id, status = 'draft', title, emoji, origin = 'text' } = {}) {
  const { p, slots } = r;
  const dest = byCode(slots.where.code);
  const needs = needsFrom(p);
  const flights = { out: { list: flightsFor(dest, slots.when.out, 'out'), slot: slots.time.out }, back: null };
  flights.out.pick = pickFlight(flights.out.list, flights.out.slot).no;
  if (slots.when.back) {
    flights.back = { list: flightsFor(dest, slots.when.back, 'back'), slot: slots.time.back };
    flights.back.pick = pickFlight(flights.back.list, flights.back.slot).no;
  }

  const travelers = [{ ...ME, confirmed: true }];
  for (const m of p.party.members) travelers.push({ id: m, ...PEOPLE[m], confirmed: false });
  for (let i = 0; i < p.party.guests; i++) {
    travelers.push({ id: `guest${i + 1}`, first: 'Guest', last: String(i + 2), dob: null, src: 'link', guest: true, confirmed: false });
  }

  const tripId = id || `t${Date.now().toString(36)}${(seq++).toString(36)}`;
  return {
    id: tripId,
    created: Date.now(),
    status,
    origin,
    text: p.text,
    emoji: emoji || emojiFor(p),
    title: title || titleFor(p),
    dest: dest.code,
    intl: dest.intl,
    out: slots.when.out,
    back: slots.when.back,
    whenSrc: slots.when.src,
    whenNote: slots.when.note || null,
    time: { out: slots.time.out, back: slots.time.back, src: slots.time.src },
    purpose: p.purpose,
    group: p.party.group,
    cheapest: p.budget.cheapest,
    needs,
    bundle: chooseBundle(needs, dest.intl),
    bundleSrc: 'agent',
    seat: p.seats || 'free',
    seatSrc: p.seats ? 'said' : 'agent',
    extras: { insurance: p.insurance === true, meal: needs.meal, lounge: false, car: false },
    extrasSrc: { insurance: p.insurance === null ? 'agent' : 'said', meal: p.meal === null ? 'agent' : 'said' },
    flights,
    travelers,
    heard: heardChips(r, needs, travelers),
    code: codeFor(tripId),
    pnr: null,
    sent: false,
  };
}

export const flightOf = (t, dir) => t.flights[dir] && t.flights[dir].list.find((f) => f.no === t.flights[dir].pick);
const legs = (t) => ['out', 'back'].map((d) => flightOf(t, d)).filter(Boolean);

// Bundle add-on per person for the whole trip.
export const bundlePrice = (t, id) => BUNDLE_ADD[t.intl ? 'intl' : 'dom'][id] * legs(t).length;

export function priceTrip(t) {
  const n = t.travelers.length;
  const market = t.intl ? 'intl' : 'dom';
  const b = bundleById(t.bundle);
  const L = legs(t);
  const lines = [];
  const add = (key, label, amount) => {
    if (amount) lines.push({ key, label, amount });
  };
  add('fare', `Flights ×${n}`, L.reduce((s, f) => s + f.fare, 0) * n);
  add('bundle', b.name, BUNDLE_ADD[market][b.id] * L.length * n);
  const seatEach = ['together', 'window', 'aisle'].includes(t.seat) && !b.seat ? EXTRAS.seat : t.seat === 'legroom' && !b.legroom ? EXTRAS.legroom : 0;
  add('seat', 'Seats', seatEach * L.length * n);
  add('bag', 'Extra bags', Math.max(0, t.needs.bagCount - (b.checked ? 1 : 0)) * EXTRAS.bag[market] * L.length * n);
  add('meal', 'Meals', t.extras.meal && !b.meal ? EXTRAS.meal * L.length * n : 0);
  add('insurance', 'Insurance', t.extras.insurance ? EXTRAS.insurance * n : 0);
  add('lounge', 'Lounge', t.extras.lounge ? EXTRAS.lounge * n : 0);
  add('car', 'Car', t.extras.car ? EXTRAS.car * Math.max(1, t.back ? daysBetween(t.out, t.back) : 1) : 0);
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { lines, total, each: Math.round(total / n), n };
}

// The "working on it" beats shown while the trip is assembled.
export function buildSteps(t) {
  const steps = [];
  const said = t.heard.filter((h) => h.src === 'said').length;
  if (said) steps.push({ src: 'said', text: `Caught ${said} things you said` });
  if (t.whenSrc === 'whatsapp') steps.push({ src: 'whatsapp', text: `Dates from ${GROUPS.boys.name}: ${fmtRange(t.out, t.back)}` });
  else if (t.group) steps.push({ src: 'whatsapp', text: `Found ${GROUPS.boys.name}` });
  if (t.travelers.length > 1) {
    const known = t.travelers.filter((x) => x.dob).length;
    steps.push({ src: 'contacts', text: `${known} of ${t.travelers.length} birthdays filled in` });
  }
  steps.push({ src: 'pegasus', text: `Compared ${t.flights.out.list.length + (t.flights.back ? t.flights.back.list.length : 0)} flights` });
  const why = bundleWhy(t);
  steps.push({ src: why.src, text: why.text });
  steps.push({ src: 'pegasus', text: `Ready: €${priceTrip(t).total}` });
  return steps;
}
