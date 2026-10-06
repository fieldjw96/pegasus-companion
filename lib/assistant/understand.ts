import { AIRPORTS, type AirportCode, type FareFamily } from "@/lib/journey/flights";
import { partyOf, type Profile } from "./profiles";
import type { Field, TripDraft } from "./draft";

/**
 * Turning a sentence plus a saved profile into a filled-in trip.
 *
 * Deliberately deterministic. This is a mock, and a mock that calls a model is
 * a mock that fails on a hotel wifi in front of a jury. Everything here is
 * rules over the prompt text, which is enough to make the interaction feel real
 * and keeps every demo run identical.
 *
 * The honest framing for the pitch: a real build would put a model where
 * `extract` is. Nothing else in this file would change, because the rest is
 * about what to do once you know what was said — which is the harder half.
 */

/** What the passenger actually told us, as far as we can tell. */
export type Extracted = {
  origin: string | null;
  destination: string | null;
  departDate: string | null;
  returnDate: string | null;
  nights: number | null;
  checkedBag: boolean | null;
  cabinBag: boolean | null;
  seating: "aisle" | "window" | "together" | null;
  flexibility: "none" | "change" | "full" | null;
  budget: number | null;
  /** True when the prompt reads as "find me something" rather than a booking. */
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

function isoFrom(day: number, monthIndex: number): string {
  const now = new Date();
  // Assume the next occurrence: a date already past means next year.
  const year =
    monthIndex < now.getMonth() || (monthIndex === now.getMonth() && day < now.getDate())
      ? now.getFullYear() + 1
      : now.getFullYear();
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Pull what we can out of the prompt. Everything here is best effort. */
export function extract(prompt: string): Extracted {
  const text = prompt.toLowerCase();

  const found: { code: AirportCode; at: number }[] = [];
  for (const [name, code] of Object.entries(CITY_TO_CODE)) {
    const at = text.indexOf(name);
    if (at !== -1) found.push({ code, at });
  }
  // Also accept bare IATA codes, which power users type.
  for (const code of Object.keys(AIRPORTS) as AirportCode[]) {
    const at = text.search(new RegExp(`\\b${code.toLowerCase()}\\b`));
    if (at !== -1 && !found.some((f) => f.code === code)) found.push({ code, at });
  }
  found.sort((a, b) => a.at - b.at);

  /*
   * Resolve origin and destination from the prepositions, falling back to
   * position. Three things this has to get right, each of which it got wrong
   * first time:
   *
   *   - "I want to fly to Berlin": there are two "to"s and only the second one
   *     names a place, so every "to" has to be tried, not just the first.
   *   - "warm week in Antalya": one airport named, and it is where they are
   *     going, not where they are leaving from.
   *   - "from London": an explicit origin must not be mistaken for a target.
   */
  const after = (preposition: string): AirportCode | null => {
    const re = new RegExp(`\\b${preposition}\\s+([a-z\\s]{2,25})`, "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const tail = (match[1] ?? "").trim();
      for (const [name, code] of Object.entries(CITY_TO_CODE)) {
        if (tail.startsWith(name)) return code;
      }
      // Bare IATA codes too, or "STN to AYT" resolves backwards: neither
      // three-letter code is a city name, so position alone decides and gets
      // it exactly the wrong way round.
      for (const code of Object.keys(AIRPORTS) as AirportCode[]) {
        if (tail.startsWith(code.toLowerCase())) return code;
      }
    }
    return null;
  };

  const spokenTo = after("to");
  const spokenFrom = after("from");

  let destination: string | null = spokenTo;
  let origin: string | null = spokenFrom;

  if (destination === null) {
    // The first airport that is not the stated origin. With exactly one named
    // and no "from", that one is where they are going.
    destination = found.find((f) => f.code !== origin)?.code ?? null;
  }
  if (origin === null) {
    origin = found.find((f) => f.code !== destination)?.code ?? null;
  }

  const dates: string[] = [];
  const dayMonth = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)/g;
  let m: RegExpExecArray | null;
  while ((m = dayMonth.exec(text)) !== null) {
    const day = Number(m[1]);
    const monthIndex = MONTHS.findIndex((mo) => mo.startsWith((m?.[2] ?? "").slice(0, 3)));
    if (monthIndex !== -1 && day >= 1 && day <= 31) dates.push(isoFrom(day, monthIndex));
  }

  /*
   * "Back on the 25th" names a day with no month. It is the month of the
   * outbound, or the next one if the day has already passed. Without this the
   * return in the demo's own opening sentence was being guessed.
   */
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

  const nightsMatch = text.match(/\b(\d{1,2})\s*(?:nights?|days?)\b/);
  const nights = nightsMatch?.[1] !== undefined ? Number(nightsMatch[1]) : null;

  const budgetMatch = text.match(/(?:under|below|max|budget(?:\s+of)?)\s*£?\s*(\d{2,5})/);
  const budget = budgetMatch?.[1] !== undefined ? Number(budgetMatch[1]) : null;

  const noBag =
    /\b(no|without)\s+(checked|hold)\s+(bag|luggage)|hand luggage only|carry.?on only\b/.test(
      text,
    );
  // "check", "checked" and "checking" all mean the same thing here. The first
  // version matched only the first two, so "checking a bag" read as no opinion.
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
    nights,
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
 * The ordering matters: what was said wins, then what the profile remembers,
 * then what can be inferred. Nothing silently overrides the passenger.
 */
export function buildDraft(prompt: string, profile: Profile): TripDraft {
  const said = extract(prompt);
  const party = partyOf(profile);
  const habits = profile.habits;
  const child = profile.travellers.find((t) => t.kind === "child");

  const origin = said.origin ?? "STN";
  const destination = said.destination ?? "SAW";

  const departDate =
    said.departDate ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 21);
      return d.toISOString().slice(0, 10);
    })();

  const returnDate =
    said.returnDate ??
    (said.nights !== null ? addDays(departDate, said.nights) : addDays(departDate, 6));

  const checkedBag = said.checkedBag ?? habits.checkedBag;
  const checkedKg: 0 | 12 | 20 | 25 = checkedBag ? (party.children > 0 ? 25 : 20) : 0;

  /*
   * The package follows the baggage, not the other way round, and this is the
   * one prediction that saves real money. SAVER includes 25 kg for 30.00 over
   * LIGHT; the same allowance bought after choosing LIGHT costs up to 59.00.
   * Predicting LIGHT for someone who has said they are checking a bag would be
   * cheaper on this screen and dearer at the end.
   */
  const pkg: FareFamily = checkedBag
    ? habits.package === "light"
      ? "saver"
      : habits.package
    : habits.package;

  const packageWhy = checkedBag
    ? pkg === "saver" && habits.package === "light"
      ? "You need a hold bag, so SAVER is cheaper than LIGHT plus baggage later — 30.00 now against up to 59.00 at the next screen."
      : `${profile.label} bookings have used this fare, and it already includes the hold bag.`
    : habits.reason;

  return {
    origin: field(
      origin,
      said.origin !== null ? "said" : "predicted",
      said.origin !== null
        ? "You said so."
        : "You have flown from London Stansted on every booking.",
    ),
    destination: field(
      destination,
      said.destination !== null ? "said" : "predicted",
      said.destination !== null ? "You said so." : "Picked up from your last search.",
      said.destination === null,
    ),
    departDate: field(
      departDate,
      said.departDate !== null ? "said" : "predicted",
      said.departDate !== null
        ? "You said so."
        : "Three weeks out, which is when you usually book.",
      said.departDate === null,
    ),
    returnDate: field<string | null>(
      returnDate,
      said.returnDate !== null ? "said" : said.nights !== null ? "said" : "predicted",
      said.returnDate !== null
        ? "You said so."
        : said.nights !== null
          ? `${said.nights} nights from the outbound.`
          : "A week away, matching your usual trip length.",
      said.returnDate === null && said.nights === null,
    ),
    party: field(
      party,
      "profile",
      `${profile.label}: ${profile.travellers.map((t) => t.name.split(" ")[0]).join(", ")}.`,
    ),
    package: field(pkg, said.checkedBag !== null ? "predicted" : "profile", packageWhy),
    /*
     * "Checking a bag" says there is a bag. How heavy it is comes from the
     * profile, which is why a bag the passenger asked for is still tagged
     * remembered: the 25 kg is the companion's, from the last family holiday.
     */
    checkedKg: field(
      checkedKg,
      said.checkedBag === false
        ? "said"
        : checkedBag === habits.checkedBag
          ? "profile"
          : "said",
      said.checkedBag === false
        ? "You said hand luggage only."
        : checkedBag
          ? said.checkedBag === true
            ? `You said a bag. ${checkedKg} kg is what every ${profile.label.toLowerCase()} booking has carried.`
            : `Every ${profile.label.toLowerCase()} booking has included one.`
          : "You have never checked a bag on this kind of trip.",
    ),
    cabinBag: field(
      pkg !== "light" || said.cabinBag === true,
      said.cabinBag === true ? "said" : pkg === "light" ? "predicted" : "profile",
      pkg === "light"
        ? "LIGHT covers the underseat bag only."
        : `Included in this fare, and every ${profile.label.toLowerCase()} booking has carried one.`,
    ),
    /*
     * A seat preference read off a fact about the party ("Mila is 4") is a
     * prediction with a reason, not a memory, so it is tagged as one.
     */
    seating: field(
      said.seating ?? habits.seatPreference,
      said.seating !== null
        ? "said"
        : habits.seatPreference === "together"
          ? "predicted"
          : "profile",
      said.seating !== null
        ? "You said so."
        : habits.seatPreference === "together"
          ? `${child?.name.split(" ")[0] ?? "A child"} is ${child?.age ?? 4}, so seats together rather than assigned at check-in.`
          : habits.reason,
    ),
    /*
     * Paying to change a holiday is the one guess worth a second look, so a
     * profile that leans that way is marked predicted and flagged.
     */
    flexibility: field(
      said.flexibility ?? habits.flexibility,
      said.flexibility !== null
        ? "said"
        : habits.flexibility === "none"
          ? "profile"
          : "predicted",
      said.flexibility !== null ? "You said so." : habits.flexibilityReason,
      said.flexibility === null && habits.flexibility !== "none",
    ),
    notes: buildNotes(said, profile, checkedBag),
  };
}

function buildNotes(said: Extracted, profile: Profile, checkedBag: boolean): string[] {
  const notes: string[] = [];
  if (said.budget !== null) {
    notes.push(`Keeping the total under £${said.budget}, as you asked.`);
  }
  if (checkedBag) {
    notes.push(
      "Baggage is in the fare rather than added later: the same allowance costs 30.00 here and up to 59.00 after this point.",
    );
  }
  const child = profile.travellers.find((t) => t.kind === "child");
  if (child !== undefined) {
    notes.push(
      `${child.name.split(" ")[0]} is ${child.age}, so a seat beside an adult is reserved.`,
    );
  }
  return notes;
}
