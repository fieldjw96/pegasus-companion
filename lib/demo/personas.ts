import { PROFILES, profileById, type Profile } from "@/lib/assistant/profiles";
import { buildDraft } from "@/lib/assistant/understand";
import type { TripDraft } from "@/lib/assistant/draft";
import { usualTrip } from "@/lib/moments/moments";

/**
 * The two people the demo follows, and the trips each of them starts from.
 *
 * Any screen that can be opened cold needs a trip to show, and it must be the
 * same trip the home screen would have built. So the opening sentence and the
 * usual trip live here, once.
 */
export type Persona = Profile["id"];

export const WILL: Profile = profileById("will");
export const EMRE: Profile = profileById("emre");
export { PROFILES };

export const WILL_PROMPT = "Balloons in Cappadocia, backpacking, a week in May";

export function willDraft(): TripDraft {
  return buildDraft(WILL_PROMPT, WILL);
}

export function emreDraft(): TripDraft {
  return usualTrip(EMRE);
}

export function draftFor(persona: Persona): TripDraft {
  return persona === "emre" ? emreDraft() : willDraft();
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

function parts(iso: string): { day: number; month: number; weekday: number; year: number } {
  const d = new Date(`${iso}T00:00:00Z`);
  return {
    day: d.getUTCDate(),
    month: d.getUTCMonth(),
    weekday: d.getUTCDay(),
    year: d.getUTCFullYear(),
  };
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

/** "19 October". */
export function dayLongMonth(iso: string): string {
  const { day, month } = parts(iso);
  return `${day} ${LONG_MONTHS[month]}`;
}

/** "Monday", on its own. */
export function weekdayName(iso: string): string {
  return LONG_DAYS[parts(iso).weekday] ?? "";
}

/** "M 19", for a strip of days. */
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
