import { BAGGAGE_PRICES } from "@/lib/journey/baggage";
import { FARE_RULES, inventory } from "@/lib/journey/flights";
import type { TripDraft } from "./draft";

/**
 * Price a drafted trip, and show the arithmetic.
 *
 * Fares come from the same deterministic inventory the rest of the mock uses,
 * so the number here matches what the old funnel would have charged for the
 * same booking. That equivalence is the point: the comparison between the two
 * only means anything if both are pricing the same thing.
 *
 * `breakdown` is the real function and `priceOf` is its total. They cannot
 * disagree, which is the whole reason it is written this way round: the moment
 * a screen itemises a price, a separately-computed total starts drifting from
 * the lines above it.
 */

export type PriceLine = {
  label: string;
  /** The working, in words. "41.00 x 3 travellers x 2 legs". */
  detail: string;
  amount: number;
};

export type PriceBreakdown = {
  lines: PriceLine[];
  /** What the chosen fare already covers, so a zero is never left unexplained. */
  included: string[];
  total: number;
};

/**
 * The share of a quoted fare presented as tax rather than fare.
 *
 * Invented, and labelled as such on screen. It is here because a breakdown with
 * one line in it is not a breakdown, and because a person reading a ticket
 * expects to see tax separated out. It changes no total: the two lines are
 * defined to add back to the price the search quoted.
 */
const TAX_SHARE = 0.18;

/** Checked allowance the fare already includes, read off its own inclusion list. */
function includedKgOf(family: TripDraft["package"]["value"]): number {
  const inclusions = FARE_RULES[family].inclusions;
  if (inclusions.some((i) => i.text.includes("30 Kg"))) return 30;
  if (inclusions.some((i) => i.text.includes("25 Kg"))) return 25;
  return 0;
}

export function breakdown(draft: TripDraft): PriceBreakdown {
  const flights = inventory(
    draft.origin.value,
    draft.destination.value,
    draft.departDate.value,
  );
  const flight = flights[0];
  if (flight === undefined) return { lines: [], included: [], total: 0 };

  const people = draft.party.value.adults + draft.party.value.children;
  const legs = draft.returnDate.value === null ? 1 : 2;
  const family = draft.package.value;
  const base = flight.fares[family] ?? 0;

  const who = `${people} traveller${people === 1 ? "" : "s"}`;
  const trips = legs === 1 ? "one way" : "2 legs";

  // The quoted fare, split the way a ticket shows it. The split is a mock, not a
  // real tax table — but the two lines add back to the price that was quoted at
  // search, so the total is untouched by showing it this way.
  const taxPerPerson = Math.round(base * TAX_SHARE * 100) / 100;
  const farePerPerson = base - taxPerPerson;
  const lines: PriceLine[] = [
    {
      label: `${FARE_RULES[family].label} flight fare`,
      detail: `${farePerPerson.toFixed(2)} x ${who} x ${trips}`,
      amount: farePerPerson * people * legs,
    },
    {
      label: "Taxes, fees and charges",
      detail: `${taxPerPerson.toFixed(2)} x ${who} x ${trips}, already inside the quoted fare`,
      amount: taxPerPerson * people * legs,
    },
  ];

  // Only charge for baggage the chosen fare does not already include. This is
  // the arithmetic the live app performs and never shows.
  const includedKg = includedKgOf(family);
  const checkedKg = draft.checkedKg.value;
  if (checkedKg > includedKg) {
    const unit = checkedKg <= 12 ? BAGGAGE_PRICES.checked12 : BAGGAGE_PRICES.checked20;
    lines.push({
      label: `${checkedKg} kg checked baggage`,
      detail: `${unit.toFixed(2)} x ${who} x ${trips}`,
      amount: unit * people * legs,
    });
  }

  if (draft.cabinBag.value && family === "light") {
    lines.push({
      label: "Cabin baggage",
      detail: `${BAGGAGE_PRICES.cabin.toFixed(2)} x ${who} x ${trips}, because LIGHT excludes it`,
      amount: BAGGAGE_PRICES.cabin * people * legs,
    });
  }

  if (draft.flexibility.value !== "none" && family === "light") {
    lines.push({
      label: "Changeable dates",
      detail: `6.00 x ${who} x ${trips}`,
      amount: 6 * people * legs,
    });
  }

  const included = FARE_RULES[family].inclusions.map((i) =>
    i.detail === undefined ? i.text : `${i.text} ${i.detail}`,
  );

  // Rounded once, at the end, off the per-leg subtotal. Rounding each line and
  // adding them up puts a penny between the itemisation and the total.
  const perLeg = lines.reduce((sum, line) => sum + line.amount / legs, 0);
  return { lines, included, total: Math.round(perLeg * legs * 100) / 100 };
}

export function priceOf(draft: TripDraft): number {
  return breakdown(draft).total;
}

/**
 * What this identical trip would have cost bought the funnel's way: LIGHT taken
 * first, then the same baggage added at the à la carte price on the baggage
 * screen instead of arriving inside a better fare.
 *
 * Returns null when there is nothing to claim, which has to be allowed to
 * happen. A companion that always finds a saving is a discount, not an opinion.
 */
export function naivePath(draft: TripDraft): { paid: number; saved: number } | null {
  if (draft.checkedKg.value === 0) return null;
  if (draft.package.value === "light") return null;

  const asLight: TripDraft = {
    ...draft,
    package: {
      value: "light",
      source: "predicted",
      why: "The fare the funnel opens on.",
    },
  };
  const paid = breakdown(asLight).total;
  const saved = Math.round((paid - breakdown(draft).total) * 100) / 100;
  return saved <= 0 ? null : { paid, saved };
}

/**
 * A breakdown with one more line on it: a seat bought on top of the fare.
 * Kept out of `breakdown` because the seat is not part of the draft; it is an
 * offer the passenger took, and it is priced where the offer is made.
 */
export function withLine(price: PriceBreakdown, line: PriceLine | null): PriceBreakdown {
  if (line === null) return price;
  return {
    ...price,
    lines: [...price.lines, line],
    total: Math.round((price.total + line.amount) * 100) / 100,
  };
}
