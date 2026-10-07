import { describe, expect, it } from "vitest";
import { impactOf, openingFare, type ImpactState } from "./impact";
import { priceOf } from "@/lib/assistant/price";
import { emreDraft, willDraft } from "@/lib/demo/personas";

/**
 * The impact column is arithmetic over the same drafts the screens print. If
 * the ticket says 316.90, the column says 316.90, and "today" is the opening
 * fare of the same trip.
 */
const COLD: ImpactState = {
  draft: null,
  booked: false,
  invited: [],
  inviteesBooked: {},
  breakfast: false,
  emre: { draft: null, booked: false, gifts: false, nextYear: false, dadTold: false },
};

describe("the impact column", () => {
  it("starts at zero on both sides", () => {
    const { companion, today } = impactOf(COLD);
    expect(companion).toEqual({ bookings: 0, revenue: 0, addOns: 0, newUsers: 0 });
    expect(today).toEqual(companion);
  });

  it("counts Will's booking at the ticket's price, against one LIGHT return to Istanbul", () => {
    const { companion, today } = impactOf({ ...COLD, booked: true });
    expect(companion.bookings).toBe(1);
    expect(companion.revenue).toBe(priceOf(willDraft()));
    expect(today.revenue).toBe(openingFare(willDraft()));
    expect(today.revenue).toBeLessThan(companion.revenue);
    expect(companion.addOns).toBe(Math.round((companion.revenue - today.revenue) * 100) / 100);
    expect(today.addOns).toBe(0);
  });

  it("adds each friend who books, on both sides, and Tom as a new user", () => {
    const { companion, today } = impactOf({
      ...COLD,
      booked: true,
      invited: ["Archie Bell", "Tom Baker"],
      inviteesBooked: { "Archie Bell": "14B", "Tom Baker": "14C" },
      breakfast: true,
    });
    expect(companion.bookings).toBe(3);
    expect(companion.newUsers).toBe(1);
    expect(today.bookings).toBe(3);
    expect(today.newUsers).toBe(0);
    expect(companion.revenue).toBeGreaterThan(today.revenue);
    expect(companion.addOns).toBeGreaterThan(3 * 7 * 2 + 22.5);
  });

  it("counts Emre's trip with the presents, and Dad once told", () => {
    const { companion, today } = impactOf({
      ...COLD,
      emre: { ...COLD.emre, booked: true, gifts: true, dadTold: true },
    });
    expect(companion.bookings).toBe(1);
    expect(companion.revenue).toBe(Math.round((priceOf(emreDraft()) + 30.5) * 100) / 100);
    expect(companion.newUsers).toBe(1);
    expect(today.newUsers).toBe(0);
  });
});
