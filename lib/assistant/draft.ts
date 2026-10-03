import type { FareFamily } from "@/lib/journey/flights";

/**
 * The trip as it stands, field by field, with where each value came from.
 *
 * Provenance per field is the point of this screen. An assistant that fills in
 * nine things and shows you nine answers is asking for blind trust; one that
 * says which three you told it, which five it inferred and why, and which one it
 * is still guessing at, is showing its working.
 *
 * It is also what makes "edit anything easily" tractable: a field knows whether
 * changing it contradicts something the passenger said or merely overrides a
 * guess.
 */

export type Source =
  /** The passenger typed or said it. */
  | "said"
  /** Remembered from previous bookings of this kind. */
  | "profile"
  /** Inferred from the rest of the trip. */
  | "predicted";

export type Field<T> = {
  value: T;
  source: Source;
  /** One sentence, shown under the field. Always present for predictions. */
  why: string;
  /** Set when the assistant is not confident and wants a look. */
  uncertain?: boolean;
};

export type TripDraft = {
  origin: Field<string>;
  destination: Field<string>;
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

/** The order the trip card renders in, and the order a human would expect. */
export const FIELD_ORDER: DraftKey[] = [
  "origin",
  "destination",
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
  departDate: "Out",
  returnDate: "Back",
  party: "Travellers",
  package: "Fare",
  checkedKg: "Checked bag",
  cabinBag: "Cabin bag",
  seating: "Seats",
  flexibility: "Flexibility",
};

export function countBySource(draft: TripDraft): Record<Source, number> {
  const counts: Record<Source, number> = { said: 0, profile: 0, predicted: 0 };
  for (const key of FIELD_ORDER) {
    counts[draft[key].source] += 1;
  }
  return counts;
}

/** Anything the assistant flagged as a guess worth checking. */
export function uncertainFields(draft: TripDraft): DraftKey[] {
  return FIELD_ORDER.filter((key) => draft[key].uncertain === true);
}
