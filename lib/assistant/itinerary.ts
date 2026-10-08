import { inventory, type Flight } from "@/lib/journey/flights";
import { HOME, SQUAD, isScriptedRoute, ownerOf } from "@/lib/journey/script";
import type { TripDraft } from "./draft";

/**
 * Turn a drafted trip into the things a boarding pass actually prints.
 *
 * A pass is not a search result. It carries a flight number, a gate, a seat, a
 * boarding time and a reference, and a mock that leaves those blank looks like a
 * wireframe no matter how well it is drawn. So they are derived here,
 * deterministically, from the flight the pricer already chose, rather than
 * invented in the component where a re-render would reshuffle them.
 *
 * A trip is a list of legs. A simple return has two; Will's week has four.
 */

export type LegPlan = { from: string; to: string; date: string };

export type Leg = LegPlan & {
  flight: Flight;
  /** One per fare-paying passenger, in the order they are listed. */
  seats: string[];
  gate: string;
  /** Thirty minutes before departure, which is what Pegasus prints. */
  boards: string;
};

export type Itinerary = {
  legs: Leg[];
  /** The first and last legs, for screens that only have room for those. */
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

export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The legs a draft implies, before any flight is looked up. */
export function legPlan(draft: TripDraft): LegPlan[] {
  const stops = draft.stops.value;
  if (stops.length === 0) {
    const legs: LegPlan[] = [
      { from: draft.origin.value, to: draft.destination.value, date: draft.departDate.value },
    ];
    if (draft.returnDate.value !== null) {
      legs.push({
        from: draft.destination.value,
        to: draft.origin.value,
        date: draft.returnDate.value,
      });
    }
    return legs;
  }
  const legs: LegPlan[] = [];
  let from = draft.origin.value;
  let date = draft.departDate.value;
  for (const stop of stops) {
    legs.push({ from, to: stop.code, date });
    from = stop.code;
    date = shiftDate(date, stop.nights);
  }
  if (draft.returnDate.value !== null) {
    legs.push({ from, to: draft.origin.value, date: draft.returnDate.value });
  }
  return legs;
}

/**
 * The booking reference. Pinned for the demo's people on the demo's routes,
 * so the one on the ticket is the one in the notification and the deck.
 */
export function referenceFor(draft: TripDraft, owner?: string): string {
  const who = ownerOf(owner);
  const first = legPlan(draft)[0];
  if (first !== undefined && isScriptedRoute(first.from, first.to)) {
    if (first.from === HOME.origin && first.to === HOME.destination) return HOME.reference;
    if (who !== null && who !== "emre") return SQUAD.references[who];
    if (who === null) return SQUAD.references.will;
  }
  let h = hash(
    [
      draft.origin.value,
      draft.destination.value,
      draft.departDate.value,
      draft.returnDate.value ?? "ow",
      owner ?? "",
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
 * On the demo's routes the seats are pinned so the squad sits in 14A, 14B
 * and 14C and Emre in his usual 3A. Elsewhere the preference is honoured where
 * it can be: a window traveller gets A or F, an aisle traveller C or D, and a
 * party that needs to sit together gets a consecutive block in one row.
 */
export function seatsFor(
  flight: Flight,
  people: number,
  preference: TripDraft["seating"]["value"],
  owner?: string,
): string[] {
  if (preference === "none") return [];

  if (isScriptedRoute(flight.origin, flight.destination)) {
    const who = ownerOf(owner);
    if (flight.origin === HOME.origin || flight.destination === HOME.origin) {
      if (flight.origin === HOME.destination || flight.destination === HOME.destination) {
        return Array.from({ length: people }, (_, i) =>
          i === 0 ? HOME.seat : `${3 + i}${HOME.seat.slice(-1)}`,
        );
      }
    }
    const letters = ["A", "B", "C", "D", "E", "F"];
    const start = who === "archie" ? 1 : who === "jess" ? 2 : 0;
    return Array.from(
      { length: people },
      (_, i) => `${SQUAD.row}${letters[(start + i) % letters.length] ?? "A"}`,
    );
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

  const start = people > 3 ? 0 : h % 2 === 0 ? 0 : 3;
  return Array.from(
    { length: people },
    (_, i) => `${row}${letters[(start + i) % letters.length] ?? "A"}`,
  );
}

function legFor(
  plan: LegPlan,
  people: number,
  preference: TripDraft["seating"]["value"],
  owner?: string,
): Leg | null {
  const flight = inventory(plan.from, plan.to, plan.date)[0];
  if (flight === undefined) return null;
  const h = hash(`gate|${flight.id}`);
  const pinned =
    plan.from === SQUAD.origin && plan.to === "SAW"
      ? SQUAD.gate
      : plan.from === HOME.origin && plan.to === HOME.destination
        ? HOME.gate
        : null;
  return {
    ...plan,
    flight,
    seats: seatsFor(flight, people, preference, owner),
    gate: pinned ?? `${"AB"[h % 2] ?? "A"}${1 + (h % 24)}`,
    boards: minusMinutes(flight.departs, 30),
  };
}

export function minusMinutes(time: string, minutes: number): string {
  const [h = "0", m = "0"] = time.split(":");
  const total = (Number(h) * 60 + Number(m) - minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The whole itinerary for a draft. Each leg's flight is `inventory(...)[0]`,
 * the same flight the pricer values; picking a different one here would put a
 * price on the screen that did not belong to the flight printed above it.
 */
export function itineraryFor(draft: TripDraft, owner?: string): Itinerary {
  const people = draft.party.value.adults + draft.party.value.children;
  const preference = draft.seating.value;
  const legs = legPlan(draft)
    .map((plan) => legFor(plan, people, preference, owner))
    .filter((leg): leg is Leg => leg !== null);
  return {
    legs,
    out: legs[0] ?? null,
    back: legs.length > 1 ? (legs[legs.length - 1] ?? null) : null,
    reference: referenceFor(draft, owner),
  };
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
