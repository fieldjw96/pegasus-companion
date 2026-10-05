// Talk to change it. The first sentence starts the trip; every sentence after
// that changes it, and each change comes back as a receipt you can undo.
// Taps (an answer, a flight time, a bundle, a traveler's details) are events
// too, so one list of events always rebuilds the same trip.

import { parse, normalize, typeForAge } from './parse.js';
import { resolve, buildTrip, priceTrip, flightOf, backFor, waitingOn, bundleWhy } from './agent.js';
import { byCode, bundleById, bundlesFor, BUNDLE_ADD, BAGS, EXTRAS, NOT_SERVED, HOME, ME, PEOPLE, PARTNER } from './data.js';
import { addDays, daysBetween, nextWeekday, weekday, fmtDay, fmtDuration } from './dates.js';

const NUMW = { a: 1, an: 1, one: 1, another: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const N = '(\\d{1,2}|an?|one|another|two|three|four|five|six|seven|eight|nine|ten)';
// a head count of friends: "two friends", never "a friend" (that one is a person, counted once)
const N2 = '(\\d{1,2}|two|three|four|five|six|seven|eight|nine|ten)';
const num = (s) => (/^\d+$/.test(s) ? +s : NUMW[s] ?? 1);
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY = `(${DAYS.join('|')})`;
const BACK = /\b(?:back|return(?:ing)?|home|until|till)\b/;
const OUT = /\b(?:leave|leaving|fly out|flying out|depart(?:ing|ure)?|outbound|head out)\b/;
const minutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const MONTH = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/;
// In a change, "Friday" means the Friday nearest the trip, not the one nearest today.
const nearestDay = (iso, wd) => {
  const delta = (wd - weekday(iso) + 7) % 7;
  return addDays(iso, delta > 3 ? delta - 7 : delta);
};

// Words that only glue a change together. Anything else it can't use stays orange.
const GLUE = new Set('actually instead rather prefer switch swap change now oh hmm wait sorry cool great perfect yeah nah well instead also please'.split(' '));
// Names that follow "to" in a change but are not places ("switch to Comfort Flex").
const NOT_PLACE = /^(?:light|saver|comfort|flex|plus|economy|business|window|aisle|seat|seats)\b/;
const isPlace = (name) => {
  const n = normalize(name);
  if (Object.values(NOT_SERVED).flat().includes(n)) return true;
  return !NOT_PLACE.test(n) && !Object.values(PEOPLE).some((x) => normalize(x.first) === n.split(' ')[0]);
};

// ---- people ------------------------------------------------------------------

const ONE_OF = { mom: 'Mom', mum: 'Mom', mother: 'Mom', dad: 'Dad', father: 'Dad', grandma: 'Grandma', grandmother: 'Grandma', grandpa: 'Grandpa', grandfather: 'Grandpa', sister: 'Sister', brother: 'Brother', colleague: 'Colleague', coworker: 'Colleague', boss: 'Boss', cousin: 'Cousin', nanny: 'Nanny', roommate: 'Roommate', son: 'Son', daughter: 'Daughter', friend: 'Friend' };
// Only one of each of these can come along.
const SINGLE = new Set(['Mom', 'Dad', 'Grandma', 'Grandpa', 'Partner', 'Boss']);
const slug = (s) => normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// A stable id per person, so details typed for "Mom" stay with Mom when someone else is added or dropped.
function keyFor(extras, label) {
  const base = slug(label) || 'guest';
  let k = base;
  for (let i = 2; extras.some((e) => e.key === k); i++) k = `${base}-${i}`;
  return k;
}
function keyed(p) {
  const extras = [];
  for (const e of p.party.extras) extras.push({ ...e, key: e.key || keyFor(extras, e.label) });
  p.party.extras = extras;
  return p;
}

function recount(party) {
  const infants = party.extras.filter((e) => e.type === 'infant').length;
  const children = party.extras.filter((e) => e.type === 'child').length;
  party.count = 1 + party.members.length + party.extras.length + party.guests;
  Object.assign(party, { adults: party.count - infants - children, children, infants });
}

function dropExtra(party, pred, last = false) {
  const idx = party.extras.map((e, i) => (pred(e) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return false;
  party.extras.splice(last ? idx[idx.length - 1] : idx[0], 1);
  return true;
}

// "without my mom", "drop Dana", "the baby isn't coming": take one person off. False if nobody matched.
function removeWho(party, word) {
  const w = word.replace(/'s$/, '');
  if (/^(?:wife|husband|partner|girlfriend|boyfriend)$/.test(w)) {
    if (PARTNER && party.members.includes(PARTNER)) {
      party.members = party.members.filter((m) => m !== PARTNER);
      return true;
    }
    return dropExtra(party, (e) => e.label === 'Partner');
  }
  if (/^(?:parents|folks)$/.test(w)) {
    const mom = dropExtra(party, (e) => e.label === 'Mom');
    const dad = dropExtra(party, (e) => e.label === 'Dad');
    return mom || dad;
  }
  if (/^(?:baby|infant|newborn)$/.test(w)) return dropExtra(party, (e) => e.type === 'infant', true);
  if (/^(?:kid|child)$/.test(w)) return dropExtra(party, (e) => e.type === 'child', true);
  if (/^(?:friend|guest|buddy|mate)$/.test(w) && party.guests > 0) {
    party.guests -= 1;
    return true;
  }
  if (ONE_OF[w]) return dropExtra(party, (e) => e.label === ONE_OF[w], true);
  const id = Object.keys(PEOPLE).find((k) => k === w || normalize(PEOPLE[k].first) === w);
  if (id && party.members.includes(id)) {
    party.members = party.members.filter((m) => m !== id);
    return true;
  }
  return dropExtra(party, (e) => normalize(e.label) === w);
}

const peopleSig = (party) => JSON.stringify([party.members, party.extras.map((e) => e.key + e.type), party.guests, party.unsure]);

// ---- one change --------------------------------------------------------------

// Applies one spoken change to the trip context `p0` (from parse()). Returns the
// new context, what it changed, and the words it could not use.
export function change(p0, text, today) {
  const t = normalize(text);
  // "add my mom", "bring Dana": read like "with my mom" so the parser counts them
  const added = text.replace(/\b(?:add|also bring|bring along|bring|include)\b/gi, 'with');
  const q = parse(added, today);
  const p = structuredClone(p0);
  const did = new Set();
  const used = [];
  const notes = [];
  const hit = (m) => {
    if (m) used.push(m[0]);
    return m;
  };
  const backOnly = BACK.test(t) && !OUT.test(t);
  const outOnly = OUT.test(t) && !BACK.test(t);
  let m;

  // where
  if (q.dest && q.dest.code !== p.dest?.code) {
    Object.assign(p, { dest: q.dest, destSrc: q.destSrc, unknown: null });
    did.add('where');
  } else if (!q.dest && q.unknown && isPlace(q.unknown.name)) {
    Object.assign(p, { dest: null, unknown: q.unknown });
    did.add('where');
  }

  // when
  const d0 = p.dates;
  const back0 = d0.out ? backFor(d0) : null;
  const len0 = d0.out && back0 ? daysBetween(d0.out, back0) : null;
  const d = { ...d0 };
  // "not Saturday, Sunday": a weekday ruled out is understood, and skipped
  const notDays = [...t.matchAll(new RegExp(`\\b(?:not|no|instead of|rather than) (?:on )?${DAY}\\b`, 'g'))];
  notDays.forEach(hit);
  const dayMs = [...t.matchAll(new RegExp(`\\b${DAY}\\b`, 'g'))].filter((x) => !notDays.some((n) => n.index + n[0].length === x.index + x[0].length));
  const hasDate = /\d/.test(t) || MONTH.test(t) || /\b(?:this|next) weekend\b|\btomorrow\b|\btoday\b|\btonight\b|\bnext week\b/.test(t);
  const backDay = t.match(new RegExp(`\\b(?:back|return(?:ing)?|home|until|till)(?: on)? ${DAY}\\b`));
  const more = t.match(new RegExp(`\\b${N} (?:more|extra) (nights?|days?)\\b|\\b(another|an extra) (night|day)\\b`));
  const fewer = t.match(new RegExp(`\\b${N} (?:fewer|less) (?:nights?|days?)\\b|\\b(?:one|a) (?:night|day) (?:less|fewer|shorter)\\b`));
  const shift = t.match(new RegExp(`\\b${N} (days?|weeks?) (earlier|sooner|later|before|after)\\b`));
  if (d.out && dayMs.length && !hasDate) {
    const backEnd = backDay ? backDay.index + backDay[0].length : -1;
    const outDay = dayMs.find((x) => x.index + x[0].length !== backEnd);
    if (outDay) d.out = nearestDay(d0.out, DAYS.indexOf(hit(outDay)[1]));
    if (backDay) d.back = nextWeekday(d.out, DAYS.indexOf(hit(backDay)[1]));
    else if (back0) d.back = addDays(d.out, len0);
    if (d.back) Object.assign(d, { oneWay: false, nights: null });
  } else if (q.dates.out && q.dates.back && !q.dates.sameDay && !backOnly) {
    Object.assign(d, { out: q.dates.out, back: q.dates.back, oneWay: false, nights: null, sameDay: false });
  } else if (q.dates.out && backOnly && d.out) {
    // "back on 16 Nov": the one date said is the return
    Object.assign(d, { back: q.dates.out < d.out ? d.out : q.dates.out, oneWay: false, nights: null });
  } else if (q.dates.out) {
    // a new departure keeps the trip length you had
    d.out = q.dates.out;
    if (q.dates.sameDay) d.back = d.out;
    else if (len0 != null) d.back = addDays(d.out, len0);
    else if (q.dates.nights) d.back = addDays(d.out, q.dates.nights);
    d.nights = null;
  } else if (d.out && (more || fewer)) {
    const k = more ? (more[1] ? num(more[1]) : 1) : fewer[1] ? num(fewer[1]) : 1;
    hit(more || fewer);
    d.back = addDays(back0 || d.out, more ? k : -k);
    Object.assign(d, { oneWay: false, nights: null });
  } else if (d.out && shift) {
    hit(shift);
    const k = num(shift[1]) * (shift[2].startsWith('week') ? 7 : 1) * (/earlier|sooner|before/.test(shift[3]) ? -1 : 1);
    if (!backOnly) d.out = addDays(d.out, k);
    if (!outOnly && back0) d.back = addDays(back0, k);
    else if (outOnly && back0) d.back = back0;
  } else if (d.out && q.dates.oneWay) {
    Object.assign(d, { back: null, oneWay: true, nights: null });
  } else if (d.out && (m = hit(t.match(/\bround[- ]?trip\b|\breturn (?:flight|ticket)\b/))) && d0.oneWay) {
    Object.assign(d, { oneWay: false, back: null, nights: null });
  } else if (d.out && (m = hit(t.match(/\b(?:same day|same-day|day trip|back (?:that|the same|same) (?:evening|night|day)|back that night)\b/)))) {
    Object.assign(d, { back: d.out, oneWay: false, nights: null });
  } else if (d.out && q.dates.nights) {
    Object.assign(d, { back: addDays(d.out, q.dates.nights), oneWay: false, nights: null });
  }
  if (d.out && d.out < today) {
    notes.push('That would be in the past, so the dates stay');
  } else if (d.out !== d0.out || d.back !== back0 || d.oneWay !== d0.oneWay) {
    if (d.back && d.back < d.out) d.back = d.out;
    p.dates = { ...d, monthOnly: null, src: 'said' };
    did.add('when');
  }

  // what time: a time ruled out ("no morning flights") is cleared, so it asks again without it
  const ruledOut = (q.notTime || []).filter((k) => p.time && (p.time.out === k || p.time.back === k));
  if (ruledOut.length && !q.time) {
    p.time = null;
    p.notTime = q.notTime;
    did.add('time');
  }
  if (q.time) {
    const cur = p.time || { out: q.time.out, back: q.time.out };
    const next =
      q.time.out !== q.time.back
        ? { out: q.time.out, back: q.time.back }
        : backOnly
          ? { out: cur.out, back: q.time.out }
          : outOnly
            ? { out: q.time.out, back: cur.back }
            : { out: q.time.out, back: q.time.out };
    if (!p.time || next.out !== p.time.out || next.back !== p.time.back || p.time.src === 'you') {
      p.time = { ...next, src: 'said' };
      did.add('time');
    }
  }

  // who
  const party = p.party;
  const before = peopleSig(party);
  const removed = new Set();
  if (hit(t.match(/\b(?:just me|solo|alone|by myself|on my own|just myself|only me)\b/))) {
    Object.assign(party, { members: [], extras: [], guests: 0, group: null, unsure: false });
  }
  const REMOVE = /\b(?:without|drop|remove|minus|take out|leave out|not bringing|no longer with|uninvite|no)\s+(?:my |our |the |a |an )?([a-z']+)/g;
  for (const x of t.matchAll(REMOVE)) if (removeWho(party, x[1])) { used.push(x[0]); removed.add(x[1].replace(/'s$/, '')); }
  for (const x of t.matchAll(/\b(?:my |our |the )?([a-z']+) (?:can'?t|cannot|isn'?t|is not|won'?t|will not|is no longer|doesn'?t) (?:come|coming|make it|join|joining|travel|travell?ing|fly|flying)\b/g)) {
    if (removeWho(party, x[1])) { used.push(x[0]); removed.add(x[1]); }
  }
  const partnerWords = /^(?:wife|husband|partner|girlfriend|boyfriend)$/;
  const wasRemoved = (label) => [...removed].some((w) => normalize(label) === w || (ONE_OF[w] && ONE_OF[w] === label) || (partnerWords.test(w) && label === 'Partner'));
  for (const e of q.party.extras) {
    if (wasRemoved(e.label)) continue;
    if (SINGLE.has(e.label) && party.extras.some((x) => x.label === e.label)) continue;
    party.extras.push({ ...e, key: keyFor(party.extras, e.label) });
  }
  for (const id of q.party.members) {
    const isPartner = id === PARTNER && [...removed].some((w) => partnerWords.test(w));
    if (!party.members.includes(id) && !removed.has(id) && !removed.has(normalize(PEOPLE[id].first)) && !isPartner) party.members.push(id);
  }
  const ta = normalize(added);
  const moreFriends = ta.match(new RegExp(`\\b(?:with|and|plus) (?:my )?${N2} (?:of my |other |more |good |close )?(?:friends?|buddies|guys|mates|pals|colleagues|coworkers)\\b`)) ||
    t.match(new RegExp(`\\b${N} more (?:people|persons?|friends?|adults|passengers|travell?ers)\\b`));
  const total = t.match(new RegExp(`\\b${N} of us\\b|\\b(?:we'?re|we are) ${N}\\b|\\b(?:for|party of) ${N} (?:people|adults|passengers|travell?ers)\\b`));
  if (moreFriends) {
    hit(moreFriends);
    party.guests += num(moreFriends[1]);
  } else if (total) {
    hit(total);
    const want = num(total[1] || total[2] || total[3]);
    const known = 1 + party.members.length + party.extras.length;
    if (want >= known) party.guests = want - known;
    else notes.push(`Say who isn't coming, so it can take ${known - want} off`);
  } else if (hit(t.match(/\bplus one\b/))) {
    party.guests += 1;
  }
  if (q.party.unsure) party.unsure = true;
  recount(party);
  if (peopleSig(party) !== before) {
    party.src = 'said';
    did.add('who');
  }

  // bags, fare, seats, extras
  if (q.bags && JSON.stringify(q.bags) !== JSON.stringify(p.bags)) {
    p.bags = q.bags;
    did.add('bags');
  }
  const noFlex = hit(t.match(/\b(?:no|not|don'?t need|without|skip)(?: the)? (?:flex|flexible|refund|refundable|comfort flex)\b/));
  if (noFlex && (p.budget.flex || p.budget.comfort)) {
    p.budget = { ...p.budget, flex: false, comfort: false };
    did.add('fare');
  } else if (!noFlex && q.budget.flex && !p.budget.flex) {
    p.budget = { ...p.budget, flex: true, cheapest: false };
    did.add('fare');
  }
  if (q.budget.cheapest && !p.budget.cheapest) {
    p.budget = { cheapest: true, flex: false, comfort: false };
    did.add('fare');
  }
  if (q.budget.comfort && !p.budget.comfort && !noFlex) {
    p.budget = { ...p.budget, comfort: true, cheapest: false };
    did.add('fare');
  }
  if (q.insurance !== null && q.insurance !== p.insurance) {
    p.insurance = q.insurance;
    did.add('insurance');
  }
  const noSeats = hit(t.match(/\b(?:no|skip|don'?t need|without)(?: the)? (?:seats?|seat selection)\b|\bseats? at check-?in\b/));
  if (noSeats && p.seats) {
    p.seats = null;
    did.add('seats');
  } else if (!noSeats && q.seats && q.seats !== p.seats) {
    p.seats = q.seats;
    did.add('seats');
  }
  if (q.meal !== null && q.meal !== p.meal) {
    p.meal = q.meal;
    did.add('meal');
  }
  if (q.purpose && q.purpose !== p.purpose) Object.assign(p, { purpose: q.purpose, grandma: q.grandma });
  if (q.link) p.link = q.link;

  // a bundle by name, and "an earlier flight"
  let bundle = null;
  const named = hit(t.match(/\b(?:switch to|go with|take|change to|upgrade to|downgrade to|use|pick|choose|book|want|prefer|make it)(?: the)? (saver plus|comfort flex|comfortflex|saver|light)(?: bundle| fare| package| one)?\b/));
  if (named) bundle = { 'saver plus': 'saverplus', 'comfort flex': 'comfortflex', comfortflex: 'comfortflex', saver: 'saver', light: 'light' }[named[1]];
  let flight = null;
  if ((m = hit(t.match(/\b(earlier|later|cheaper) (?:flight|one|departure|plane)s?\b/)))) flight = { dir: backOnly ? 'back' : 'out', to: m[1] };

  const consumed = new Set(used.join(' ').split(/\s+/).filter(Boolean));
  const unplaced = q.unplaced.filter((u) => !consumed.has(u.word) && !GLUE.has(u.word) && u.word !== 'with');
  return { p, did, bundle, flight, notes, unplaced };
}

// ---- the trip from the events ---------------------------------------------------

// Age on the day of travel decides the passenger type (Pegasus: under 2 infant, 2 to 12 child).
export function typeFromDob(dob, on) {
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = on.split('-').map(Number);
  const age = ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
  return { age, type: typeForAge(age, 'year') };
}

function applyOver(trip, over) {
  for (const dir of ['out', 'back']) {
    const o = over.flight[dir];
    const leg = trip.flights[dir];
    if (o && leg && leg.list.some((f) => f.no === o.no)) Object.assign(leg, { pick: o.no, byYou: o.src === 'you', bySaid: o.src === 'said' });
  }
  if (over.bundle && bundlesFor(trip.intl).some((b) => b.id === over.bundle.id)) Object.assign(trip, { bundle: over.bundle.id, bundleSrc: over.bundle.src });
  if (over.seat) Object.assign(trip, { seat: over.seat.v, seatSrc: over.seat.src });
  for (const [k, o] of Object.entries(over.extras)) {
    trip.extras[k] = o.on;
    trip.extrasSrc[k] = o.src;
  }
  for (const x of trip.travelers) {
    const o = over.people[x.id];
    if (!o) continue;
    if (o.first) Object.assign(x, { first: o.first, last: o.last, placeholder: false, guest: false });
    if (o.dob) {
      x.dob = o.dob;
      x.type = typeFromDob(o.dob, trip.out).type;
      // a baby who turns 2 before the flight home gets a seat on it
      const two = addDays(`${+o.dob.slice(0, 4) + 2}${o.dob.slice(4)}`, 0);
      x.turnsTwo = x.type === 'infant' && trip.back && two <= trip.back ? two : null;
    }
    if (o.src) x.src = o.src;
    if (o.confirmed) x.confirmed = true;
    if (o.asked) x.asked = true;
  }
  if (Object.values(over.people).some((o) => o.asked)) trip.sent = true;
}

function facts({ r, trip }) {
  const f = { where: null, out: null, back: null, outDep: null, backDep: null, people: [], bundle: null, seat: null, ins: null, meal: null, total: null, missing: [] };
  if (!r) return f;
  f.where = r.slots.where ? r.slots.where.label : r.p.unknown ? `${r.p.unknown.name}?` : null;
  f.missing = r.missing;
  if (r.slots.when) Object.assign(f, { out: r.slots.when.out, back: r.slots.when.back });
  if (trip) {
    f.people = trip.travelers.map((x) => ({ id: x.id, name: x.first }));
    Object.assign(f, {
      outDep: flightOf(trip, 'out').dep,
      backDep: trip.back ? flightOf(trip, 'back').dep : null,
      bundle: trip.bundle,
      seat: trip.seat,
      ins: trip.extras.insurance,
      meal: trip.extras.meal,
      total: priceTrip(trip).total,
    });
  } else {
    const party = r.party;
    f.people = [
      { id: 'me', name: ME.first },
      ...party.members.map((id) => ({ id, name: PEOPLE[id].first })),
      ...party.extras.map((e, i) => ({ id: e.key || `x${i + 1}`, name: e.label })),
      ...Array.from({ length: party.guests }, (_, i) => ({ id: `guest${i + 1}`, name: 'Guest' })),
    ];
  }
  return f;
}

const SEAT_TEXT = { free: 'Seats at check-in', together: 'Seats together', window: 'Window seat', aisle: 'Aisle seat', legroom: 'Extra legroom' };
const SLOT_TEXT = { where: 'where to', when: 'dates', time: 'a time of day', who: 'how many of you', lap: 'a seat for a baby' };

// What one change did, in a few words each. Nothing changed is said too.
export function receipt(a, b) {
  const items = [];
  if (a.where !== b.where && b.where) items.push(b.where.endsWith('?') ? `Pegasus doesn't fly to ${b.where.slice(0, -1)}` : `To ${b.where}`);
  if (a.out !== b.out && b.out) items.push(`Leave ${fmtDay(b.out)}`);
  if (a.back !== b.back && b.out) items.push(b.back == null ? 'One way' : b.back === b.out ? 'Back the same day' : `Back ${fmtDay(b.back)}`);
  if (a.out === b.out && a.outDep && b.outDep && a.outDep !== b.outDep) items.push(`Out at ${b.outDep}`);
  if (a.back === b.back && a.backDep && b.backDep && a.backDep !== b.backDep) items.push(`Home at ${b.backDep}`);
  const ids = (list) => list.map((x) => x.id);
  const people = (from, to, verb) => {
    const gone = from.filter((x) => !ids(to).includes(x.id));
    const guests = gone.filter((x) => x.id.startsWith('guest')).length;
    for (const x of gone) if (!x.id.startsWith('guest')) items.push(`${x.name} ${verb}`);
    if (guests) items.push(`${guests === 1 ? 'One more traveler' : `${guests} more travelers`} ${verb}`);
  };
  people(b.people, a.people, 'added');
  people(a.people, b.people, 'off the trip');
  if (a.bundle && b.bundle && a.bundle !== b.bundle) items.push(`${bundleById(b.bundle).name} instead of ${bundleById(a.bundle).name}`);
  if (a.seat && b.seat && a.seat !== b.seat) items.push(SEAT_TEXT[b.seat]);
  if (a.ins !== null && b.ins !== null && a.ins !== b.ins) items.push(b.ins ? 'Insurance added' : 'No insurance');
  if (a.meal !== null && b.meal !== null && a.meal !== b.meal) items.push(b.meal ? 'Meal added' : 'No meal');
  const asks = b.missing.filter((k) => !a.missing.includes(k));
  if (asks.length) items.push(`Needs ${asks.map((k) => SLOT_TEXT[k]).join(' and ')}`);
  if (a.total != null && b.total != null && a.total !== b.total) items.push(b.total > a.total ? `€${b.total - a.total} more` : `€${a.total - b.total} less`);
  else if (a.total == null && b.total != null) items.push(`Ready at €${b.total}`);
  return items;
}

// Replays every event, oldest first. `said` is each sentence with its orange
// words and, for changes, its receipt.
export function replay(events, today, connections = {}) {
  let p = null;
  const picks = {};
  const over = { flight: {}, bundle: null, seat: null, extras: {}, people: {} };
  const said = [];
  const tripId = events[0] ? `t-${events[0].id}` : 't';
  const build = () => {
    if (!p) return { r: null, trip: null };
    const r = resolve(p, { picks, connections });
    if (!r.complete) return { r, trip: null };
    const trip = buildTrip(r, { id: tripId });
    applyOver(trip, over);
    return { r, trip };
  };

  for (const e of events) {
    if (e.k === 'say') {
      if (!p) {
        p = keyed(parse(e.text, today));
        said.push({ id: e.id, text: e.text, first: true, unplaced: p.unplaced.map((u) => ({ ...u })), receipt: null });
        continue;
      }
      const a = facts(build());
      const prev = p;
      const c = change(p, e.text, today);
      p = c.p;
      // a flight you tapped stays unless this change moved that flight's day or time of day
      const day = (x, dir) => (!x.dates.out ? null : dir === 'out' ? x.dates.out : backFor(x.dates));
      const moved = (dir) => day(prev, dir) !== day(p, dir) || (prev.time && prev.time[dir]) !== (p.time && p.time[dir]);
      if (c.did.has('where')) over.flight = {};
      else for (const dir of ['out', 'back']) if (moved(dir)) delete over.flight[dir];
      if (c.did.has('bags') || c.did.has('fare')) over.bundle = null;
      if (c.did.has('seats')) over.seat = null;
      if (c.did.has('insurance')) delete over.extras.insurance;
      if (c.did.has('meal')) delete over.extras.meal;
      const notes = [...c.notes];
      if (c.bundle) {
        const { trip } = build();
        if (trip && !bundlesFor(trip.intl).some((b) => b.id === c.bundle)) notes.push(`${bundleById(c.bundle).name} isn't sold on domestic flights`);
        else over.bundle = { id: c.bundle, src: 'said' };
      }
      if (c.flight) {
        const { trip } = build();
        const leg = trip && trip.flights[c.flight.dir];
        if (leg) {
          const open = leg.list.filter((f) => leg.minDep == null || minutes(f.dep) >= leg.minDep);
          const i = open.findIndex((f) => f.no === leg.pick);
          const f = c.flight.to === 'cheaper' ? [...open].sort((x, y) => x.fare - y.fare)[0] : open[i + (c.flight.to === 'earlier' ? -1 : 1)];
          if (f && f.no !== leg.pick) over.flight[c.flight.dir] = { no: f.no, src: 'said' };
          else notes.push(c.flight.to === 'cheaper' ? 'That is already the cheapest flight that day' : `No ${c.flight.to} flight that day`);
        }
      }
      const after = build();
      const items = receipt(a, facts(after));
      // bags or fare changed but the bundle didn't: say why
      if ((c.did.has('bags') || c.did.has('fare')) && after.trip && a.bundle === after.trip.bundle) items.push(bundleWhy(after.trip).text);
      items.push(...notes);
      said.push({ id: e.id, text: e.text, unplaced: c.unplaced.map((u) => ({ ...u })), receipt: items.length ? items : ['Nothing changed'] });
    } else if (!p) {
      continue;
    } else if (e.k === 'pick') {
      if (e.slot === 'where') Object.assign(p, { dest: byCode(e.value), destSrc: 'you', unknown: null });
      else if (e.slot === 'when') p.dates = { ...p.dates, out: e.value.out, back: e.value.back || null, oneWay: !e.value.back, nights: null, monthOnly: null, sameDay: false, src: 'you' };
      else if (e.slot === 'time') p.time = { out: e.value, back: e.value, src: 'you' };
      else picks[e.slot] = e.value;
      if (['where', 'when', 'time'].includes(e.slot)) over.flight = {};
    } else if (e.k === 'flight') over.flight[e.dir] = { no: e.no, src: 'you' };
    else if (e.k === 'bundle') over.bundle = { id: e.bundle, src: 'you' };
    else if (e.k === 'seat') over.seat = { v: e.v, src: 'you' };
    else if (e.k === 'extra') over.extras[e.key] = { on: e.on, src: 'you' };
    else if (e.k === 'person') over.people[e.pid] = { ...over.people[e.pid], ...e.data };
    else if (e.k === 'clear') {
      const s = said.find((x) => x.id === e.say);
      const u = s && s.unplaced.find((x) => x.word === e.word && !x.cleared);
      if (u) u.cleared = true;
    }
  }
  const { r, trip } = build();
  const orange = said.flatMap((s) => s.unplaced.filter((u) => !u.cleared).map((u) => ({ ...u, say: s.id })));
  return { p, r, trip, said, orange };
}

// What stands between this trip and the Book button, first thing first.
export function gate(v) {
  if (!v.r) return { k: 'empty' };
  if (!v.trip) return { k: 'missing', slots: v.r.missing };
  if (v.orange.length) return { k: 'orange', n: v.orange.length };
  const waiting = waitingOn(v.trip);
  if (waiting.length) return { k: 'names', n: waiting.length };
  return { k: 'ready' };
}

// ---- what you might not know ----------------------------------------------------

// Things worth a line that you didn't say. Each one can move the price up or
// down, and each is one tap. Nothing paid is ever added without that tap.
export function headsUp(trip) {
  const tips = [];
  const b = bundleById(trip.bundle);
  const market = trip.intl ? 'intl' : 'dom';
  for (const dir of ['out', 'back']) {
    const leg = trip.flights[dir];
    if (!leg) continue;
    const f = flightOf(trip, dir);
    const open = leg.list.filter((x) => leg.minDep == null || minutes(x.dep) >= leg.minDep);
    const late = f.nextDay || minutes(f.arr) < 6 * 60;
    if (late) {
      const better = open.filter((x) => !x.nextDay && minutes(x.arr) >= 6 * 60).sort((x, y) => x.fare - y.fare)[0];
      if (better) {
        const diff = better.fare - f.fare;
        tips.push({ row: dir, k: 'late', text: `Lands ${f.arr}${f.nextDay ? ' the next morning' : ''}. The ${better.dep} lands ${better.arr} for ${diff > 0 ? `€${diff} more` : diff < 0 ? `€${-diff} less` : 'the same price'} each.`, act: { k: 'flight', dir, no: better.no }, label: `Take the ${better.dep}` });
        continue;
      }
    }
    // a cheaper flight is worth a line only if it saves €5 or more and doesn't land in the small hours
    // a time of day you said is kept: the cheaper line only looks inside it
    const said = trip.time.src !== 'guess' && trip.time[dir] !== 'any' ? trip.time[dir] : null;
    const low = open.filter((x) => !x.nextDay && minutes(x.arr) >= 6 * 60 && (!said || x.slot === said)).sort((x, y) => x.fare - y.fare)[0];
    if (!leg.byYou && !leg.bySaid && low && f.fare - low.fare >= 5) {
      tips.push({ row: dir, k: 'cheaper', text: `The ${low.dep} is €${f.fare - low.fare} less each.`, act: { k: 'flight', dir, no: low.no }, label: `Take the ${low.dep}` });
    }
  }
  const seated = trip.travelers.filter((x) => x.type !== 'infant').length;
  // children are seated with an adult at check-in, so only two or more adults can end up apart
  const grownUps = trip.travelers.filter((x) => x.type === 'adult').length;
  if (seated > 1 && grownUps > 1 && trip.seat === 'free' && !b.seat) {
    tips.push({ row: 'seats', k: 'apart', text: `Seats are given at check-in, so ${seated === 2 ? 'the two of you' : `the ${seated} of you`} may sit apart. Together is €${EXTRAS.seat} each per flight.`, act: { k: 'seat', v: 'together' }, label: 'Sit together' });
  }
  // a funeral, or "plans may change": offer the flexible fare with its terms and price, never pick it
  if ((trip.purpose === 'funeral' || trip.mayChange) && !b.change) {
    const legs = trip.back ? 2 : 1;
    const more = (BUNDLE_ADD[market].comfortflex - BUNDLE_ADD[market][trip.bundle]) * legs;
    tips.push({ row: 'bundle', k: 'flex', text: `If plans shift: Comfort Flex adds one free change up to 2 h before departure and a full refund (service fee excluded), for €${more} more each.`, act: { k: 'bundle', bundle: 'comfortflex' }, label: 'Switch to Comfort Flex' });
  }
  const nights = trip.back ? daysBetween(trip.out, trip.back) : 0;
  if (trip.bundle === 'light' && nights >= 3) {
    const more = BUNDLE_ADD[market].saver - BUNDLE_ADD[market].light;
    tips.push({ row: 'bundle', k: 'light', text: `Light is one ${BAGS.under.split(' · ')[1]} bag under the seat for ${nights} nights. Saver adds an 8 kg cabin bag and a ${BAGS.checkedKg[market]} kg checked bag for €${more} more each per flight.`, act: { k: 'bundle', bundle: 'saver' }, label: 'Switch to Saver' });
  }
  // quiet: two at most, the ones that matter most first
  const rank = { late: 0, flex: 1, apart: 2, light: 3, cheaper: 4 };
  return tips.sort((x, y) => rank[x.k] - rank[y.k]).slice(0, 2);
}

// ---- your words, and what it added to them ----------------------------------------

const WHEN_WORD = /^(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|sunday|monday|tuesday|wednesday|thursday|friday|saturday|tomorrow|today|tonight|weekend)$/;
const TIME_WORD = /^(?:morning|afternoon|evening|night|tonight|sabah|aksam|gece)$/;

// What the companion understood or added, to show in blue right after the words it
// belongs to ("6 month old · on a lap, one per adult"). Each one is said once.
export function additions(text, v) {
  const t = v && v.trip;
  if (!t) return [];
  const toks = [...text.matchAll(/[\p{L}\d][\p{L}\d'’\-]*/gu)].map((m) => normalize(m[0]));
  const out = [];
  const add = (k, find, words) => {
    const at = toks.findIndex(find);
    if (at >= 0 && words) out.push({ k, at, text: words });
  };
  const dest = byCode(t.dest);
  const names = [dest.city, ...(dest.aka || [])].map(normalize);
  const o = flightOf(t, 'out');
  const nights = t.back ? daysBetween(t.out, t.back) : null;
  add('where', (w) => names.some((n) => w === n || w.startsWith(`${n}'`)), `from ${HOME.code}, ${fmtDuration(o.mins)}`);
  add('when', (w) => WHEN_WORD.test(w), nights == null ? 'one way' : nights === 0 ? 'back the same day' : `${nights} night${nights > 1 ? 's' : ''}`);
  if (t.time.out === 'any') add('time', (w) => w === 'cheapest' || w === 'cheap', `${o.dep}, the cheapest that day`);
  else add('time', (w) => TIME_WORD.test(w), `${o.dep}, lands ${o.arr}`);
  const partner = PARTNER && t.travelers.find((x) => x.id === PARTNER);
  if (partner) add('partner', (w) => /^(?:wife|husband|partner|girlfriend|boyfriend)$/.test(w), `${partner.first}, from your past trips`);
  if (t.travelers.some((x) => x.type === 'infant')) add('lap', (w, i) => /^(?:baby|babies|infant|newborn|twins)$/.test(w) || (w === 'old' && /^months?$/.test(toks[i - 1] || '')), 'on a lap, one per adult');
  if (t.group) add('group', (w) => /^(?:boys|guys|friends|crew|squad|lads)$/.test(w), `${t.travelers.filter((x) => GROUP_IDS(x)).map((x) => x.first).join(', ')}, from your past trips`);
  const b = bundleById(t.bundle);
  const kg = BAGS.checkedKg[t.intl ? 'intl' : 'dom'];
  add('bags', (w) => /^(?:bag|bags|luggage|suitcase|suitcases|carry-on|carryon|backpack)$/.test(w), `${b.name}, ${b.checked ? `${kg} kg checked` : b.cabin ? '8 kg cabin bag' : '3 kg under the seat'}`);
  return out;
}
const GROUP_IDS = (x) => !!PEOPLE[x.id] && x.id !== PARTNER;
