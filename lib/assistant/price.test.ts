import { describe, expect, it } from "vitest";
import { breakdown, naivePath, priceOf } from "./price";
import { BAGGAGE_PRICES } from "@/lib/journey/baggage";
import type { TripDraft } from "./draft";

/**
 * The breakdown is now the thing on screen, so the arithmetic it shows has to
 * add up to the total printed above it. That is the test nobody writes and
 * everybody needs: a summary that disagrees with its own lines destroys the
 * credibility of the whole screen in one glance.
 */

function draftOf(over: Partial<TripDraft> = {}): TripDraft {
  const field = <T>(value: T) => ({ value, source: "said" as const, why: "" });
  return {
    origin: field("STN"),
    destination: field("ADB"),
    departDate: field("2026-10-19"),
    returnDate: field<string | null>("2026-10-25"),
    party: field({ adults: 2, children: 1, infants: 0 }),
    package: field("saver" as const),
    checkedKg: field(25 as const),
    cabinBag: field(true),
    seating: field("together" as const),
    flexibility: field("none" as const),
    notes: [],
    ...over,
  };
}

const f = <T>(value: T) => ({ value, source: "said" as const, why: "" });

describe("breakdown", () => {
  it("is what priceOf returns", () => {
    expect(priceOf(draftOf())).toBe(breakdown(draftOf()).total);
  });

  it("has lines that add up to its own total", () => {
    for (const draft of [
      draftOf(),
      draftOf({ package: f("light" as const) }),
      draftOf({ returnDate: f<string | null>(null) }),
      draftOf({ checkedKg: f(0 as const), cabinBag: f(false) }),
      draftOf({ package: f("light" as const), flexibility: f("change" as const) }),
      draftOf({ party: f({ adults: 1, children: 0, infants: 0 }) }),
    ]) {
      const { lines, total } = breakdown(draft);
      const summed = lines.reduce((sum, line) => sum + line.amount, 0);
      expect(summed).toBeCloseTo(total, 2);
    }
  });

  it("always has a fare line", () => {
    expect(breakdown(draftOf()).lines[0]!.label).toContain("SAVER");
  });

  it("charges nothing for an allowance the fare already includes", () => {
    // SAVER includes 25 kg, so 25 kg must not appear as a purchase.
    const labels = breakdown(draftOf()).lines.map((l) => l.label);
    expect(labels.some((l) => l.includes("checked baggage"))).toBe(false);
  });

  it("charges for the same allowance when LIGHT does not include it", () => {
    const { lines } = breakdown(
      draftOf({ package: f("light" as const), checkedKg: f(20 as const) }),
    );
    const bag = lines.find((l) => l.label.includes("checked baggage"));
    expect(bag).toBeDefined();
    expect(bag!.amount).toBeCloseTo(BAGGAGE_PRICES.checked20 * 3 * 2, 2);
  });

  it("uses the 12 kg price for the 12 kg bag", () => {
    const { lines } = breakdown(
      draftOf({ package: f("light" as const), checkedKg: f(12 as const) }),
    );
    const bag = lines.find((l) => l.label.includes("checked baggage"))!;
    expect(bag.amount).toBeCloseTo(BAGGAGE_PRICES.checked12 * 3 * 2, 2);
  });

  it("charges for a cabin bag on LIGHT and not on SAVER", () => {
    const onLight = breakdown(draftOf({ package: f("light" as const) }));
    expect(onLight.lines.some((l) => l.label === "Cabin baggage")).toBe(true);
    expect(breakdown(draftOf()).lines.some((l) => l.label === "Cabin baggage")).toBe(false);
  });

  it("doubles a return against the same trip one way", () => {
    const oneWay = breakdown(draftOf({ returnDate: f<string | null>(null) })).total;
    expect(breakdown(draftOf()).total).toBeCloseTo(oneWay * 2, 2);
  });

  it("lists what the fare covers, so no zero is left unexplained", () => {
    const { included } = breakdown(draftOf());
    expect(included.length).toBeGreaterThan(0);
    expect(included.some((i) => i.includes("25 Kg"))).toBe(true);
  });

  it("shows its working on every line", () => {
    for (const line of breakdown(draftOf({ package: f("light" as const) })).lines) {
      expect(line.detail).not.toBe("");
      expect(line.detail).toContain("x");
    }
  });
});

describe("naivePath", () => {
  it("finds the gap between a bag inside the fare and the same bag bought alone", () => {
    const claim = naivePath(draftOf());
    expect(claim).not.toBeNull();
    expect(claim!.saved).toBeGreaterThan(0);
    expect(claim!.paid).toBeGreaterThan(priceOf(draftOf()));
  });

  it("claims nothing when no bag is being checked", () => {
    expect(naivePath(draftOf({ checkedKg: f(0 as const) }))).toBeNull();
  });

  it("claims nothing when LIGHT is already what was chosen", () => {
    // There is no cheaper path to compare against, so there is nothing to say.
    expect(naivePath(draftOf({ package: f("light" as const) }))).toBeNull();
  });

  it("is the difference between the two totals, exactly", () => {
    const claim = naivePath(draftOf())!;
    expect(claim.paid - claim.saved).toBeCloseTo(priceOf(draftOf()), 2);
  });
});
