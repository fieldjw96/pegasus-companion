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
// The return date: said, or a length said, or the passenger's usual trip length.
export const backFor = (d) => (d.oneWay ? null : d.back || addDays(d.out, d.nights || HISTORY.usualNights));
// Back the same day: the return leaves at least this long after the outbound lands.
export const SAME_DAY_BUFFER = 180;
const minutesOf = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
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
    // d.src is 'you' when the dates came from a tap, otherwise you said them
    const from = d.src || 'said';
    slots.when = { out: d.out, back: backFor(d), src: from, backSrc: d.back || d.oneWay || d.nights ? from : on('trip') ? 'trip' : 'guess' };
  } else if (picks.when) {
    slots.when = { ...picks.when, src: 'you', backSrc: 'you' };
  }
  if (slots.when) {
    const { out, back, backSrc } = slots.when;
    slots.when.label = !back
      ? `${fmtRange(out)} · one way`
      : out === back
        ? `${fmtRange(out)} · same day`
        : backSrc === 'trip' || backSrc === 'guess'
          ? `${fmtRange(out)} + ${daysBetween(out, back)} nights`
          : fmtRange(out, back);
  }

  if (p.time) slots.time = { ...p.time, src: p.time.src || 'said' };
  else if (picks.time) slots.time = { out: picks.time, back: picks.time, src: 'you' };
  // "cheapest" means any time of day, unless a time was ruled out ("no morning flights"): then ask
  else if (p.budget.cheapest && !(p.notTime || []).length) slots.time = { out: 'any', back: 'any', src: 'guess', note: 'You said cheapest' };
  if (slots.time) slots.time.label = timeLabel(slots.time);

  // Who: asked only when a people word couldn't be counted ("with my family").
  // A switched-off source is really off: its people become travelers to invite.
  const party = { ...p.party, members: [...p.party.members], extras: [...p.party.extras] };
  if (party.group && !on(GROUPS[party.group].src)) {
    const inGroup = party.members.filter((m) => GROUPS[party.group].members.includes(m));
    party.members = party.members.filter((m) => !inGroup.includes(m));
    party.group = null;
    // A head count you said stays, as invites. Without one, there is nothing left to count from: ask.
    if (party.explicit) party.guests += inGroup.length;
    else Object.assign(party, { unsure: true, count: party.count - inGroup.length, adults: party.adults - inGroup.length });
    if (party.src === 'trip') party.src = 'said';
  }
  for (const m of [...party.members]) {
    if (!on(PEOPLE[m].src)) {
      party.members = party.members.filter((x) => x !== m);
      party.extras.push({ type: 'adult', label: PEOPLE[m].first, key: m });
    }
  }
  if (picks.who) {
    const known = 1 + party.members.length + party.extras.length;
    Object.assign(party, { count: Math.max(picks.who, known), unsure: false, src: 'you' });
    party.guests = party.count - known;
    party.adults = party.count - party.children - party.infants;
  }

  // Pegasus: one infant on a lap per adult. More babies than adults is a question, never a drop.
  const extraBabies = party.infants - party.adults;
  if (extraBabies > 0 && picks.lap === 'seat') {
    let left = extraBabies;
    party.extras = party.extras.map((e) => (e.type === 'infant' && left-- > 0 ? { ...e, type: 'child', ownSeat: true } : e));
    Object.assign(party, { infants: party.infants - extraBabies, children: party.children + extraBabies });
  } else if (extraBabies > 0 && picks.lap === 'adult') {
    Object.assign(party, { guests: party.guests + extraBabies, adults: party.adults + extraBabies, count: party.count + extraBabies });
  }

  const missing = REQUIRED.filter((k) => !slots[k]);
  if (party.unsure) missing.push('who');
  if (party.infants > party.adults) missing.push('lap');
  return { p, party, slots, missing, complete: !missing.length, connections };
}

export function partyLabel({ count, adults, children, infants }) {
  if (count === 1) return 'Just you';
  return [
    adults && `${adults} adult${adults > 1 ? 's' : ''}`,
    children && `${children} child${children > 1 ? 'ren' : ''}`,
    infants && `${infants} bab${infants > 1 ? 'ies' : 'y'}`,
  ].filter(Boolean).join(', ');
}

// One-tap answers for a missing slot.
export function optionsFor(slot, r, today) {
  if (slot === 'where') {
    return (r.p.unknown ? ALTERNATIVES[r.p.unknown.vibe] : POPULAR).map((code) => ({ value: code, label: byCode(code).city }));
  }
  if (slot === 'lap') {
    return [
      { value: 'seat', label: 'Give a baby their own seat' },
      { value: 'adult', label: 'Another adult is coming' },
    ];
  }
  if (slot === 'who') {
    return [1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: n === 1 ? 'Just me' : `${n} of us` }));
  }
  if (slot === 'time') {
    const not = r.p.notTime || [];
    return ['morning', 'afternoon', 'evening', 'any'].filter((k) => !not.includes(k) && !(k === 'any' && not.length)).map((k) => ({ value: k, label: k === 'any' ? 'Cheapest' : TIME_LABEL[k] }));
  }
  let fri = weekendFriday(today);
  const mo = r.p.dates.monthOnly;
  if (mo) {
    let y = +today.slice(0, 4);
    if (makeISO(y, mo, 28) < today) y += 1;
    fri = nextWeekday(makeISO(y, mo, 1), 5, true);
    if (fri < today) fri = weekendFriday(today);
  }
  // a length you said ("for a week") survives the tap
  const len = r.p.dates.nights || 2;
  const weekends = [0, 1, 2].map((i) => {
    const out = addDays(fri, 7 * i);
    const back = addDays(out, len);
    return { value: { out, back }, label: fmtRange(out, back) };
  });
  return [...weekends, { value: 'pick', label: 'Pick dates' }];
}

// ---- what to buy -------------------------------------------------------

function needsFrom(p, connections = {}) {
  // No word about bags: use past trips if allowed, otherwise start from the lowest fare and say it's a guess.
  const history = connections.trip !== false;
  const bags = p.bags || { kind: history ? HISTORY.usualBags : 'none', count: 0 };
  return {
    bags: bags.kind,
    bagCount: bags.kind === 'checked' ? Math.max(1, bags.count) : 0,
    bagsSrc: p.bags ? 'said' : history ? 'trip' : 'guess',
    // only a word that asks for it buys flexibility; a funeral or "plans may change" gets a line offering it
    flex: p.budget.flex,
    flexSrc: 'said',
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
  if (t.bundleSrc === 'said') return { text: `${bundleById(t.bundle).name}, as you said`, src: 'said' };
  if (t.bundle === 'comfortflex' && n.flex) return { text: 'Comfort Flex: free change and refund, as you asked', src: n.flexSrc };
  if (t.bundle === 'comfortflex') return { text: 'Comfort Flex: extra legroom', src: 'said' };
  if (t.bundle === 'light' && n.bagsSrc === 'guess') return { text: 'Light to start; add bags anytime', src: 'guess' };
  if (t.bundle === 'light') return { text: 'No bags, so Light', src: n.bagsSrc };
  if (n.bags === 'none' && !t.intl) return { text: "Saver, since Light isn't sold on domestic flights", src: 'pegasus' };
  if (t.bundle === 'saver' && n.bags === 'checked') return { text: `Saver: ${BAGS.checkedKg[t.intl ? 'intl' : 'dom']} kg bag included`, src: n.bagsSrc };
  if (t.bundle === 'saver') return { text: n.bagsSrc === 'trip' ? 'Saver: you usually bring a cabin bag' : 'Saver: cabin bag included', src: n.bagsSrc };
  return { text: 'Saver Plus: seat and meal for less', src: 'rule' };
}

// ---- the trip ----------------------------------------------------------

function titleFor(p, party) {
  const byPurpose = {
    funeral: p.grandma ? "Grandma's funeral" : 'Funeral',
    wedding: 'Wedding', bachelor: 'Bachelor party', birthday: 'Birthday', work: 'Work trip', ski: 'Ski weekend', newyear: 'New Year',
  };
  if (byPurpose[p.purpose]) return byPurpose[p.purpose];
  if (party.group === 'boys') return "Boys' trip";
  if (party.count === 1) return 'Solo trip';
  if (party.count === 2 && party.members.length === 1) return `With ${PEOPLE[party.members[0]].first}`;
  if (party.extras.length) return 'Family trip';
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

function heardChips(r, needs) {
  const { p, slots } = r;
  const party = r.party || p.party;
  const bagLabel = { none: 'No bags', cabin: 'Cabin bag', checked: `${needs.bagCount} bag${needs.bagCount > 1 ? 's' : ''} each` }[needs.bags];
  const chips = [
    { k: 'where', icon: 'pin', label: slots.where.label, src: slots.where.src },
    { k: 'when', icon: 'calendar', label: slots.when.label, src: slots.when.src },
    { k: 'time', icon: 'clock', label: slots.time.label, src: slots.time.src },
    { k: 'who', icon: 'people', label: partyLabel(party), src: party.src },
    { k: 'bags', icon: needs.bags === 'none' ? 'backpack' : needs.bags === 'cabin' ? 'cabin' : 'suitcase', label: bagLabel, src: needs.bagsSrc },
  ];
  if (slots.when.back && ['trip', 'guess'].includes(slots.when.backSrc)) {
    const label = slots.when.backSrc === 'trip' ? 'your usual length' : 'a guess, change it anytime';
    chips.splice(2, 0, { k: 'back', icon: 'history', label: `Back ${fmtRange(slots.when.back)}, ${label}`, src: slots.when.backSrc });
  }
  if (p.budget.cheapest) chips.push({ k: 'cheap', icon: 'tag', label: 'Cheapest', src: 'said' });
  if (needs.flex) chips.push({ k: 'flex', icon: 'refresh', label: 'Flexible', src: needs.flexSrc });
  if (p.insurance !== null) chips.push({ k: 'ins', icon: 'shield', label: p.insurance ? 'Insurance' : 'No insurance', src: 'said', off: !p.insurance });
  if (p.seats) chips.push({ k: 'seat', icon: 'seat', label: { together: 'Sit together', legroom: 'Legroom', window: 'Window', aisle: 'Aisle' }[p.seats], src: 'said' });
  if (p.autopilot) chips.push({ k: 'auto', icon: 'spark', label: 'No steps', src: 'said' });
  if (p.link) chips.push({ k: 'link', icon: 'link', label: p.link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0], src: 'link' });
  return chips;
}

// Pegasus rules the companion applied without being asked, each said out loud on the trip page.
function ruleNotes(slots, flights, travelers) {
  const notes = [];
  const out = flightOf({ flights }, 'out');
  const back = flightOf({ flights }, 'back');
  if (back && slots.when.back === slots.when.out) {
    notes.push({ k: 'sameday', icon: 'clock', label: `Same day: back ${back.dep}, 3 h+ after landing ${out.arr}`, src: 'rule' });
  }
  for (const x of travelers) {
    if (x.turnsTwo && slots.when.back && slots.when.back >= x.turnsTwo) {
      notes.push({ k: 'two', icon: 'seat', label: `${x.first} turns 2 on ${fmtRange(x.turnsTwo)}: lap out, own seat back`, src: 'pegasus' });
    }
    if (x.ownSeat) notes.push({ k: 'lapseat', icon: 'seat', label: `${x.first}: own seat, one lap baby per adult`, src: 'pegasus' });
  }
  return notes;
}

let seq = 0;
export function buildTrip(r, { id, status = 'draft', title, emoji, origin = 'text' } = {}) {
  const { p, slots } = r;
  const dest = byCode(slots.where.code);
  const needs = needsFrom(p, r.connections);
  const flights = { out: { list: flightsFor(dest, slots.when.out, 'out'), slot: slots.time.out }, back: null };
  flights.out.pick = pickFlight(flights.out.list, flights.out.slot).no;
  if (slots.when.back) {
    flights.back = { list: flightsFor(dest, slots.when.back, 'back'), slot: slots.time.back };
    // Back the same day: the return must leave at least SAME_DAY_BUFFER after the outbound lands.
    const landed = slots.when.back === slots.when.out ? minutesOf(flightOf({ flights }, 'out').arr) + SAME_DAY_BUFFER : -1;
    const open = flights.back.list.filter((f) => minutesOf(f.dep) >= landed);
    flights.back.minDep = landed >= 0 ? landed : null;
    flights.back.pick = (pickFlight(open, flights.back.slot) || pickFlight(open, 'any') || pickFlight(flights.back.list, 'any')).no;
  }

  const party = r.party || p.party;
  const travelers = [{ ...ME, type: 'adult', confirmed: true }];
  for (const m of party.members) travelers.push({ id: m, ...PEOPLE[m], type: 'adult', confirmed: false });
  party.extras.forEach((x, i) => {
    travelers.push({ id: x.key || `x${i + 1}`, first: x.label, last: '', type: x.type, dob: x.dob || null, turnsTwo: x.turnsTwo || null, ownSeat: !!x.ownSeat, src: 'said', placeholder: true, confirmed: false });
  });
  for (let i = 0; i < party.guests; i++) {
    travelers.push({ id: `guest${i + 1}`, first: 'Guest', last: String(i + 2), type: 'adult', dob: null, src: 'link', guest: true, placeholder: true, confirmed: false });
  }

  const tripId = id || `t${Date.now().toString(36)}${(seq++).toString(36)}`;
  return {
    id: tripId,
    created: Date.now(),
    status,
    origin,
    text: p.text,
    emoji: emoji || emojiFor(p),
    title: title || titleFor(p, party),
    dest: dest.code,
    intl: dest.intl,
    out: slots.when.out,
    back: slots.when.back,
    whenSrc: slots.when.src,
    whenNote: slots.when.note || null,
    time: { out: slots.time.out, back: slots.time.back, src: slots.time.src },
    purpose: p.purpose,
    mayChange: !!p.budget.mayChange,
    group: party.group,
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
    heard: [...heardChips(r, needs), ...ruleNotes(slots, flights, travelers)],
    code: codeFor(tripId),
    pnr: null,
    sent: false,
  };
}

// Who still has details missing. Booking waits for every name, and for the
// birthday of every child and baby (their fare depends on age).
export const waitingOn = (t) => t.travelers.filter((x) => x.placeholder || (!x.dob && x.type !== 'adult'));

export const flightOf = (t, dir) => t.flights[dir] && t.flights[dir].list.find((f) => f.no === t.flights[dir].pick);
const legs = (t) => ['out', 'back'].map((d) => flightOf(t, d)).filter(Boolean);

// Bundle add-on per person for the whole trip.
export const bundlePrice = (t, id) => BUNDLE_ADD[t.intl ? 'intl' : 'dom'][id] * legs(t).length;

// A baby who turns 2 before a flight needs their own seat on that flight (Pegasus: under 24 months on each flight date).
export function typeOn(x, date) {
  return x.type === 'infant' && x.turnsTwo && date >= x.turnsTwo ? 'child' : x.type;
}

export function priceTrip(t) {
  const n = t.travelers.length;
  const market = t.intl ? 'intl' : 'dom';
  const b = bundleById(t.bundle);
  const L = legs(t);
  // passenger types can differ by flight: a baby who turns 2 mid-trip has a seat on the way back
  const seatedOn = (f) => t.travelers.filter((x) => typeOn(x, f.date) !== 'infant').length;
  const sum = (fn) => L.reduce((acc, f) => acc + fn(f, seatedOn(f)), 0);
  const seated = Math.max(...L.map(seatedOn));
  const lines = [];
  const add = (key, label, amount) => {
    if (amount) lines.push({ key, label, amount });
  };
  add('fare', `Flights ×${seated}`, sum((f, k) => f.fare * k));
  add('bundle', b.name, sum((f, k) => BUNDLE_ADD[market][b.id] * k));
  add('infant', 'Infant on lap (demo price)', sum((f, k) => EXTRAS.infant * (n - k)));
  const seatEach = ['together', 'window', 'aisle'].includes(t.seat) && !b.seat ? EXTRAS.seat : t.seat === 'legroom' && !b.legroom ? EXTRAS.legroom : 0;
  add('seat', 'Seats', sum((f, k) => seatEach * k));
  add('bag', 'Extra bags', sum((f, k) => Math.max(0, t.needs.bagCount - (b.checked ? 1 : 0)) * EXTRAS.bag[market] * k));
  add('meal', 'Meals', t.extras.meal && !b.meal ? sum((f, k) => EXTRAS.meal * k) : 0);
  add('insurance', 'Insurance', t.extras.insurance ? EXTRAS.insurance * n : 0);
  add('lounge', 'Lounge', t.extras.lounge ? EXTRAS.lounge * n : 0);
  add('car', 'Car', t.extras.car ? EXTRAS.car * Math.max(1, t.back ? daysBetween(t.out, t.back) : 1) : 0);
  const total = lines.reduce((acc, l) => acc + l.amount, 0);
  return { lines, total, each: Math.round(total / seated), n, seated };
}
