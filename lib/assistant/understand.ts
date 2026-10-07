import { AIRPORTS, type AirportCode, type FareFamily, inventory } from "@/lib/journey/flights";
import { SQUAD } from "@/lib/journey/script";
import { partyOf, type Profile } from "./profiles";
import type { Field, Stop, TripDraft } from "./draft";

/**
 * Turning a sentence plus a profile into a filled-in trip.
 *
 * Deliberately deterministic. This is a mock, and a mock that calls a model is
 * a mock that fails on a hotel wifi in front of a jury. Everything here is rules
 * over the sentence, which is enough to make the interaction feel real and
 * keeps every demo run identical.
 *
 * The honest framing for the pitch: a real build would put a model where
 * `extract` is. Nothing else in this file would change, because the rest is
 * about what to do once you know what was said, which is the harder half.
 */

/** What the passenger actually told us, as far as we can tell. */
export type Extracted = {
  origin: string | null;
  destination: string | null;
  departDate: string | null;
  returnDate: string | null;
  /** A month named without a day: "in May". Zero-based. */
  month: number | null;
  nights: number | null;
  /** "with 2 mates": how many others are coming. */
  companions: number | null;
  tripType: "backpacking" | "cityBreak" | null;
  checkedBag: boolean | null;
  cabinBag: boolean | null;
  seating: "aisle" | "window" | "together" | null;
  flexibility: "none" | "change" | "full" | null;
  budget: number | null;
  /** True when the sentence reads as "find me something" rather than a trip. */
  discovery: boolean;
  /** Loose descriptors used for discovery: warm, city, beach, short. */
  vibes: string[];
  /** A place the passenger named that Pegasus does not fly to (Jamie version). */
  unknownPlace: string | null;
  /** A departure city named that is not on the network (Jamie version). */
  unknownOrigin: string | null;
  /** Nothing in the sentence reads as a trip at all (Jamie version). */
  unclear: boolean;
  /** "Make it the 20th": a day with no month (Jamie version). */
  bareDay?: number | null;
};

const CITY_TO_CODE: Record<string, AirportCode> = {
  london: "STN",
  stansted: "STN",
  gatwick: "LGW",
  istanbul: "SAW",
  "sabiha gokcen": "SAW",
  izmir: "ADB",
  antalya: "AYT",
  ankara: "ESB",
  bodrum: "BJV",
  dalaman: "DLM",
  trabzon: "TZX",
  cappadocia: "ASR",
  kayseri: "ASR",
  berlin: "BER",
  paris: "CDG",
  amsterdam: "AMS",
  rome: "FCO",
  dubai: "DXB",
};

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  a: 1,
  couple: 2,
  few: 3,
};

/** Next occurrence of a day and month. A date already past means next year. */
function isoFrom(day: number, monthIndex: number): string {
  const now = new Date();
  const year =
    monthIndex < now.getMonth() || (monthIndex === now.getMonth() && day < now.getDate())
      ? now.getFullYear() + 1
      : now.getFullYear();
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * The best week in a month named without a day: the one starting on its
 * second Saturday. Not peak, not the first weekend, and a Saturday start
 * matches how people think about a week away.
 */
export function bestWeekIn(monthIndex: number): string {
  const first = isoFrom(1, monthIndex);
  const d = new Date(`${first}T00:00:00Z`);
  const toSaturday = (6 - d.getUTCDay() + 7) % 7;
  return addDays(first, toSaturday + 7);
}

function daysFromToday(iso: string): number {
  return Math.round(
    (Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayIso()}T00:00:00Z`)) / 86400000,
  );
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The next given weekday strictly after today. */
function nextWeekday(day: number, from = todayIso()): string {
  const d = new Date(`${from}T00:00:00Z`);
  const ahead = (day - d.getUTCDay() + 7) % 7 || 7;
  return addDays(from, ahead);
}

/** Words that can follow "to" or "in" without being a place. */
const NOT_PLACES = new Set([
  "the",
  "a",
  "an",
  "my",
  "our",
  "go",
  "get",
  "see",
  "visit",
  "fly",
  "be",
  "do",
  "have",
  "take",
  "travel",
  "book",
  "come",
  "stay",
  "spend",
  "somewhere",
  "anywhere",
  "it",
  "us",
  "me",
  "them",
  "and",
  "with",
  "for",
  "from",
  "on",
  "at",
  "of",
  "this",
  "next",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "time",
  "summer",
  "winter",
  "spring",
  "autumn",
  "fall",
  "march",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "january",
  "february",
  "april",
  "week",
  "weekend",
  "days",
  "nights",
  "total",
  "style",
  "comfort",
  "peace",
  "mind",
  "sun",
  "sunshine",
  "warm",
  "town",
  "city",
  "beach",
  "mountains",
  "budget",
  "mid",
  "late",
  "early",
  "about",
  "around",
  "march's",
  "half",
  "term",
]);

function placeAfter(text: string, words: string[]): string | null {
  for (const w of words) {
    const re = new RegExp(`\\b${w}\\s+([a-zà-ÿ][a-zà-ÿ'-]+(?:\\s+[a-zà-ÿ][a-zà-ÿ'-]+)?)`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const phrase = (m[1] ?? "").trim();
      const firstWord = phrase.split(/\s+/)[0] ?? "";
      if (firstWord.length < 3 || NOT_PLACES.has(firstWord) || /^\d/.test(firstWord)) continue;
      if (Object.keys(CITY_TO_CODE).some((name) => phrase.startsWith(name))) continue;
      if (WEEKDAYS.includes(firstWord)) continue;
      // Keep a two-word place only if both words look like a name ("new york").
      const two = phrase.split(/\s+/);
      const second = two[1] ?? "";
      return second !== "" &&
        !NOT_PLACES.has(second) &&
        second.length >= 3 &&
        /^(new|san|los|las|hong|abu|tel|cape|rio|buenos|kuala|ho)$/.test(firstWord)
        ? phrase
        : firstWord;
    }
  }
  return null;
}

const titleCase = (s: string): string => s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** Pull what we can out of the sentence. Everything here is best effort. */
/**
 * Jamie version: a sentence plus later corrections ("A week in Antalya. Make it
 * 3 of us. Add a bag.") reads as one trip, with the later sentence winning
 * wherever it says something. "Change it in a sentence" appends to the prompt,
 * so a change edits the trip instead of replacing it.
 */
export function extract(prompt: string): Extracted {
  const parts = prompt
    .split(/(?<=[.!?])\s+|\s+·\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length <= 1) return extractOne(prompt);
  const all = parts.map(extractOne);
  const pick = <K extends keyof Extracted>(k: K): Extracted[K] => {
    for (let i = all.length - 1; i >= 0; i--) {
      const v = all[i]?.[k];
      if (v !== null && v !== undefined) return v as Extracted[K];
    }
    return all[0]![k];
  };
  // A later month or date replaces an earlier one of either kind.
  let lastDated = -1;
  all.forEach((e, i) => {
    if (e.departDate !== null || e.month !== null || (e.bareDay ?? null) !== null)
      lastDated = i;
  });
  const dated = lastDated === -1 ? null : all[lastDated]!;
  let departDate = dated?.departDate ?? null;
  let month = dated?.month ?? null;
  if (dated !== null && dated.departDate === null && dated.month === null && dated.bareDay) {
    // "the 20th": in the month the trip was already in.
    const earlier = all
      .slice(0, lastDated)
      .reverse()
      .find((e) => e.departDate !== null || e.month !== null);
    const monthIndex =
      earlier?.departDate != null
        ? Number(earlier.departDate.slice(5, 7)) - 1
        : (earlier?.month ?? new Date().getMonth());
    departDate = isoFrom(Math.min(dated.bareDay, 28), monthIndex);
    month = null;
  }
  const nights = pick("nights");
  const destination = pick("destination");
  return {
    origin: pick("origin"),
    destination,
    departDate,
    returnDate:
      dated?.returnDate != null && dated.departDate === departDate
        ? dated.returnDate
        : departDate !== null && nights !== null
          ? addDays(departDate, nights)
          : null,
    month,
    nights,
    companions: pick("companions"),
    tripType: pick("tripType"),
    checkedBag: pick("checkedBag"),
    cabinBag: pick("cabinBag"),
    seating: pick("seating"),
    flexibility: pick("flexibility"),
    budget: pick("budget"),
    discovery: destination === null && all.some((e) => e.discovery),
    vibes: [...new Set(all.flatMap((e) => e.vibes))],
    unknownPlace: destination === null ? pick("unknownPlace") : null,
    unknownOrigin: pick("origin") === null ? pick("unknownOrigin") : null,
    unclear: all.every((e) => e.unclear),
    bareDay: null,
  };
}

function extractOne(prompt: string): Extracted {
  const text = prompt.toLowerCase();

  const found: { code: AirportCode; at: number }[] = [];
  for (const [name, code] of Object.entries(CITY_TO_CODE)) {
    const at = text.indexOf(name);
    if (at !== -1 && !found.some((f) => f.code === code)) found.push({ code, at });
  }
  for (const code of Object.keys(AIRPORTS) as AirportCode[]) {
    const at = text.search(new RegExp(`\\b${code.toLowerCase()}\\b`));
    if (at !== -1 && !found.some((f) => f.code === code)) found.push({ code, at });
  }
  found.sort((a, b) => a.at - b.at);

  const after = (preposition: string): AirportCode | null => {
    const re = new RegExp(`\\b${preposition}\\s+([a-z\\s]{2,25})`, "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const tail = (match[1] ?? "").trim();
      for (const [name, code] of Object.entries(CITY_TO_CODE)) {
        if (tail.startsWith(name)) return code;
      }
      for (const code of Object.keys(AIRPORTS) as AirportCode[]) {
        if (tail.startsWith(code.toLowerCase())) return code;
      }
    }
    return null;
  };

  const spokenTo = after("to") ?? after("in");
  const spokenFrom = after("from");
  let destination: string | null = spokenTo;
  let origin: string | null = spokenFrom;
  if (destination === null) destination = found.find((f) => f.code !== origin)?.code ?? null;
  if (origin === null) origin = found.find((f) => f.code !== destination)?.code ?? null;

  const dates: string[] = [];
  const dayMonth = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)/g;
  let m: RegExpExecArray | null;
  while ((m = dayMonth.exec(text)) !== null) {
    const day = Number(m[1]);
    const monthIndex = MONTHS.findIndex((mo) => mo.startsWith((m?.[2] ?? "").slice(0, 3)));
    if (monthIndex !== -1 && day >= 1 && day <= 31) dates.push(isoFrom(day, monthIndex));
  }

  // "Back on the 25th": a day with no month is the outbound's month, or the
  // next one if the day has already passed.
  if (dates.length === 1) {
    const bare = text.match(
      /\b(?:back|return(?:ing)?|home)\s+(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/,
    );
    const out = dates[0];
    if (bare?.[1] !== undefined && out !== undefined) {
      const day = Number(bare[1]);
      const d = new Date(`${out}T00:00:00Z`);
      if (day < d.getUTCDate()) d.setUTCMonth(d.getUTCMonth() + 1);
      d.setUTCDate(Math.min(day, 28 + (day > 28 ? day - 28 : 0)));
      dates.push(d.toISOString().slice(0, 10));
    }
  }

  // "In May", with no day at all.
  let month: number | null = null;
  if (dates.length === 0) {
    const monthOnly = text.match(/\b(?:in|for|during|this|next)\s+([a-z]+)\b/g) ?? [];
    for (const phrase of monthOnly) {
      const word = phrase.split(/\s+/)[1] ?? "";
      const index = MONTHS.findIndex(
        (mo) => mo === word || (word.length >= 3 && mo.startsWith(word)),
      );
      if (index !== -1) {
        month = index;
        break;
      }
    }
  }

  // Relative dates: "on Friday", "this weekend", "next weekend", "tomorrow".
  if (dates.length === 0 && month === null) {
    const weekday = text.match(
      /\b(?:on|this|next|coming)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
    );
    if (/\btomorrow\b/.test(text)) dates.push(addDays(todayIso(), 1));
    else if (/\bnext weekend\b/.test(text)) dates.push(addDays(nextWeekday(5), 7));
    else if (/\bthis weekend\b/.test(text)) dates.push(nextWeekday(5));
    else if (/\bnext week\b/.test(text)) dates.push(nextWeekday(1));
    else if (/\bnext month\b/.test(text)) month = (new Date().getMonth() + 1) % 12;
    else if (weekday?.[1] !== undefined) {
      const day = WEEKDAYS.indexOf(weekday[1]);
      const base = nextWeekday(day);
      dates.push(
        /\bnext\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(text) &&
          daysFromToday(base) < 7
          ? addDays(base, 7)
          : base,
      );
    }
  }

  const nightsMatch = text.match(
    /\b(\d{1,2}|a|one|two|three|four|five|six)\s*(?:nights?|days?)\b/,
  );
  let nights =
    nightsMatch?.[1] !== undefined
      ? (NUMBER_WORDS[nightsMatch[1]] ?? Number(nightsMatch[1]))
      : null;
  if (nights === null && /\b(a|one)\s+week\b/.test(text)) nights = 7;
  if (nights === null && /\btwo\s+weeks\b|\bfortnight\b/.test(text)) nights = 14;
  if (nights === null && /\blong weekend\b/.test(text)) nights = 3;
  if (nights === null && /\bweekend\b/.test(text)) nights = 2;

  const num = (w: string | undefined): number | null => {
    if (w === undefined) return null;
    const cleaned = w.replace(/^a /, "").replace(/ of$/, "");
    const n = NUMBER_WORDS[cleaned] ?? Number(cleaned);
    return Number.isFinite(n) && n > 0 && n < 40 ? n : null;
  };
  const N = "(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|a couple of|a few)";
  const mates = text.match(
    new RegExp(
      `\\b(?:with|and)\\s+${N}\\s+(?:mates?|friends?|others?|lads|people|colleagues|of the lads)\\b`,
    ),
  );
  const ofUs = text.match(new RegExp(`\\b${N}\\s+of\\s+us\\b`));
  const familyOf = text.match(new RegExp(`\\b(?:family|group|party)\\s+of\\s+${N}\\b`));
  const forN = text.match(
    new RegExp(
      `\\bfor\\s+${N}(?!\\s*(?:nights?|days?|weeks?|kg|gbp|pounds|£|euros?))\\b(?:\\s+(?:people|of us|adults|passengers))?`,
    ),
  );
  // "with Archie and Tom": names, read from the original casing.
  const named = prompt.match(
    /\bwith\s+((?:[A-Z][a-z]+)(?:\s*,\s*[A-Z][a-z]+)*(?:\s+and\s+[A-Z][a-z]+)?)/,
  );
  const namedCount =
    named?.[1] !== undefined
      ? named[1]
          .split(/\s*,\s*|\s+and\s+/)
          .filter(
            (n) =>
              !(n.toLowerCase() in CITY_TO_CODE) &&
              !MONTHS.includes(n.toLowerCase()) &&
              !WEEKDAYS.includes(n.toLowerCase()) &&
              !["My", "The", "Friends", "Mates", "Family"].includes(n),
          ).length
      : 0;
  const companions =
    num(mates?.[1]) ??
    (ofUs !== null ? (num(ofUs[1]) ?? 1) - 1 : null) ??
    (familyOf !== null ? (num(familyOf[1]) ?? 1) - 1 : null) ??
    (forN !== null ? (num(forN[1]) ?? 1) - 1 : null) ??
    (namedCount > 0 ? namedCount : null) ??
    (/\b(?:me and|with)\s+(?:my\s+)?(?:mates|friends|the lads)\b/.test(text)
      ? 2
      : /\b(?:me and|with)\s+(?:my\s+)?(?:partner|girlfriend|boyfriend|wife|husband|mum|dad|brother|sister)\b/.test(
            text,
          )
        ? 1
        : null);

  const tripType = /\bbackpack|hostel|interrail/.test(text)
    ? "backpacking"
    : /\bcity break|weekend in\b/.test(text)
      ? "cityBreak"
      : null;

  const budgetMatch = text.match(/(?:under|below|max|budget(?:\s+of)?)\s*£?\s*(\d{2,5})/);
  const budget = budgetMatch?.[1] !== undefined ? Number(budgetMatch[1]) : null;

  const noBag =
    /\b(no|without)\s+(checked|hold)\s+(bag|luggage)|hand luggage only|carry.?on only\b/.test(
      text,
    );
  const wantsBag =
    /\b(check(ed|ing)?|hold)\s+(a\s+)?(bag|luggage)|\d{2}\s*kg\b|suitcase\b|\badd\s+(a\s+)?bag|\bwith\s+(a\s+)?bags?\b/.test(
      text,
    );

  const seating = /\btogether\b/.test(text)
    ? "together"
    : /\baisle\b/.test(text)
      ? "aisle"
      : /\bwindow\b/.test(text)
        ? "window"
        : null;

  const flexibility = /\bfully flexible|refundable\b/.test(text)
    ? "full"
    : /\bflexible|might change|changeable\b/.test(text)
      ? "change"
      : null;

  const discovery =
    destination === null &&
    (/\b(turkey|turkiye|türkiye)\b/.test(text) ||
      /\bsomewhere|anywhere|ideas|suggest|where should|inspire|getaway|warm|sunny|cheap\b/.test(
        text,
      ));

  const vibes = ["warm", "sunny", "beach", "city", "short", "cheap", "quiet"].filter((v) =>
    text.includes(v),
  );

  const rawPlace =
    destination === null ? placeAfter(text, ["to", "in", "visit", "visiting", "see"]) : null;
  // "Turkey" is not a place to fly to but a brief: show the best of the network.
  const countryBrief = rawPlace !== null && /^(turkey|turkiye|türkiye)$/.test(rawPlace);
  const unknownPlace = countryBrief ? null : rawPlace;
  const unknownOrigin = spokenFrom === null ? placeAfter(text, ["from"]) : null;
  const unclear =
    origin === null &&
    destination === null &&
    unknownPlace === null &&
    dates.length === 0 &&
    month === null &&
    nights === null &&
    companions === null &&
    tripType === null &&
    !discovery &&
    vibes.length === 0 &&
    !/\b(trip|holiday|flight|fly|away|break|getaway)\b/.test(text);

  const bare = dates.length === 0 ? text.match(/\bthe\s+(\d{1,2})(?:st|nd|rd|th)\b/) : null;

  return {
    bareDay: bare?.[1] !== undefined ? Number(bare[1]) : null,
    unknownPlace: unknownPlace === null ? null : titleCase(unknownPlace),
    unknownOrigin: unknownOrigin === null ? null : titleCase(unknownOrigin),
    unclear,
    origin,
    destination,
    departDate: dates[0] ?? null,
    returnDate:
      dates[1] ??
      (dates[0] !== undefined && nights !== null ? addDays(dates[0], nights) : null),
    month,
    nights,
    companions,
    tripType,
    checkedBag: noBag ? false : wantsBag ? true : null,
    cabinBag: /cabin bag|hand luggage|carry.?on/.test(text) ? true : null,
    seating,
    flexibility,
    budget,
    discovery,
    vibes,
  };
}

function field<T>(
  value: T,
  source: Field<T>["source"],
  why: string,
  uncertain = false,
): Field<T> {
  return uncertain ? { value, source, why, uncertain } : { value, source, why };
}

/**
 * The route for a week in Cappadocia. Pegasus does not fly London to Kayseri,
 * so the companion builds it the way its network works: into Istanbul, across
 * to Kayseri for the balloons, down to the coast, and home from Antalya.
 */
export function stopsFor(
  destination: string,
  nights: number,
  tripType: Extracted["tripType"],
): { stops: Stop[]; why: string } | null {
  if (destination !== SQUAD.destination || nights < 5) return null;
  if (tripType === "cityBreak") {
    const rest = Math.max(2, nights - 3);
    return {
      stops: [
        { code: "SAW", nights: rest },
        { code: "ASR", nights: nights - rest },
      ],
      why: `A city break: ${rest} nights in Istanbul, then the balloons, and home from Kayseri.`,
    };
  }
  const coast = Math.max(1, Math.round((nights - 3) / 2));
  const istanbul = nights - 3 - coast;
  return {
    stops: [
      { code: "SAW", nights: istanbul },
      { code: "ASR", nights: 3 },
      { code: "AYT", nights: coast },
    ],
    why: `Balloons from Göreme need three mornings. Two nights in Istanbul on the way in, and the coast to finish, which is how the network connects it.`,
  };
}

/**
 * Fill every gap, saying where each answer came from.
 *
 * What was said wins, then what the profile remembers, then what can be
 * inferred. On a cold start nothing is remembered, so everything not said is
 * a prediction and is tagged as one.
 */
export function buildDraft(prompt: string, profile: Profile): TripDraft {
  const said = extract(prompt);
  const party = partyOf(profile);
  const habits = profile.habits;
  const cold = profile.coldStart;
  /** The tag for a value that would be remembered if there were a history. */
  const mem = cold ? "predicted" : "profile";

  const origin = said.origin ?? profile.homeAirport;
  const destination = said.destination ?? (cold ? "SAW" : "TZX");

  const departDate =
    said.departDate ??
    (said.month !== null
      ? bestWeekIn(said.month)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + 21);
          return d.toISOString().slice(0, 10);
        })());
  const nightsAway = said.nights ?? (cold ? 7 : 2);
  const returnDate = said.returnDate ?? addDays(departDate, nightsAway);

  const route = stopsFor(destination, nightsAway, said.tripType);
  const needsBag =
    said.checkedBag ?? (said.tripType === "backpacking" ? true : habits.checkedBag);
  const checkedKg: 0 | 12 | 20 | 25 = needsBag ? 25 : 0;

  const pkg: FareFamily = needsBag
    ? habits.package === "light"
      ? "saver"
      : habits.package
    : habits.package;

  const firstFlight = inventory(origin, route?.stops[0]?.code ?? destination, departDate)[0];
  const departs = firstFlight?.departs ?? "06:10";

  const packageWhy = needsBag
    ? said.tripType === "backpacking"
      ? "A 40L backpack won't fit under the seat, which is all LIGHT allows. SAVER adds an 8 kg cabin bag and 25 kg checked for less than the bag costs at the airport."
      : cold
        ? "You said a bag, and SAVER includes one for less than adding it later."
        : habits.reason
    : cold
      ? "The cheapest fare, because nothing you said needs a bag."
      : habits.reason;

  return {
    origin: field(
      origin,
      said.origin !== null ? "said" : "predicted",
      said.origin !== null
        ? "You said so."
        : cold
          ? `Your phone is in ${profile.homeCity}, and ${AIRPORTS[origin as AirportCode]?.name ?? origin} has the Istanbul flights.`
          : `Every trip home has left from ${AIRPORTS[origin as AirportCode]?.name ?? origin}.`,
    ),
    destination: field(
      destination,
      said.destination !== null ? "said" : mem,
      said.destination !== null ? "You said so." : "Where you always go.",
    ),
    stops: field(
      route?.stops ?? [],
      "predicted",
      route?.why ?? "",
      route !== null && said.tripType === null,
    ),
    departDate: field(
      departDate,
      said.departDate !== null ? "said" : "predicted",
      said.departDate !== null
        ? "You said so."
        : said.month !== null
          ? `${MONTHS[said.month]?.replace(/^\w/, (c) => c.toUpperCase())}, as you said. This week because balloons fly most mornings and it is before peak fares.`
          : "Three weeks out, which is when fares are usually lowest.",
      said.departDate === null && said.month === null,
    ),
    returnDate: field<string | null>(
      returnDate,
      said.returnDate !== null || said.nights !== null ? "said" : "predicted",
      said.returnDate !== null
        ? "You said so."
        : said.nights !== null
          ? `${said.nights === 7 ? "A week" : `${said.nights} nights`}, as you said.`
          : cold
            ? "A week, which is what most people take for this."
            : "The Sunday, as on your usual trip.",
      said.returnDate === null && said.nights === null,
    ),
    party: field(
      party,
      said.companions !== null ? "said" : mem,
      said.companions !== null
        ? `${said.companions + 1} of you. You book yours; I hold the seats beside you for the others and build each of them their own.`
        : cold
          ? "Just you, unless you say otherwise."
          : "Just you, as always.",
    ),
    package: field(pkg, said.tripType !== null || cold ? "predicted" : "profile", packageWhy),
    checkedKg: field(
      checkedKg,
      said.checkedBag !== null ? "said" : cold ? "predicted" : "profile",
      said.checkedBag === true
        ? "You said a bag."
        : said.checkedBag === false
          ? "You said hand luggage only."
          : needsBag
            ? cold
              ? "Included in SAVER, which the backpack needs anyway."
              : "Included in SAVER, as on every trip home."
            : "No bag, because nothing you said needs one.",
    ),
    cabinBag: field(
      pkg !== "light" || said.cabinBag === true,
      said.cabinBag === true ? "said" : pkg === "light" ? "predicted" : mem,
      pkg === "light" ? "LIGHT covers the underseat bag only." : "Included in this fare.",
    ),
    seating: field(
      said.seating ?? (cold ? "window" : habits.seatPreference),
      said.seating !== null ? "said" : "predicted",
      said.seating !== null
        ? "You said so."
        : cold
          ? `${departs} departure. Grab the window and sleep${
              said.companions !== null && said.companions > 0
                ? "; the seats next to you are shown to your mates when they book"
                : ""
            }.`
          : `Seat ${profile.id === "emre" ? "3A" : "by the window"}, as on every trip so far.`,
      cold,
    ),
    flexibility: field(
      said.flexibility ?? habits.flexibility,
      said.flexibility !== null ? "said" : mem,
      said.flexibility !== null ? "You said so." : habits.flexibilityReason,
    ),
    notes: [],
  };
}
