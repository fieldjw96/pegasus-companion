import type { Field, TripDraft } from "@/lib/assistant/draft";
import { NO_STOPS } from "@/lib/assistant/draft";
import type { Profile } from "@/lib/assistant/profiles";
import { HOME } from "@/lib/journey/script";
import { daysBetween, dayLongMonth, shift, weekdayName } from "@/lib/demo/personas";

/**
 * A Moment: a recurring trip the companion knows about and brings up at the
 * right time, before anyone searches.
 *
 * Emre flies home for his mum's birthday every June. Left to the app, he
 * remembers in late May when fares are up and books late, drives, or goes with
 * someone else. The companion learned the trip from last June and nudges him
 * two months out, while he is most likely to convert.
 *
 * Three gates keep it quiet, each alone sufficient: it is not the moment;
 * the passenger said not this year, or never; or the interruption budget is
 * spent. A change that makes it speak more often is a regression.
 */

export type BuyRule = "ask" | "book";

export type Moment = {
  title: string;
  /** The date the moment is about, ISO, next occurrence. */
  occasion: string;
  /** How long before the occasion the companion speaks. */
  nudgeDaysBefore: number;
  /** When the trip starts and ends, relative to the occasion. */
  out: string;
  back: string;
  origin: string;
  destination: string;
  who: string[];
  mustHave: string[];
  buyRule: BuyRule;
  interruptionBudget: number;
};

/** The next 14 June, from today. */
export function nextOccasion(monthDay: string, from = new Date()): string {
  const year = from.getFullYear();
  const thisYear = `${year}-${monthDay}`;
  return Date.parse(`${thisYear}T00:00:00Z`) < from.getTime() - 86_400_000
    ? `${year + 1}-${monthDay}`
    : thisYear;
}

/** The Friday before a date (or the date itself, if it is a Friday). */
export function fridayBefore(iso: string): string {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
  const back = (weekday - 5 + 7) % 7;
  return shift(iso, -(back === 0 ? 7 : back));
}

export function buildMoment(occasion = nextOccasion("06-14")): Moment {
  const out = fridayBefore(occasion);
  return {
    title: "Mum's birthday",
    occasion,
    nudgeDaysBefore: daysBetween(`${occasion.slice(0, 4)}-04-14`, occasion),
    out,
    back: shift(out, 2),
    origin: HOME.origin,
    destination: HOME.destination,
    who: ["Emre Kaya"],
    mustHave: ["Friday evening", `seat ${HOME.seat}`, "SAVER"],
    buyRule: "ask",
    interruptionBudget: 3,
  };
}

export const MOMENT: Moment = buildMoment();

export function nudgeDate(moment: Moment): string {
  return shift(moment.occasion, -moment.nudgeDaysBefore);
}

/** The morning the companion starts checking: 1 March. */
export function watchStart(moment: Moment): string {
  return `${moment.occasion.slice(0, 4)}-03-01`;
}

/** The late reminder, if nothing was booked: fares rise from late May. */
export function reminderDate(moment: Moment): string {
  return shift(moment.occasion, -17);
}

/**
 * Emre's usual trip, rebuilt from last June: flights, seat and bundle, with
 * an all-in price up front. The companion guesses the Sunday return; it is
 * his mum's birthday, so he is staying for it, and changes it.
 */
export function usualTrip(profile: Profile, moment: Moment = MOMENT): TripDraft {
  const mem = <T>(value: T, why: string): Field<T> => ({ value, source: "profile", why });
  return {
    origin: mem(moment.origin, "Every trip home has left from Sabiha Gökçen."),
    destination: mem(
      moment.destination,
      `Home. Mum's birthday is ${dayLongMonth(moment.occasion)}.`,
    ),
    stops: NO_STOPS,
    departDate: mem(moment.out, "The Friday before, as last June and the June before."),
    returnDate: {
      value: moment.back,
      source: "predicted",
      why: `The Sunday, as on your usual weekend. The birthday is on the ${weekdayName(moment.occasion)}, so say if you're staying.`,
      uncertain: true,
    },
    party: mem({ adults: 1, children: 0, infants: 0 }, "Just you, as always."),
    package: mem("saver", "SAVER, as on every trip home: it has the bag you take."),
    checkedKg: mem(25, "Included in SAVER."),
    cabinBag: mem(true, "Included in SAVER."),
    seating: mem("window", `Seat ${HOME.seat}, as on every trip so far.`),
    flexibility: mem("none", profile.habits.flexibilityReason),
    notes: [],
  };
}

export type Morning = {
  date: string;
  /** Day number since checking began, from 1. */
  day: number;
  verdict: "silent" | "nudge" | "remind";
  /** Why, in sentences a passenger can check. Empty when silent. */
  why: string[];
  /** Why it stayed quiet, for the demo panel. */
  quiet: string | null;
};

export type MomentState = {
  /** "Not this year". */
  declined: boolean;
  /** "Don't suggest again". */
  never: boolean;
  booked: boolean;
  spoken: number;
};

export const QUIET_STATE: MomentState = {
  declined: false,
  never: false,
  booked: false,
  spoken: 0,
};

/**
 * One morning's check. Pure, so a rehearsal and the live run agree.
 */
export function checkMorning(
  moment: Moment,
  date: string,
  state: MomentState = QUIET_STATE,
): Morning {
  const day = daysBetween(watchStart(moment), date) + 1;
  const base = { date, day };
  if (state.never) {
    return { ...base, verdict: "silent", why: [], quiet: "Told never to suggest this." };
  }
  if (state.declined) {
    return { ...base, verdict: "silent", why: [], quiet: "Not this year, Emre said." };
  }
  if (state.booked) {
    return { ...base, verdict: "silent", why: [], quiet: "Already booked." };
  }
  if (state.spoken >= moment.interruptionBudget) {
    return { ...base, verdict: "silent", why: [], quiet: "Interruption budget spent." };
  }
  if (date === nudgeDate(moment)) {
    return {
      ...base,
      verdict: "nudge",
      why: [
        `You flew home for ${dayLongMonth(moment.occasion)} last year and the year before, both on the Friday 19:05.`,
        `June fares are lowest about now and start rising from late May.`,
        `I've built your usual: SAVER, seat ${HOME.seat}, back on the Sunday.`,
      ],
      quiet: null,
    };
  }
  if (date === reminderDate(moment)) {
    return {
      ...base,
      verdict: "remind",
      why: [
        `${dayLongMonth(moment.occasion)} is in ${daysBetween(date, moment.occasion)} days and nothing is booked.`,
        `The Friday 19:05 is up 18% since April and down to 7 seats.`,
      ],
      quiet: null,
    };
  }
  return { ...base, verdict: "silent", why: [], quiet: "Not the moment." };
}

/** Every morning from the start of checking up to and including `date`. */
export function mornings(
  moment: Moment,
  upTo: string,
  state: MomentState = QUIET_STATE,
): Morning[] {
  const out: Morning[] = [];
  let spoken = state.spoken;
  const total = daysBetween(watchStart(moment), upTo);
  for (let i = 0; i <= total; i += 1) {
    const m = checkMorning(moment, shift(watchStart(moment), i), { ...state, spoken });
    if (m.verdict !== "silent") spoken += 1;
    out.push(m);
  }
  return out;
}

/** The scenes the demo jumps to. */
export function momentDates(moment: Moment = MOMENT) {
  return {
    nudge: nudgeDate(moment),
    quiet: shift(nudgeDate(moment), 1),
    reminder: reminderDate(moment),
    travel: moment.out,
    nextYear: shift(nudgeDate(moment), 365),
  };
}

/** The gift extras, priced on top of the fare. */
export const GIFTS = {
  extraWeight: { label: "15 kg more for gifts", perLeg: 24, legs: 1 },
  delight: { label: "Turkish delight for Mum, Pegasus Café", perLeg: 6.5, legs: 1 },
} as const;
