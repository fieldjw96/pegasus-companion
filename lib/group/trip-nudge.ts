import { itineraryFor } from "@/lib/assistant/itinerary";
import { priceOf } from "@/lib/assistant/price";
import { AIRPORTS, formatFare, inventory, type AirportCode } from "@/lib/journey/flights";
import { SQUAD, TRIP_NUDGE } from "@/lib/journey/script";
import { FRIENDS, firstName, listNames } from "@/lib/group/group";
import { WILL, dayMonth, willDraft } from "@/lib/demo/personas";
import type { TripDraft } from "@/lib/assistant/draft";

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
    `You searched for ${TRIP_NUDGE.searchedFor} ${TRIP_NUDGE.searches === 2 ? "twice" : `${TRIP_NUDGE.searches} times`} in ${TRIP_NUDGE.searchedIn} and didn't book.`,
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
      `Searches: ${TRIP_NUDGE.searchedFor}, ${TRIP_NUDGE.searches} in ${TRIP_NUDGE.searchedIn}`,
      `Free: ${dayMonth(draft.departDate.value)} to ${dayMonth(back)}, all three`,
      `${SQUAD.origin} to ${draft.stops.value[0]?.code ?? "SAW"} LIGHT ${formatFare(light ?? 0)}`,
      `Budget ${Math.min(state.spoken + 1, TRIP_NUDGE.budget)} of ${TRIP_NUDGE.budget}`,
    ],
    squad: [firstName(me), ...mates.map(firstName)],
  };
}

/**
 * The week the nudge builds when Will says yes. The same trip the sentence
 * would build, to the penny, but every field says where it came from: the
 * place from his searches, the week from the calendars, the bag from what
 * the searches were for. Yes on the card is what he said.
 */
export function nudgeDraft(): TripDraft {
  const draft = willDraft();
  const said = <T>(value: T, why: string) => ({ value, source: "said" as const, why });
  return {
    ...draft,
    destination: said(
      draft.destination.value,
      `From your ${TRIP_NUDGE.searchedIn} searches for ${TRIP_NUDGE.searchedFor}; you said yes.`,
    ),
    departDate: said(
      draft.departDate.value,
      `The week that is free in your calendar and in ${listNames(FRIENDS.map((f) => f.name))}'s; you said yes.`,
    ),
    returnDate: said(draft.returnDate.value, "The free week ends on the Saturday."),
    package: {
      ...draft.package,
      why: `Your searches were for ${TRIP_NUDGE.searchedFor}: a backpack, and a 40L pack won't fit under the seat, which is all LIGHT allows. SAVER adds an 8 kg cabin bag and 25 kg checked for less than the bag costs at the airport.`,
    },
    checkedKg: {
      ...draft.checkedKg,
      why: "Included in SAVER, which the backpack needs anyway.",
    },
  };
}
