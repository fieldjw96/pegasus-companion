// Turns one spoken or typed sentence into trip context.
// Deterministic on purpose: the prototype has to behave the same on stage
// every time. Production would put an LLM with a structured-output schema
// behind the same interface (see README).

import { NETWORK, NOT_SERVED, PEOPLE, GROUPS } from './data.js';
import { makeISO, addDays, weekday, nextWeekday, isRealDate } from './dates.js';

const NUMWORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, 'a couple': 2, 'a couple of': 2, 'a few': 3 };
const NUM = '(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a couple(?: of)?|a few)';
const toNum = (s) => (/^\d+$/.test(s) ? +s : NUMWORDS[s]);

const MONTH = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const monthNum = (s) => MONTH_KEYS.indexOf(s.slice(0, 3)) + 1;
const DAY_FULL = '(sunday|monday|tuesday|wednesday|thursday|friday|saturday)';
const DAY_ANY = '(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?)';
const dayNum = (s) => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(s.slice(0, 3));
const RANGE = '(?: ?(?:-|to|until|till|thru|through) ?)';
const YEAR = '(?: (20\\d\\d))?';

export function normalize(text) {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/(\d+)(?:st|nd|rd|th)\b/g, '$1')
    .replace(/[^a-z0-9'\-:/.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---- where -------------------------------------------------------------

function findDestination(t, raw) {
  const hits = [];
  for (const d of NETWORK) {
    for (const name of [d.city, ...(d.aka || [])]) {
      for (const m of t.matchAll(new RegExp(`\\b${esc(normalize(name))}\\b`, 'g'))) hits.push({ d, at: m.index });
    }
    if (new RegExp(`\\b${d.code}\\b`).test(raw)) hits.push({ d, at: Infinity });
  }
  const dests = hits.filter((h) => h.at === Infinity || !/\bfrom (?:the )?$/.test(t.slice(Math.max(0, h.at - 9), h.at)));
  dests.sort((a, b) => a.at - b.at);
  return dests[0]?.d || null;
}

const STOP = new Set(['i', 'the', 'my', 'our', 'a', 'an', 'me', 'grandma', 'mom', 'dad', 'work', 'see', 'go', 'get', 'dana',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']);

function findUnknown(t, raw) {
  for (const [vibe, places] of Object.entries(NOT_SERVED)) {
    for (const place of places) {
      if (new RegExp(`\\b${place}\\b`).test(t)) return { name: place.replace(/\b\w/g, (c) => c.toUpperCase()), vibe };
    }
  }
  for (const m of raw.matchAll(/\b(?:to|in|visit|visiting)\s+([A-Z][\p{L}]+(?:\s[A-Z][\p{L}]+)?)/gu)) {
    if (!STOP.has(m[1].split(' ')[0].toLowerCase())) return { name: m[1], vibe: 'city' };
  }
  return null;
}

// ---- when --------------------------------------------------------------

// On a weekend, "this weekend" and "next weekend" both mean the coming one.
export function weekendFriday(today, which = 'this') {
  const wd = weekday(today);
  if (wd === 6 || wd === 0) return nextWeekday(today, 5);
  const fri = nextWeekday(today, 5, true);
  return which === 'next' ? addDays(fri, 7) : fri;
}

function parseDates(t, today) {
  const s = t
    .replace(/\bthe /g, '')
    .replace(/\b(\d{1,2}) of /g, '$1 ')
    .replace(/\bbetween (\S+(?: \S+)?) and /, '$1 to ');
  const thisYear = +today.slice(0, 4);
  const res = { out: null, back: null, oneWay: /\bone[- ]?way\b/.test(t), monthOnly: null, nights: null };

  const mk = (m, d, y) => (isRealDate(y, m, d) ? makeISO(y, m, d) : null);
  const firstFuture = (m, d, y) => (y ? mk(m, d, +y) : mk(m, d, thisYear) >= today ? mk(m, d, thisYear) : mk(m, d, thisYear + 1));
  const onOrAfter = (from, m, d, y) => {
    if (!from) return null;
    if (y) return mk(m, d, +y);
    const same = mk(m, d, +from.slice(0, 4));
    return same && same >= from ? same : mk(m, d, +from.slice(0, 4) + 1);
  };

  let m;
  if ((m = s.match(new RegExp(`\\b(\\d{1,2})${RANGE}(\\d{1,2}) ${MONTH}${YEAR}\\b`)))) {
    // 13 to 16 nov
    const mo = monthNum(m[3]);
    res.out = firstFuture(mo, +m[1], m[4]);
    res.back = onOrAfter(res.out, mo, +m[2], m[4]);
  } else if ((m = s.match(new RegExp(`\\b${MONTH} (\\d{1,2})${RANGE}(?:${MONTH} )?(\\d{1,2})\\b`)))) {
    // nov 13 to 16, nov 28 to dec 2
    const mo = monthNum(m[1]);
    res.out = firstFuture(mo, +m[2]);
    res.back = onOrAfter(res.out, m[3] ? monthNum(m[3]) : mo, +m[4]);
  } else if ((m = s.match(new RegExp(`\\b(\\d{1,2}) ${MONTH}${YEAR}${RANGE}(\\d{1,2}) ${MONTH}${YEAR}\\b`)))) {
    // 28 nov to 2 dec, 30 dec 2025 to 2 jan 2026
    res.out = firstFuture(monthNum(m[2]), +m[1], m[3]);
    res.back = onOrAfter(res.out, monthNum(m[5]), +m[4], m[6]);
  } else {
    // single dates in order of appearance: first is out, second is back
    const found = [];
    for (const x of s.matchAll(new RegExp(`\\b(\\d{1,2}) ${MONTH}${YEAR}\\b`, 'g'))) found.push({ at: x.index, end: x.index + x[0].length, mo: monthNum(x[2]), d: +x[1], y: x[3] });
    for (const x of s.matchAll(new RegExp(`\\b${MONTH} (\\d{1,2})\\b(?![:.]\\d)`, 'g'))) found.push({ at: x.index, end: x.index + x[0].length, mo: monthNum(x[1]), d: +x[2] });
    for (const x of s.matchAll(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](20\d\d))?\b/g)) found.push({ at: x.index, end: x.index + x[0].length, mo: +x[2], d: +x[1], y: x[3] });
    found.sort((a, b) => a.at - b.at || b.end - a.end);
    const picked = [];
    for (const f of found) if (!picked.some((p) => f.at < p.end && p.at < f.end) && f.mo >= 1 && f.mo <= 12) picked.push(f);
    if (picked[0]) res.out = firstFuture(picked[0].mo, picked[0].d, picked[0].y);
    if (picked[1]) res.back = onOrAfter(res.out, picked[1].mo, picked[1].d, picked[1].y);
  }

  if (!res.out) {
    if ((m = s.match(new RegExp(`\\b(?:(this|next) )?${DAY_ANY}${RANGE}${DAY_ANY}\\b`)))) {
      res.out = nextWeekday(today, dayNum(m[2]));
      if (m[1] === 'next' && res.out < addDays(today, 3)) res.out = addDays(res.out, 7);
      res.back = nextWeekday(res.out, dayNum(m[3]));
    } else if ((m = s.match(/\b(this|next) weekend\b/))) {
      res.out = weekendFriday(today, m[1]);
      res.back = addDays(res.out, 2);
    } else if ((m = s.match(new RegExp(`\\b${DAY_FULL}\\b`)))) {
      res.out = nextWeekday(today, dayNum(m[1]));
    } else if (/\btomorrow\b/.test(s)) {
      res.out = addDays(today, 1);
    } else if (/\b(?:today|tonight)\b/.test(s)) {
      res.out = today;
    } else if ((m = s.match(new RegExp(`\\bin ${NUM} (days?|weeks?)\\b`)))) {
      res.out = addDays(today, toNum(m[1]) * (m[2].startsWith('week') ? 7 : 1));
    } else if (/\bnext week\b/.test(s)) {
      res.out = nextWeekday(today, 1);
    }
  }

  if (res.out && !res.back) {
    const b = s.match(new RegExp(`\\b(?:back|return(?:ing)?|home)(?: on)? ${DAY_FULL}\\b`));
    if (b) res.back = nextWeekday(res.out, dayNum(b[1]));
  }

  if ((m = s.match(new RegExp(`(?<!\\bin )\\b${NUM} (nights?|days?|weeks?)\\b`)))) {
    const n = toNum(m[1]);
    res.nights = m[2].startsWith('week') ? n * 7 : m[2].startsWith('day') ? Math.max(1, n - 1) : n;
  } else if (/\b(?:for )?a week\b/.test(s)) {
    res.nights = 7;
  } else if (/\bweekend\b/.test(s)) {
    res.nights = 2;
  }
  if (res.out && !res.back && /\b(?:same day|same-day|day trip|back (?:that|same|the same) (?:evening|night|day))\b|\bback that night\b/.test(s)) {
    res.back = res.out;
    res.sameDay = true;
  }
  if (res.out && !res.back && !res.oneWay && res.nights) res.back = addDays(res.out, res.nights);

  if (!res.out && (m = s.match(new RegExp(`\\b(?:in|during|early|late|mid|end of|this|next) ${MONTH}\\b`)))) res.monthOnly = monthNum(m[1]);
  return res;
}

// ---- what time ---------------------------------------------------------

const TIME_WORDS = [
  ['any', /\b(?:any ?time|whenever|any hour|don'?t care (?:when|what time))\b/g],
  ['night', /\b(?:red[- ]?eye|overnight|late[- ]night|night flights?|at night|gece)\b/g],
  ['evening', /\b(?:evening|after work|tonight|that night|aksam)\b/g],
  ['afternoon', /\b(?:afternoon|midday|lunch ?time|noon|ogleden sonra)\b/g],
  ['morning', /\b(?:morning|early flights?|first thing|early bird|sabah)\b/g],
];
const bucket = (h) => (h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night');

function parseTime(t) {
  const found = [];
  for (const [k, re] of TIME_WORDS) for (const m of t.matchAll(re)) found.push({ k, at: m.index });
  for (const m of t.matchAll(/\b(?:at|around|after|before|by) (\d{1,2})(?::(\d{2}))? ?(am|pm)?\b/g)) {
    if (!m[2] && !m[3]) continue; // "by 6" is too vague
    let h = +m[1];
    if (m[3] === 'pm' && h < 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    if (h < 24) found.push({ k: bucket(h), at: m.index });
  }
  found.sort((a, b) => a.at - b.at);
  if (!found.length) return null;
  return { out: found[0].k, back: (found[1] || found[0]).k };
}

// ---- who ---------------------------------------------------------------

const FRIENDS = '(friends?|buddies|guys|boys|mates|pals|colleagues|coworkers|co-workers|people|others|girls)';

// Family and companion words become typed travelers whose names still have to
// come in, from you or from them through the group link. Nothing is dropped silently.
const REL = {
  'mom and dad': [['adult', 'Mom'], ['adult', 'Dad']],
  'mum and dad': [['adult', 'Mom'], ['adult', 'Dad']],
  'mother and father': [['adult', 'Mom'], ['adult', 'Dad']],
  parents: [['adult', 'Mom'], ['adult', 'Dad']],
  mom: [['adult', 'Mom']],
  mum: [['adult', 'Mom']],
  mother: [['adult', 'Mom']],
  dad: [['adult', 'Dad']],
  father: [['adult', 'Dad']],
  grandma: [['adult', 'Grandma']],
  grandmother: [['adult', 'Grandma']],
  grandpa: [['adult', 'Grandpa']],
  grandfather: [['adult', 'Grandpa']],
  sister: [['adult', 'Sister']],
  brother: [['adult', 'Brother']],
  colleague: [['adult', 'Colleague']],
  coworker: [['adult', 'Colleague']],
  'co-worker': [['adult', 'Colleague']],
  boss: [['adult', 'Boss']],
  friend: [['adult', 'Friend']],
  cousin: [['adult', 'Cousin']],
  nanny: [['adult', 'Nanny']],
  roommate: [['adult', 'Roommate']],
  son: [['child', 'Son']],
  daughter: [['child', 'Daughter']],
  twins: [['child', 'Twin 1'], ['child', 'Twin 2']],
  'newborn twins': [['infant', 'Twin 1'], ['infant', 'Twin 2']],
  'baby twins': [['infant', 'Twin 1'], ['infant', 'Twin 2']],
  baby: [['infant', 'Baby']],
  infant: [['infant', 'Baby']],
  newborn: [['infant', 'Baby']],
};
// A few Turkish relation words with "-le/-la" ("with"). Anything else in Turkish
// stays an orange word to confirm, never a guess.
const REL_TR = [
  [/\banne(?:m|miz)?(?:le|la|yle|yla|\s+ile)\b/g, [['adult', 'Mom']]],
  [/\bbaba(?:m|miz)?(?:le|la|yle|yla|\s+ile)\b/g, [['adult', 'Dad']]],
  [/\besim(?:le|la)?\b/g, [['adult', 'Partner']]],
  [/\bbebeg(?:im|imiz)(?:le|la|\s+ile)?\b|\bbebek(?:le|la|\s+ile)\b/g, [['infant', 'Baby']]],
];
const REL_WORDS = Object.keys(REL).sort((a, b) => b.length - a.length).map(esc).join('|');
const AGE = '(?:(\\d{1,2})[- ]?(month|year)s?[- ]old\\s+)?';
const OWN = '(?:my|our|his|her|their|the|a|an)';
// Pegasus: an infant is under 2, a child is 2 to 12, 13 and over is an adult (flypgs.com, travel with children).
export const typeForAge = (n, unit) => (unit === 'month' || +n < 2 ? 'infant' : +n < 13 ? 'child' : 'adult');
const ageType = (n, unit, fallback) => (n == null ? fallback : typeForAge(n, unit));

function parseParty(t, today, used) {
  let count = null;
  let m;
  const mark = (x) => x && used.push([x.index, x.index + x[0].length]);
  if ((m = t.match(new RegExp(`\\b(?:with|and|plus) (?:my )?${NUM} (?:of my |other |good |close )?${FRIENDS}\\b`)))) count = toNum(m[1]) + 1;
  else if ((m = t.match(new RegExp(`\\b${NUM} of us\\b`)))) count = toNum(m[1]);
  else if ((m = t.match(new RegExp(`\\b${NUM} (?:people|adults|passengers|travell?ers|pax|tickets|seats)\\b`)))) count = toNum(m[1]);
  else if ((m = t.match(new RegExp(`\\b(?:for|party of) ${NUM}\\b(?! (?:nights?|days?|weeks?|hours?|bags?|am|pm))`)))) count = toNum(m[1]);
  mark(m);
  const explicit = count !== null;
  const soloM = t.match(/\b(?:solo|alone|just me|by myself|on my own|just myself)\b/);
  mark(soloM);
  const solo = !!soloM;

  const friendlyM = t.match(/\b(?:the boys|the guys|the lads|my boys|boys'? trip|my friends|the crew|the squad|with friends)\b/);
  mark(friendlyM);
  const friendly = !!friendlyM || (explicit && m && /friend|buddies|guys|boys|mates|pals/.test(m[0]));
  const members = [];
  let group = null;
  if (friendly && (count === null || count - 1 === GROUPS.boys.members.length)) {
    group = 'boys';
    members.push(...GROUPS.boys.members);
  }
  const add = (id) => !members.includes(id) && members.push(id);
  for (const x of t.matchAll(/\b(?:wife|husband|girlfriend|boyfriend|partner|dana)\b/g)) { add('dana'); mark(x); }
  for (const id of Object.keys(PEOPLE)) for (const x of t.matchAll(new RegExp(`\\b${id}\\b`, 'g'))) { add(id); mark(x); }

  // extras keep where they were said, so a later "he's 13" lands on the right person
  const extras = [];
  const push = (list, at, n, unit) => list.forEach(([type, label]) => extras.push({ type: ageType(n, unit, type), label, at, age: n == null ? null : { n: +n, unit } }));
  const rel = new RegExp(`\\b(?:with|and|plus|bringing|taking|me and)\\s+(?:${OWN}\\s+)?${AGE}(${REL_WORDS})\\b`, 'g');
  for (const x of t.matchAll(rel)) { push(REL[x[3]], x.index, x[1], x[2]); mark(x); }
  for (const x of t.matchAll(new RegExp(`(?:^|[\\s.,])(${REL_WORDS}) and (?:i|me)\\b`, 'g'))) { push(REL[x[1]], x.index); mark(x); }
  for (const x of t.matchAll(new RegExp(`\\b(?:with|and)\\s+(?:${OWN}\\s+)?(\\d{1,2})[- ]?(month|year)s?[- ]old\\b(?!\\s+(?:\\w+\\s+)?(?:baby|son|daughter|infant|newborn|twins))`, 'g'))) {
    const type = ageType(x[1], x[2], 'child');
    extras.push({ type, label: type === 'infant' ? 'Baby' : type === 'child' ? 'Child' : 'Teen', at: x.index, age: { n: +x[1], unit: x[2] } });
    mark(x);
  }
  for (const [re, list] of REL_TR) for (const x of t.matchAll(re)) { push(list, x.index); mark(x); }
  if ((m = t.match(new RegExp(`\\b${NUM} (?:kids|children)\\b`)))) { for (let i = 0; i < toNum(m[1]); i++) extras.push({ type: 'child', label: `Child ${i + 1}`, at: m.index }); mark(m); }
  if ((m = t.match(new RegExp(`\\b${NUM} (?:babies|infants)\\b`)))) { for (let i = 0; i < toNum(m[1]); i++) extras.push({ type: 'infant', label: `Baby ${i + 1}`, at: m.index }); mark(m); }
  extras.sort((a, b) => a.at - b.at);

  // "he's 13", "she is 2", "they are 18 months": the age belongs to the person said just before
  for (const x of t.matchAll(/\b(he|she|they)(?:'s| is|'re| are) (\d{1,2})(?: (month|year)s?)?(?: old)?\b/g)) {
    const before = extras.filter((e) => e.at < x.index);
    if (!before.length) continue;
    const last = before[before.length - 1];
    const who = x[1] === 'they' ? before.filter((e) => e.at === last.at) : [last];
    for (const e of who) Object.assign(e, { type: typeForAge(x[2], x[3] || 'year'), age: { n: +x[2], unit: x[3] || 'year' } });
    mark(x);
  }
  // "she turns two on 20 December": a birthday that can change the type between flights
  for (const x of t.matchAll(new RegExp(`\\b(?:he|she|they) turns? (two|2) (?:on )?(?:(\\d{1,2}) ${MONTH}|${MONTH} (\\d{1,2}))`, 'g'))) {
    const before = extras.filter((e) => e.at < x.index);
    const day = +(x[2] || x[5]), mo = monthNum(x[3] || x[4]);
    let y = +today.slice(0, 4);
    if (makeISO(y, mo, day) < today) y += 1;
    if (before.length) Object.assign(before[before.length - 1], { type: 'infant', turnsTwo: makeISO(y, mo, day), dob: makeISO(y - 2, mo, day) });
    mark(x);
  }

  // A people word it can't count is a question, not a guess.
  const unsureM = t.match(/\b(?:with|and|plus)\s+(?:my\s+|our\s+|the\s+)?(?:family|cousins|kids|children|team|in-laws|folks|relatives|colleagues|coworkers)\b/);
  const unsure = !explicit && !!unsureM && !extras.some((e) => e.type === 'child');
  if (unsure) mark(unsureM);

  const known = 1 + members.length + extras.length;
  count = solo && known === 1 ? 1 : Math.max(count ?? known, known);
  const guests = count - known;
  const infants = extras.filter((e) => e.type === 'infant').length;
  const children = extras.filter((e) => e.type === 'child').length;
  return {
    count,
    adults: count - infants - children,
    children,
    infants,
    members,
    extras: extras.map(({ at, ...e }) => e),
    group,
    guests,
    explicit,
    unsure,
    src: explicit || solo || extras.length ? 'said' : group ? 'whatsapp' : members.length ? 'contacts' : 'guess',
  };
}

// ---- words it did not use ------------------------------------------------
// Every word is either filler, part of something the parser placed, or shown
// back as an orange word. That is how nothing is dropped silently.
const FILLER = new Set(`i i'm im i'd i'll ive i've we we're were us me my our you your a an the to for with and or of in on at from by is are be am was it it's its this that these those there here just want wanna need needs going go get got please book booking trip trips flight flights fly flying travel travelling traveling home back some any all so then also too really like let's lets can could would will do does don't dont not no yes make making through as possible simple way option options steps step get go take taking bring bringing ok okay hey hi thanks thank um uh also one way round return leave leaving come coming next this that time times day days night nights week weeks weekend weekends tomorrow today tonight same morning afternoon evening late early cheap cheapest budget lowest price flexible flex refundable change plans might may could shift comfort legroom treat premium extra space bag bags luggage suitcase suitcases baggage carry-on carryon cabin hand backpack checked each personal item small large big only insurance insured without skip sit seats seat seated sitting together side window aisle exit row meal meals food hungry sandwich tickets ticket solo alone myself own wedding birthday bday funeral passed away memorial bachelor bachelorette work client meeting meetings conference offsite business ski skiing interview new year's her his him them their its yours mine ours who whose january february march april may june july august september october november december jan feb mar apr jun jul aug sep sept oct nov dec monday tuesday wednesday thursday friday saturday sunday mon tue tues wed thu thurs fri sat sun am pm sabah aksam gece ogleden sonra ucus ucusu ucusla ve ile icin bir`.split(/\s+/));
const NUMBER_SPANS = [
  new RegExp(`\\b\\d{1,2}${RANGE}\\d{1,2} ${MONTH}`, 'g'), new RegExp(`\\b${MONTH} \\d{1,2}(?:${RANGE}(?:${MONTH} )?\\d{1,2})?`, 'g'),
  new RegExp(`\\b\\d{1,2} ${MONTH}`, 'g'), /\b\d{1,2}[/.]\d{1,2}(?:[/.]20\d\d)?\b/g, /\b20\d\d\b/g,
  new RegExp(`\\b${NUM} (?:nights?|days?|weeks?)\\b`, 'g'), new RegExp(`\\bin ${NUM} (?:days?|weeks?)\\b`, 'g'),
  /\b(?:at|around|after|before|by) \d{1,2}(?::\d{2})? ?(?:am|pm)?\b/g, /\b\d{1,2}(?::\d{2})? ?(?:am|pm)\b/g,
  new RegExp(`\\b${NUM} (?:checked |big |large )?(?:bags?|suitcases?)\\b`, 'g'),
];
function unplacedWords(t, used) {
  const covered = new Array(t.length).fill(false);
  const cover = (a, b) => { for (let i = a; i < b; i++) covered[i] = true; };
  used.forEach(([a, b]) => cover(a, b));
  NUMBER_SPANS.forEach((re) => { for (const x of t.matchAll(re)) cover(x.index, x.index + x[0].length); });
  const out = [];
  for (const x of t.matchAll(/[\p{L}\d][\p{L}\d'\-]*/gu)) {
    const w = x[0].replace(/'s$/, '');
    const inUse = covered.slice(x.index, x.index + x[0].length).some(Boolean);
    const isNumber = /^\d+$/.test(w) || NUMWORDS[w] != null;
    if (inUse) continue;
    if (isNumber) { out.push({ word: x[0], kind: 'number' }); continue; }
    if (FILLER.has(w) || FILLER.has(x[0]) || w.length < 2) continue;
    out.push({ word: x[0], kind: /^(?:turns?|born|age)$/.test(w) ? 'age' : 'word' });
  }
  return out;
}

// ---- what to bring and how to fly ---------------------------------------

function parseBags(t) {
  if (/\b(?:no|zero|without(?: any)?|don'?t need(?: any)?|do not need(?: any)?|not taking(?: any)?|no need for(?: any)?|skip(?: the)?) (?:checked |check-?in )?(?:bags?|luggage|suitcases?|baggage)\b/.test(t)) return { kind: 'none', count: 0 };
  if (/\b(?:just|only)(?: a| my)? (?:backpack|small bag|personal item|under-?seat bag)\b|\bbackpack only\b/.test(t)) return { kind: 'none', count: 0 };
  const m = t.match(new RegExp(`\\b${NUM} (?:checked |big |large )?(?:bags?|suitcases?)(?: each)?\\b`));
  if (m) return { kind: 'checked', count: toNum(m[1]) || 1 };
  if (/\b(?:carry-?on|cabin bag|hand luggage|hand baggage|overhead)\b/.test(t)) return { kind: 'cabin', count: 0 };
  if (/\b(?:a|one) bag\b|\bchecked bag\b|\bsuitcase\b|\bluggage\b/.test(t)) return { kind: 'checked', count: 1 };
  return null;
}

const PURPOSES = [
  ['funeral', /\b(?:funeral|passed away|grandma passed|grandpa passed|shiva|memorial)\b/],
  ['wedding', /\bwedding\b/],
  ['bachelor', /\b(?:bachelor|bachelorette|stag|hen do)\b/],
  ['birthday', /\b(?:birthday|bday|\d0th)\b/], // matched on raw text, before ordinals are stripped
  ['work', /\b(?:work|client|offsite|conference|meetings?|business)\b/],
  ['ski', /\bski(?:ing)?\b/],
  ['newyear', /\bnew year'?s?\b/],
];

export function parse(text, today) {
  const raw = text || '';
  const t = normalize(raw);
  const dest = findDestination(t, raw);
  const used = [];
  const markAll = (re) => { for (const x of t.matchAll(re)) used.push([x.index, x.index + x[0].length]); };
  if (dest) [dest.city, ...(dest.aka || [])].forEach((n) => markAll(new RegExp(`\\b${esc(normalize(n))}(?:'(?:e|a|ye|ya|de|da|te|ta))?\\b`, 'g')));
  markAll(/\bfor (?:[a-z']+ ){0,5}?(?:wedding|birthday|bday|funeral|bachelor(?:ette)? party|\d0)\b/g);
  markAll(/\b(?:grandma|grandpa|grandmother|grandfather|mom|mum|dad) passed(?: away)?\b/g);
  if (dest) markAll(new RegExp(`\\b${dest.code.toLowerCase()}\\b`, 'g'));
  const party = parseParty(t, today, used);
  const url = raw.match(/https?:\/\/[^\s]+/);
  const insurance = /\b(?:no|without|skip(?: the)?|don'?t (?:want|need)(?: any)?|do not (?:want|need)(?: any)?) (?:travel )?insurance\b/.test(t)
    ? false
    : /\b(?:with|add|get|include|want)(?: travel)? insurance\b|\binsured\b/.test(t)
      ? true
      : null;
  const seats = /\b(?:sit|seats?|seated|sitting)(?: all)? (?:together|next to each other|side by side)\b/.test(t)
    ? 'together'
    : /\b(?:legroom|leg room|exit row|i'?m tall)\b/.test(t)
      ? 'legroom'
      : /\bwindow\b/.test(t)
        ? 'window'
        : /\baisle\b/.test(t)
          ? 'aisle'
          : null;

  const out = {
    text: raw,
    dest,
    destSrc: dest && url && !new RegExp(`\\b${esc(normalize(dest.city))}\\b`).test(normalize(raw.replace(url[0], ''))) ? 'link' : 'said',
    unknown: dest ? null : findUnknown(t, raw),
    dates: parseDates(t, today),
    time: parseTime(t),
    party,
    bags: parseBags(t),
    budget: {
      cheapest: /\b(?:cheapest|cheap|budget|lowest(?: price| fare)?|least expensive|save money|bare ?bones|as cheap as)\b/.test(t),
      flex: /\b(?:flexible|flex|refundable|refund|might change|may change|could change|might shift|not sure (?:about|of) (?:the )?dates|cancel)\b/.test(t) &&
        !/\bflexible (?:on|with) (?:time|dates|when)\b/.test(t),
      comfort: /\b(?:comfort|treat (?:myself|us|her|him)|spoil|premium|extra space)\b/.test(t),
    },
    insurance,
    seats,
    meal: /\bno (?:food|meals?)\b/.test(t) ? false : /\b(?:meal|food|hungry|sandwich)\b/.test(t) ? true : null,
    autopilot: /\b(?:don'?t make me|do not make me|no steps|skip (?:the |all the )?steps|as simple as possible|just book(?: it)?|book it for me|do it for me|handle it|take care of it|any of the steps)\b/.test(t),
    purpose: (PURPOSES.find(([, re]) => re.test(raw.toLowerCase())) || [null])[0],
    grandma: /\bgrandma\b|\bgrandmother\b/.test(t),
    link: url ? url[0] : null,
  };
  if (out.unknown) markAll(new RegExp(`\\b${esc(normalize(out.unknown.name))}\\b`, 'g'));
  if (url) markAll(new RegExp(esc(normalize(url[0])), 'g'));
  out.unplaced = unplacedWords(t, used);
  return out;
}
