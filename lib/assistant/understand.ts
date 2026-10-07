import { AIRPORTS, type AirportCode, type FareFamily, inventory } from "@/lib/journey/flights";
import { partyOf, type Profile } from "./profiles";
import { NO_STOPS, type Field, type TripDraft } from "./draft";

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

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Pull what we can out of the sentence. Everything here is best effort. */
export function extract(prompt: string): Extracted {
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

  const mates = text.match(
    /\b(?:with|and)\s+(\d|one|two|three|four|five|six|a couple of|a few)\s+(?:mates?|friends?|others?|of us|lads)\b/,
  );
  const companions =
    mates?.[1] !== undefined
      ? (NUMBER_WORDS[mates[1].replace(/^a /, "").replace(/ of$/, "")] ?? Number(mates[1]))
      : /\b(?:me and|with)\s+(?:my\s+)?(?:mates|friends|the lads)\b/.test(text)
        ? 2
        : null;

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
    /\b(check(ed|ing)?|hold)\s+(a\s+)?(bag|luggage)|\d{2}\s*kg\b|suitcase\b/.test(text);

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
    /\bsomewhere|anywhere|ideas|suggest|where should|inspire|getaway|warm|sunny|cheap\b/.test(
      text,
    );

  const vibes = ["warm", "sunny", "beach", "city", "short", "cheap", "quiet"].filter((v) =>
    text.includes(v),
  );

  return {
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

  const needsBag =
    said.checkedBag ?? (said.tripType === "backpacking" ? true : habits.checkedBag);
  const checkedKg: 0 | 12 | 20 | 25 = needsBag ? 25 : 0;

  const pkg: FareFamily = needsBag
    ? habits.package === "light"
      ? "saver"
      : habits.package
    : habits.package;

  const firstFlight = inventory(origin, destination, departDate)[0];
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
    stops: NO_STOPS,
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
