import { inventory, type Flight } from "@/lib/journey/flights";
import { HERO, isHeroRoute } from "@/lib/journey/script";
import type { TripDraft } from "./draft";

/**
 * Turn a drafted trip into the things a boarding pass actually prints.
 *
 * A pass is not a search result. It carries a flight number, a gate, a seat, a
 * boarding time and a reference, and a mock that leaves those blank looks like a
 * wireframe no matter how well it is drawn. So they are derived here —
 * deterministically, from the flight the pricer already chose — rather than
 * invented in the component where a re-render would reshuffle them.
 *
 * Deterministic matters more than it sounds. The seat number on the screenshot
 * in the deck has to be the seat number on stage.
 */

export type Leg = {
  flight: Flight;
  /** One per fare-paying passenger, in the order they are listed. */
  seats: string[];
  gate: string;
  /** Thirty minutes before departure, which is what Pegasus prints. */
  boards: string;
};

export type Itinerary = {
  out: Leg | null;
  back: Leg | null;
  /** Six characters, the shape of a real PNR. */
  reference: string;
};

/** FNV-1a. Same hash the inventory uses, so nothing here needs a seed passed in. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** I, O, 0 and 1 are left out, the way airlines leave them out. */
const PNR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function referenceFor(draft: TripDraft, owner?: string): string {
  // The hero trip's references are pinned, so the one on the ticket is the one
  // in the Live Activity and the one on the friend's confirmation.
  if (
    isHeroRoute(
      draft.origin.value,
      draft.destination.value,
      draft.departDate.value,
      draft.returnDate.value,
    )
  ) {
    return owner === undefined ? HERO.reference : HERO.inviteeReference;
  }
  let h = hash(
    [
      draft.origin.value,
      draft.destination.value,
      draft.departDate.value,
      draft.returnDate.value ?? "ow",
    ].join("|"),
  );
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += PNR_ALPHABET[h % PNR_ALPHABET.length];
    h = Math.floor(h / PNR_ALPHABET.length) + hash(out);
  }
  return out;
}

const ROWS = 30;

/**
 * Seats for one leg.
 *
 * The preference is honoured where it can be: a window traveller gets A or F, an
 * aisle traveller gets C or D, and a party that needs to sit together gets a
 * consecutive block in one row. That last case is the whole reason the family
 * profile exists, so the pass has to show it rather than assert it.
 */
export function seatsFor(
  flight: Flight,
  people: number,
  preference: TripDraft["seating"]["value"],
): string[] {
  if (preference === "none") return [];

  // The family's block on the hero flights is pinned: the seat on the pass is
  // the seat the friend's offer sits beside.
  if (flight.flightNo === "PC 1474" || flight.flightNo === "PC 1355") {
    if (preference === "together" && people <= HERO.seats.length) {
      return HERO.seats.slice(0, people);
    }
  }

  const h = hash(flight.id);
  const row = 4 + (h % (ROWS - 4));
  const letters = "ABCDEF";

  if (preference === "window") {
    const side = h % 2 === 0 ? "A" : "F";
    const rest = side === "A" ? "BC" : "ED";
    return Array.from({ length: people }, (_, i) =>
      i === 0 ? `${row}${side}` : `${row}${rest[i - 1] ?? letters[i] ?? "C"}`,
    );
  }

  if (preference === "aisle") {
    const side = h % 2 === 0 ? "C" : "D";
    const rest = side === "C" ? "BA" : "EF";
    return Array.from({ length: people }, (_, i) =>
      i === 0 ? `${row}${side}` : `${row}${rest[i - 1] ?? letters[i] ?? "B"}`,
    );
  }

  // Together: one block, starting at A so the whole party is on one side where
  // it fits, which is what "together" means to someone travelling with a child.
  const start = people > 3 ? 0 : h % 2 === 0 ? 0 : 3;
  return Array.from(
    { length: people },
    (_, i) => `${row}${letters[(start + i) % letters.length] ?? "A"}`,
  );
}

function legFor(
  flight: Flight | undefined,
  people: number,
  preference: TripDraft["seating"]["value"],
): Leg | null {
  if (flight === undefined) return null;
  const h = hash(`gate|${flight.id}`);
  const pinned = flight.flightNo === "PC 1474" || flight.flightNo === "PC 1355";
  return {
    flight,
    seats: seatsFor(flight, people, preference),
    gate: pinned ? HERO.gate : `${"AB"[h % 2] ?? "A"}${1 + (h % 24)}`,
    boards: minusMinutes(flight.departs, 30),
  };
}

export function minusMinutes(time: string, minutes: number): string {
  const [h = "0", m = "0"] = time.split(":");
  const total = (Number(h) * 60 + Number(m) - minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The whole itinerary for a draft.
 *
 * The outbound flight is `inventory(...)[0]`, which is the same flight the
 * pricer values. Picking a different one here would put a price on the screen
 * that did not belong to the flight printed above it.
 */
export function itineraryFor(draft: TripDraft, owner?: string): Itinerary {
  const people = draft.party.value.adults + draft.party.value.children;
  const preference = draft.seating.value;

  const out = legFor(
    inventory(draft.origin.value, draft.destination.value, draft.departDate.value)[0],
    people,
    preference,
  );

  const returnDate = draft.returnDate.value;
  const back =
    returnDate === null
      ? null
      : legFor(
          inventory(draft.destination.value, draft.origin.value, returnDate)[0],
          people,
          preference,
        );

  return { out, back, reference: referenceFor(draft, owner) };
}

/** Nights away, for the one line on the pass that a person actually checks. */
export function nights(draft: TripDraft): number | null {
  const back = draft.returnDate.value;
  if (back === null) return null;
  const a = Date.parse(`${draft.departDate.value}T00:00:00Z`);
  const b = Date.parse(`${back}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}
