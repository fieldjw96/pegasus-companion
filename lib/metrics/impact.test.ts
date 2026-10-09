import { describe, expect, it } from "vitest";
import { impactOf, openingFare, type ImpactState } from "./impact";
import { COMPANION_TAPS, TODAY_TAPS, TODAY_TAPS_PER_BOOKING } from "./taps";
import { priceOf } from "@/lib/assistant/price";
import { jessDraft } from "@/lib/demo/personas";
import { stayFor } from "@/lib/group/stay";

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
  hostel: null,
  dadTold: false,
  mealsDropped: [],
};

describe("the impact column", () => {
  it("starts at zero on both sides", () => {
    const { companion, today } = impactOf(COLD);
    expect(companion).toEqual({ revenue: 0, addOns: 0, taps: 0, newUsers: 0 });
    expect(today).toEqual(companion);
  });

  it("counts Jess's booking at the ticket's price, against one LIGHT return to Istanbul", () => {
    const { companion, today } = impactOf({ ...COLD, booked: true });
    expect(companion.revenue).toBe(priceOf(jessDraft()));
    expect(today.revenue).toBe(openingFare(jessDraft()));
    expect(today.revenue).toBeLessThan(companion.revenue);
    expect(companion.addOns).toBe(Math.round((companion.revenue - today.revenue) * 100) / 100);
    expect(today.addOns).toBe(0);
  });

  it("counts Jess's two taps against the live journey's thirty-nine", () => {
    const { companion, today } = impactOf({ ...COLD, booked: true });
    expect(companion.taps).toBe(COMPANION_TAPS.organiser);
    expect(companion.taps).toBe(2);
    expect(today.taps).toBe(TODAY_TAPS_PER_BOOKING);
    expect(today.taps).toBe(39);
    // The screen-by-screen count adds up to the figure the column prints.
    expect(TODAY_TAPS.reduce((n, s) => n + s.taps, 0)).toBe(39);
  });

  it("adds each friend who books, on both sides, and Will as a new user", () => {
    const { companion, today } = impactOf({
      ...COLD,
      booked: true,
      invited: ["Archie Bell", "Will Parker"],
      inviteesBooked: { "Archie Bell": "14B", "Will Parker": "14C" },
      breakfast: true,
    });
    expect(companion.newUsers).toBe(1);
    expect(today.newUsers).toBe(0);
    expect(companion.revenue).toBeGreaterThan(today.revenue);
    expect(companion.addOns).toBeGreaterThan(3 * 7 * 2 + 22.5);
    // Jess's two, her one send, and three each for Archie and Will.
    expect(companion.taps).toBe(2 + 1 + 3 + 3);
    expect(today.taps).toBe(3 * 39);
  });

  it("drops Archie's meal from revenue and add-ons when he takes it off", () => {
    const booked = { ...COLD, booked: true, inviteesBooked: { "Archie Bell": "14B" } };
    const withMeal = impactOf(booked);
    const without = impactOf({ ...booked, mealsDropped: ["Archie Bell"] });
    expect(
      Math.round((withMeal.companion.revenue - without.companion.revenue) * 100) / 100,
    ).toBe(26);
    expect(withMeal.companion.addOns - without.companion.addOns).toBeCloseTo(26, 2);
    expect(without.today).toEqual(withMeal.today);
  });

  it("counts a parent for each of the three once Jess keeps Dad posted", () => {
    const { companion, today } = impactOf({ ...COLD, booked: true, dadTold: true });
    expect(companion.newUsers).toBe(3);
    expect(today.newUsers).toBe(0);
    const withJess = impactOf({
      ...COLD,
      booked: true,
      dadTold: true,
      invited: ["Archie Bell", "Will Parker"],
      inviteesBooked: { "Archie Bell": "14B", "Will Parker": "14C" },
    });
    expect(withJess.companion.newUsers).toBe(4);
  });
});

describe("the stay", () => {
  it("counts the commission on a hostel booked for three, and nothing when declined", () => {
    const stay = stayFor(jessDraft());
    expect(stay.nights).toBe(3);
    expect(stay.each).toBe(55.5);
    expect(stay.total).toBe(166.5);
    expect(stay.commission).toBe(19.98);
    const booked = impactOf({ ...COLD, booked: true, hostel: "booked" });
    const plain = impactOf({ ...COLD, booked: true });
    expect(booked.companion.revenue).toBe(
      Math.round((plain.companion.revenue + 19.98) * 100) / 100,
    );
    expect(impactOf({ ...COLD, booked: true, hostel: "declined" }).companion).toEqual(
      plain.companion,
    );
  });
});
