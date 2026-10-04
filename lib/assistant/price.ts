import { BAGGAGE_PRICES } from "@/lib/journey/baggage";
import { FARE_RULES, inventory } from "@/lib/journey/flights";
import type { TripDraft } from "./draft";

/**
 * Price a drafted trip.
 *
 * Fares come from the same deterministic inventory the rest of the mock uses,
 * so the number here matches what the old funnel would have charged for the
 * same booking. That equivalence is the point: the comparison between the two
 * only means anything if both are pricing the same thing.
 *
 * Shared rather than private to one screen, because each design direction
 * prices the same draft and three copies of this would drift within a day.
 */
export function priceOf(draft: TripDraft): number {
  const flights = inventory(
    draft.origin.value,
    draft.destination.value,
    draft.departDate.value,
  );
  const flight = flights[0];
  if (flight === undefined) return 0;

  const people = draft.party.value.adults + draft.party.value.children;
  const base = flight.fares[draft.package.value] ?? 0;

  // Only charge for baggage the chosen fare does not already include.
  const inclusions = FARE_RULES[draft.package.value].inclusions;
  const includedKg = inclusions.some((i) => /30 Kg/.test(i.text))
    ? 30
    : inclusions.some((i) => /25 Kg/.test(i.text))
      ? 25
      : 0;

  let sum = base * people;
  if (draft.checkedKg.value > includedKg) {
    sum +=
      (draft.checkedKg.value <= 12 ? BAGGAGE_PRICES.checked12 : BAGGAGE_PRICES.checked20) *
      people;
  }
  if (draft.cabinBag.value && draft.package.value === "light") {
    sum += BAGGAGE_PRICES.cabin * people;
  }
  if (draft.flexibility.value !== "none" && draft.package.value === "light") {
    sum += 6 * people;
  }

  const legs = draft.returnDate.value === null ? 1 : 2;
  return Math.round(sum * legs * 100) / 100;
}
