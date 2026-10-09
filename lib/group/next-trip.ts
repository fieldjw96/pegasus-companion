import type { TripDraft } from "@/lib/assistant/draft";
import { bestWeekIn } from "@/lib/assistant/understand";
import { AIRPORTS, inventory, type AirportCode } from "@/lib/journey/flights";
import { NEXT_TRIP } from "@/lib/journey/script";
import { shift } from "@/lib/demo/personas";

/**
 * The fare drop the squad hears about first, as figures.
 *
 * Everything the card says is computed here from the pinned routes: this
 * week's LIGHT return, last week's, the drop as a percentage, and what that
 * is worth to three people. The card prints the sentences; it never does the
 * sums.
 */
export type FareDrop = {
  city: string;
  /** The day the card appears: so long after the squad got home. */
  when: string;
  /** The weekend it is priced for. */
  out: string;
  back: string;
  nights: number;
  /** LIGHT return per person, this week and last. */
  nowEach: number;
  wasEach: number;
  /** Whole percent, rounded. */
  dropPercent: number;
  /** Per person, and for the squad. */
  savingEach: number;
  savingSquad: number;
  squad: number;
  flights: { out: string; back: string };
};

const round = (n: number) => Math.round(n * 100) / 100;

export function fareDrop(draft: TripDraft, squad: number): FareDrop {
  const out = bestWeekIn(NEXT_TRIP.month);
  const back = shift(out, NEXT_TRIP.nights);
  const outbound = inventory(NEXT_TRIP.origin, NEXT_TRIP.destination, out)[0];
  const inbound = inventory(NEXT_TRIP.destination, NEXT_TRIP.origin, back)[0];
  const nowEach = round((outbound?.fares.light ?? 0) + (inbound?.fares.light ?? 0));
  const wasEach = round(NEXT_TRIP.lastWeek.out + NEXT_TRIP.lastWeek.back);
  const savingEach = round(wasEach - nowEach);
  return {
    city: AIRPORTS[NEXT_TRIP.destination as AirportCode]?.city ?? NEXT_TRIP.destination,
    when: shift(draft.returnDate.value ?? draft.departDate.value, NEXT_TRIP.daysAfter),
    out,
    back,
    nights: NEXT_TRIP.nights,
    nowEach,
    wasEach,
    dropPercent: Math.round((savingEach / wasEach) * 100),
    savingEach,
    savingSquad: round(savingEach * squad),
    squad,
    flights: {
      out: `${outbound?.flightNo ?? "PC 1180"} ${outbound?.departs ?? "07:15"}`,
      back: `${inbound?.flightNo ?? "PC 1181"} ${inbound?.departs ?? "14:30"}`,
    },
  };
}
