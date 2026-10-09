import type { FareFamily } from "@/lib/journey/flights";

/**
 * The trip as it stands, field by field, with where each value came from.
 *
 * Provenance per field is the point of the screen. A companion that fills in
 * ten things and shows ten answers is asking for blind trust; one that says
 * which three you told it, which five it inferred and why, and which one it is
 * still guessing at, is showing its working.
 *
 * It is also what makes "change anything" tractable: a field knows whether
 * changing it contradicts something the passenger said or overrides a guess.
 */

export type Source =
  /** The passenger typed or said it. */
  | "said"
  /** Remembered from previous bookings of this kind. */
  | "profile"
  /** Inferred from the rest of the trip. */
  | "predicted"
  /** Carried over from someone else's booking: the organiser of a group. */
  | "shared";

export type Field<T> = {
  value: T;
  source: Source;
  /** One sentence, shown under the field. Always present for predictions. */
  why: string;
  /** Set when the companion is not confident and wants a look. */
  uncertain?: boolean;
  /** For a shared value, whose booking it came from. */
  from?: string;
};

/** A place on a multi-stop route, and how long is spent there. */
export type Stop = { code: string; nights: number };

export type TripDraft = {
  origin: Field<string>;
  destination: Field<string>;
  /**
   * Stops between the outbound and the return, in order, for a multi-stop
   * trip. Empty for a simple return. The legs are derived: origin to the first
   * stop on the outbound date, stop to stop as the nights run out, and the last
   * stop home on the return date.
   */
  stops: Field<Stop[]>;
  departDate: Field<string>;
  returnDate: Field<string | null>;
  party: Field<{ adults: number; children: number; infants: number }>;
  package: Field<FareFamily>;
  checkedKg: Field<0 | 12 | 20 | 25>;
  cabinBag: Field<boolean>;
  seating: Field<"aisle" | "window" | "together" | "none">;
  flexibility: Field<"none" | "change" | "full">;
  /** Non-fatal notes: things worth saying that are not a field. */
  notes: string[];
};

export type DraftKey = Exclude<keyof TripDraft, "notes">;

/** The order the change panel renders in, and the order a human would expect. */
export const FIELD_ORDER: DraftKey[] = [
  "origin",
  "destination",
  "stops",
  "departDate",
  "returnDate",
  "party",
  "package",
  "checkedKg",
  "cabinBag",
  "seating",
  "flexibility",
];

export const FIELD_LABELS: Record<DraftKey, string> = {
  origin: "From",
  destination: "To",
  stops: "Route",
  departDate: "Out",
  returnDate: "Back",
  party: "Travellers",
  package: "Fare",
  checkedKg: "Checked bag",
  cabinBag: "Cabin bag",
  seating: "Seats",
  flexibility: "Flexibility",
};

/** The keys a given draft actually shows: a simple return has no route row. */
export function visibleKeys(draft: TripDraft): DraftKey[] {
  return FIELD_ORDER.filter((key) => key !== "stops" || draft.stops.value.length > 0);
}

export function countBySource(
  draft: TripDraft,
  except: DraftKey[] = [],
): Record<Source, number> {
  const counts: Record<Source, number> = { said: 0, profile: 0, predicted: 0, shared: 0 };
  for (const key of visibleKeys(draft)) {
    if (except.includes(key)) continue;
    counts[draft[key].source] += 1;
  }
  return counts;
}

/** Anything the companion flagged as a guess worth checking. */
export function uncertainFields(draft: TripDraft): DraftKey[] {
  return visibleKeys(draft).filter((key) => draft[key].uncertain === true);
}

/** A simple return trip has an empty route. */
export const NO_STOPS: Field<Stop[]> = { value: [], source: "said", why: "" };
