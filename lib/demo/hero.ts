import { PROFILES, type Profile } from "@/lib/assistant/profiles";
import { buildDraft } from "@/lib/assistant/understand";
import type { TripDraft } from "@/lib/assistant/draft";

/**
 * The one sentence the whole demo starts from, and the trip it becomes.
 *
 * Any screen that can be opened cold (the checkout, the group, the invitee's
 * ticket) needs a trip to show, and it must be the same trip the home screen
 * would have built from this sentence. So the sentence lives here, once.
 */
export const HERO_PROMPT = "Stansted to Izmir on 19 October, back on the 25th, checking a bag";

export const FAMILY: Profile = PROFILES.find((p) => p.id === "family") ?? PROFILES[0]!;

export function heroDraft(): TripDraft {
  return buildDraft(HERO_PROMPT, FAMILY);
}

/*
 * Dates and money are formatted by hand, not through Intl. Node and Chromium
 * ship different ICU builds and disagree on en-GB ("Mon 19 Oct" against
 * "Mon, 19 Oct", "Sep" against "Sept"), which is a hydration error on every
 * screen that prints a date.
 */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const LONG_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function parts(iso: string): { day: number; month: number; weekday: number } {
  const d = new Date(`${iso}T00:00:00Z`);
  return { day: d.getUTCDate(), month: d.getUTCMonth(), weekday: d.getUTCDay() };
}

/** "Mon 19 Oct", the way the pass prints a date. */
export function shortDate(iso: string): string {
  const { day, month, weekday } = parts(iso);
  return `${DAYS[weekday]} ${day} ${MONTHS[month]}`;
}

/** "Monday 19 October", for a lock screen. */
export function longDate(iso: string): string {
  const { day, month, weekday } = parts(iso);
  return `${LONG_DAYS[weekday]} ${day} ${LONG_MONTHS[month]}`;
}

/** "19 Oct". */
export function dayMonth(iso: string): string {
  const { day, month } = parts(iso);
  return `${day} ${MONTHS[month]}`;
}

/** "Mon 19", for a strip of days. */
export function dayOfWeek(iso: string): { letter: string; day: number } {
  const { day, weekday } = parts(iso);
  return { letter: (DAYS[weekday] ?? "")[0] ?? "", day };
}

/** "19–25 Oct", for a card title. */
export function dateSpan(from: string, to: string | null): string {
  const a = parts(from);
  if (to === null) return `${a.day} ${MONTHS[a.month]}`;
  const b = parts(to);
  if (a.month === b.month) return `${a.day}–${b.day} ${MONTHS[b.month]}`;
  return `${a.day} ${MONTHS[a.month]} – ${b.day} ${MONTHS[b.month]}`;
}

/** Thousands-grouped money, for a lock screen: "1,224.66". */
export function money(amount: number): string {
  return group(amount.toFixed(2));
}

/** Thousands-grouped, with decimals only when there are some: "1,300" or "1,224.66". */
export function grouped(amount: number): string {
  return group(Number.isInteger(amount) ? String(amount) : amount.toFixed(2));
}

function group(fixed: string): string {
  const [whole = "", fraction] = fixed.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? withCommas : `${withCommas}.${fraction}`;
}
