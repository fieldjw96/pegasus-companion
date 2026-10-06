import { BAGGAGE_PRICES } from "@/lib/journey/baggage";
import { FARE_RULES, inventory } from "@/lib/journey/flights";
import type { TripDraft } from "./draft";
import { legPlan } from "./itinerary";

/**
 * Price a drafted trip, and show the arithmetic.
 *
 * Fares come from the same deterministic inventory everything else uses, so the
 * number on the ticket is the number on the checkout and the one in the
 * notification. `breakdown` is the real function and `priceOf` is its total.
 * They cannot disagree, which is the whole reason it is written this way round:
 * the moment a screen itemises a price, a separately computed total starts
 * drifting from the lines above it.
 */

export type PriceLine = {
  label: string;
  /** The working, in words. "41.00 × 3 travellers × 2 legs". */
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
 * The share of a quoted fare presented as tax rather than fare. Invented, and
 * labelled as such on screen. It changes no total: the two lines are defined
 * to add back to the price the search quoted.
 */
const TAX_SHARE = 0.18;

/** A chosen seat, per leg, on fares that do not include seat selection. */
export const SEAT_PRICE = 7;

function includesSeat(family: TripDraft["package"]["value"]): boolean {
  return FARE_RULES[family].inclusions.some((i) => /Seat Selection/.test(i.text));
}

/** Checked allowance the fare already includes, read off its own inclusion list. */
function includedKgOf(family: TripDraft["package"]["value"]): number {
  const inclusions = FARE_RULES[family].inclusions;
  if (inclusions.some((i) => i.text.includes("30 Kg"))) return 30;
  if (inclusions.some((i) => i.text.includes("25 Kg"))) return 25;
  return 0;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function breakdown(draft: TripDraft): PriceBreakdown {
  const plan = legPlan(draft);
  const flights = plan
    .map((leg) => inventory(leg.from, leg.to, leg.date)[0])
    .filter((f): f is NonNullable<typeof f> => f !== undefined);
  if (flights.length === 0 || flights.length !== plan.length) {
    return { lines: [], included: [], total: 0 };
  }

  const people = draft.party.value.adults + draft.party.value.children;
  const legs = flights.length;
  const family = draft.package.value;
  const who = `${people} traveller${people === 1 ? "" : "s"}`;
  const trips = legs === 1 ? "one way" : `${legs} legs`;

  // The quoted fare, split the way a ticket shows it. Per leg, because a
  // multi-stop trip prices each sector on its own.
  const fares = flights.map((f) => f.fares[family] ?? 0);
  const taxes = fares.map((fare) => round(fare * TAX_SHARE));
  const nets = fares.map((fare, i) => round(fare - (taxes[i] ?? 0)));
  const sameFare = fares.every((fare) => fare === fares[0]);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  const lines: PriceLine[] = [
    {
      label: `${FARE_RULES[family].label} flight fare${legs > 1 && !sameFare ? "s" : ""}`,
      detail: sameFare
        ? `${(nets[0] ?? 0).toFixed(2)} × ${who} × ${trips}`
        : `${nets.map((n) => n.toFixed(2)).join(" + ")} × ${who}`,
      amount: round(sum(nets) * people),
    },
    {
      label: "Taxes, fees and charges",
      detail: sameFare
        ? `${(taxes[0] ?? 0).toFixed(2)} × ${who} × ${trips}, already inside the quoted fare`
        : `${sum(taxes).toFixed(2)} × ${who}, already inside the quoted fares`,
      amount: round(sum(taxes) * people),
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
      detail: `${unit.toFixed(2)} × ${who} × ${trips}`,
      amount: round(unit * people * legs),
    });
  }

  if (draft.cabinBag.value && family === "light") {
    lines.push({
      label: "Cabin baggage",
      detail: `${BAGGAGE_PRICES.cabin.toFixed(2)} × ${who} × ${trips}, because LIGHT excludes it`,
      amount: round(BAGGAGE_PRICES.cabin * people * legs),
    });
  }

  if (draft.flexibility.value !== "none" && family === "light") {
    lines.push({
      label: "Changeable dates",
      detail: `6.00 × ${who} × ${trips}`,
      amount: round(6 * people * legs),
    });
  }

  if (draft.seating.value !== "none" && !includesSeat(family)) {
    lines.push({
      label: "Seat selection",
      detail: `${SEAT_PRICE.toFixed(2)} × ${who} × ${trips}`,
      amount: round(SEAT_PRICE * people * legs),
    });
  }

  const included = FARE_RULES[family].inclusions.map((i) =>
    i.detail === undefined ? i.text : `${i.text} ${i.detail}`,
  );

  return { lines, included, total: round(sum(lines.map((l) => l.amount))) };
}

export function priceOf(draft: TripDraft): number {
  return breakdown(draft).total;
}

/**
 * What this identical trip would have cost bought the funnel's way: LIGHT taken
 * first, then the same baggage added at the à la carte price instead of
 * arriving inside a better fare. Null when there is nothing to claim, which has
 * to be allowed to happen. A companion that always finds a saving is a
 * discount, not an opinion.
 */
export function naivePath(draft: TripDraft): { paid: number; saved: number } | null {
  if (draft.checkedKg.value === 0) return null;
  if (draft.package.value === "light") return null;
  const asLight: TripDraft = {
    ...draft,
    package: { value: "light", source: "predicted", why: "The fare the funnel opens on." },
  };
  const paid = breakdown(asLight).total;
  const saved = round(paid - breakdown(draft).total);
  return saved <= 0 ? null : { paid, saved };
}

/**
 * A breakdown with more lines on it: a seat, a meal, a bag for presents. Kept
 * out of `breakdown` because they are not part of the draft; they are offers
 * the passenger took, priced where the offer is made.
 */
export function withLines(price: PriceBreakdown, extra: PriceLine[]): PriceBreakdown {
  if (extra.length === 0) return price;
  return {
    ...price,
    lines: [...price.lines, ...extra],
    total: round(price.total + extra.reduce((a, l) => a + l.amount, 0)),
  };
}

export function withLine(price: PriceBreakdown, line: PriceLine | null): PriceBreakdown {
  return withLines(price, line === null ? [] : [line]);
}
