import type { TripDraft } from "@/lib/assistant/draft";
import { FRIENDS } from "@/lib/group/group";
import { HOSTEL } from "@/lib/journey/script";

/**
 * The one stay the companion offers, as figures.
 *
 * The nights are the ones on the ticket for the balloons stop, the people are
 * the squad, the rate is pinned. The card prints the sentences; the sums are
 * here, and the commission the column counts is the pinned rate on the total.
 */
export type Stay = {
  name: string;
  town: string;
  room: string;
  nights: number;
  people: number;
  perNight: number;
  /** Per person for the stay, and for the squad. */
  each: number;
  total: number;
  /** What Pegasus earns on the booking. */
  commission: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

export function stayFor(draft: TripDraft): Stay {
  const stop = draft.stops.value.find((s) => s.code === HOSTEL.stop);
  const nights = stop?.nights ?? HOSTEL.fallbackNights;
  const people = 1 + FRIENDS.length;
  const each = round(HOSTEL.perNight * nights);
  const total = round(each * people);
  return {
    name: HOSTEL.name,
    town: HOSTEL.town,
    room: HOSTEL.room,
    nights,
    people,
    perNight: HOSTEL.perNight,
    each,
    total,
    commission: round(total * HOSTEL.commission),
  };
}
