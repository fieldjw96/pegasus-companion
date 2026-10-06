import { AIRPORTS, type AirportCode } from "@/lib/journey/flights";
import { grouped } from "@/lib/demo/hero";

export { dayMonth, grouped, longDate } from "@/lib/demo/hero";

/**
 * A Watch: a trip the passenger will take, described as tolerances rather
 * than a search, which the companion checks every morning.
 *
 * This is the companion moving first. Nobody books a half term in one sitting;
 * they look, leave, and come back. A watch holds the decision open and speaks
 * only when the answer to the specific question changes. Three gates, each of
 * which alone keeps it quiet: nothing changed; the change does not cross the
 * cap; or the budget of interruptions is spent.
 */

export type BuyRule = "ask" | "book";

export type WatchIntent = {
  title: string;
  /** Inclusive dates, ISO. */
  from: string;
  to: string;
  /** Places still in the running. */
  where: AirportCode[];
  who: string[];
  /** All-in cap, GBP, for everyone. */
  cap: number;
  mustHave: string[];
  buyRule: BuyRule;
  /** Days before departure at which the companion stops waiting. */
  deadlineDays: number;
  /** Three per deliberation. */
  interruptionBudget: number;
};

export const INTENT: WatchIntent = {
  title: "Half term in Türkiye",
  from: "2026-10-19",
  to: "2026-10-25",
  where: ["ADB", "AYT", "DLM"],
  who: ["Jack Field", "Ayşe Field", "Mila Field"],
  cap: 1300,
  mustHave: ["seats together", "not before 08:00", "a checked bag"],
  buyRule: "ask",
  deadlineDays: 21,
  interruptionBudget: 3,
};

/** The morning the watch was set, and the one the deadline rule fires. */
export const WATCH_START = "2026-09-01";
export const CHECK_TIME = "06:40";

export function deadlineDate(intent: WatchIntent): string {
  return shift(intent.from, -intent.deadlineDays);
}

export function shift(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000,
  );
}

/**
 * The scripted market. All-in totals for the whole party, per place, per day.
 *
 * Deterministic and deliberately dull: Izmir sits just over the cap for three
 * weeks, then drops 94 overnight on 22 September. Antalya drifts down and
 * never quite makes it. Dalaman has no direct flight on the 19th. A real build
 * reads fares; the shape of the decision is the same.
 */
export function bestOn(date: string, code: AirportCode): number | null {
  const day = daysBetween(WATCH_START, date) + 1;
  switch (code) {
    case "ADB":
      return day >= 22 ? 1224.66 : 1318.66;
    case "AYT":
      return day >= 25 ? 1341.66 : 1410;
    case "DLM":
      return null;
    default:
      return null;
  }
}

export type Best = { code: AirportCode; city: string; total: number };

export function bestToday(intent: WatchIntent, date: string): Best | null {
  let best: Best | null = null;
  for (const code of intent.where) {
    const total = bestOn(date, code);
    if (total === null) continue;
    if (best === null || total < best.total) {
      best = { code, city: AIRPORTS[code].city, total };
    }
  }
  return best;
}

export type Morning = {
  date: string;
  /** Day number since the watch was set, from 1. */
  day: number;
  best: Best | null;
  /** Positive when under the cap, negative when over, in GBP. */
  margin: number | null;
  /** What the companion decided. */
  verdict: "silent" | "propose" | "deadline";
  /** Why, in sentences a passenger can check. Empty when silent. */
  why: string[];
  /** Why it stayed quiet, for the demo panel. */
  quiet: string | null;
};

/**
 * One morning's check. Pure, so a rehearsal and the live run agree.
 *
 * `spoken` is how many times the companion has already interrupted this
 * deliberation; the third gate.
 */
export function checkMorning(intent: WatchIntent, date: string, spoken = 0): Morning {
  const day = daysBetween(WATCH_START, date) + 1;
  const best = bestToday(intent, date);
  const margin = best === null ? null : Math.round((intent.cap - best.total) * 100) / 100;
  const yesterday = bestToday(intent, shift(date, -1));
  const deadline = deadlineDate(intent);
  const base = { date, day, best, margin };

  if (spoken >= intent.interruptionBudget) {
    return { ...base, verdict: "silent", why: [], quiet: "Interruption budget spent." };
  }

  if (date === deadline) {
    const why: string[] = [];
    if (best === null) {
      why.push(`Nothing is flying on these dates. Your rule says ask.`);
    } else if (margin !== null && margin < 0) {
      why.push(
        `Nothing came under ${grouped(intent.cap)}. The best is ${best.city} at ${grouped(best.total)} — ${grouped(-margin)} over. Your rule says ask.`,
      );
    } else if (best !== null) {
      why.push(
        `${best.city} is under your cap at ${grouped(best.total)}. Your rule says ask.`,
      );
    }
    return { ...base, verdict: "deadline", why, quiet: null };
  }

  const changed =
    best !== null && (yesterday === null || Math.abs(best.total - yesterday.total) >= 0.01);
  if (!changed) {
    return { ...base, verdict: "silent", why: [], quiet: "Nothing changed overnight." };
  }

  const crossesCap =
    margin !== null && margin >= 0 && (yesterday === null || yesterday.total > intent.cap);
  if (!crossesCap) {
    return {
      ...base,
      verdict: "silent",
      why: [],
      quiet: "It moved, but it is still over your cap.",
    };
  }

  const drop =
    yesterday === null ? 0 : Math.round((yesterday.total - best!.total) * 100) / 100;
  const others = intent.where
    .filter((code) => code !== best!.code)
    .map((code) => {
      const total = bestOn(date, code);
      return total === null
        ? `there's no direct to ${AIRPORTS[code].city} on the ${Number(intent.from.slice(-2))}th`
        : `${AIRPORTS[code].city} is still ${grouped(total)}`;
    });
  const why = [
    `The ${best!.city} fare dropped ${grouped(drop)} GBP overnight, which brings the whole trip under ${grouped(intent.cap)} for the first time.`,
  ];
  if (others.length > 0) {
    why.push(`${capitalise(others.join(" and "))}.`);
  }
  return { ...base, verdict: "propose", why, quiet: null };
}

/** Every morning from the start of the watch up to and including `date`. */
export function mornings(intent: WatchIntent, upTo: string): Morning[] {
  const out: Morning[] = [];
  let spoken = 0;
  const total = daysBetween(WATCH_START, upTo);
  for (let i = 0; i <= total; i += 1) {
    const m = checkMorning(intent, shift(WATCH_START, i), spoken);
    if (m.verdict !== "silent") spoken += 1;
    out.push(m);
  }
  return out;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The two scripted mornings the demo jumps to. */
export const PROPOSAL_DATE = "2026-09-22";
export const QUIET_DATE = "2026-09-23";
