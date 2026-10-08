import { itineraryFor } from "@/lib/assistant/itinerary";
import { priceOf } from "@/lib/assistant/price";
import { AIRPORTS, formatFare, inventory, type AirportCode } from "@/lib/journey/flights";
import { SQUAD, TRIP_NUDGE } from "@/lib/journey/script";
import { FRIENDS, firstName, listNames } from "@/lib/group/group";
import { WILL, dayMonth, willDraft } from "@/lib/demo/personas";

/**
 * The companion's opening nudge: what it noticed, whether it may speak, and
 * what it says. Will has typed nothing. Three signals, each one the phone or
 * the app already has with permission, and a budget of one unasked message a
 * quarter. Any one of "not this time", "don't suggest trips" or the budget
 * being spent keeps it silent; the panel shows the silence as a step.
 */
export type NudgeState = { declined: boolean; never: boolean; spoken: number };

export type Nudge = {
  verdict: "speak" | "silent";
  /** Why it stayed quiet, when it did. */
  quiet: string | null;
  /** The headline on the card. */
  headline: string;
  /** All-in per person, from the week it would build. */
  priceEach: number;
  /** The free week, as dates. */
  week: { out: string; back: string };
  /** "Why I spoke", as sentences the card prints and the panel repeats. */
  why: string[];
  /** The same signals, as facts for the panel. */
  facts: string[];
  squad: string[];
};

export function tripNudge(state: NudgeState): Nudge {
  const draft = willDraft();
  const me = WILL.travellers[0]?.name ?? "Will Parker";
  const itinerary = itineraryFor(draft, me);
  const first = itinerary.out?.flight;
  const place = AIRPORTS[SQUAD.destination as AirportCode]?.city ?? SQUAD.destination;
  const hub =
    AIRPORTS[(draft.stops.value[0]?.code ?? "SAW") as AirportCode]?.city ?? "Istanbul";
  const light = inventory(
    SQUAD.origin,
    draft.stops.value[0]?.code ?? "SAW",
    draft.departDate.value,
  )[0]?.fares.light;
  const mates = FRIENDS.map((f) => f.name);
  const back = draft.returnDate.value ?? draft.departDate.value;
  const why = [
    `You searched ${place} ${TRIP_NUDGE.searches === 2 ? "twice" : `${TRIP_NUDGE.searches} times`} in ${TRIP_NUDGE.searchedIn} and didn't book.`,
    `${dayMonth(draft.departDate.value)} to ${dayMonth(back)} is free in your calendar, and in ${listNames(mates)}'s shared one, with permission.`,
    `May fares to ${hub} are ${formatFare(light ?? 0)} GBP LIGHT on the ${first?.departs ?? "06:10"}, the lowest since ${TRIP_NUDGE.lowSince}.`,
  ];
  const quiet = state.never
    ? "Told never to suggest trips."
    : state.declined
      ? "Told not this time; quiet until the next free week."
      : state.spoken >= TRIP_NUDGE.budget
        ? `Budget spent: ${TRIP_NUDGE.budget} unasked message a quarter.`
        : null;
  return {
    verdict: quiet === null ? "speak" : "silent",
    quiet,
    headline: `Balloons in ${place} with ${listNames(mates)}?`,
    priceEach: priceOf(draft),
    week: { out: draft.departDate.value, back },
    why,
    facts: [
      `Searches: ${TRIP_NUDGE.searches}, ${TRIP_NUDGE.searchedIn}`,
      `Free: ${dayMonth(draft.departDate.value)} to ${dayMonth(back)}, all three`,
      `${SQUAD.origin} to ${draft.stops.value[0]?.code ?? "SAW"} LIGHT ${formatFare(light ?? 0)}`,
      `Budget ${Math.min(state.spoken + 1, TRIP_NUDGE.budget)} of ${TRIP_NUDGE.budget}`,
    ],
    squad: [firstName(me), ...mates.map(firstName)],
  };
}
