import { describe, expect, it } from "vitest";
import {
  FARE_FAMILIES,
  FARE_RULES,
  LIGHT_TO_SAVER_UPSELL,
  baggageUpsellGap,
  inventory,
} from "./flights";

/**
 * These numbers come from screenshots of the live app, not from a model of it.
 * If a future screenshot disagrees, the screenshot wins and these change.
 */
describe("the real Pegasus packages", () => {
  it("has the four packages the app actually offers, in order", () => {
    expect(FARE_FAMILIES).toEqual(["light", "saver", "saverPlus", "comfortFlex"]);
    expect(FARE_RULES.light.label).toBe("LIGHT");
    expect(FARE_RULES.saver.label).toBe("SAVER");
    expect(FARE_RULES.saverPlus.label).toBe("SAVER PLUS");
    expect(FARE_RULES.comfortFlex.label).toBe("COMFORT FLEX");
  });

  it("prices the packages at the observed uplifts over LIGHT", () => {
    // 199.13 / 229.13 / 249.13 / 262.13 on the observed itinerary.
    expect(FARE_RULES.light.uplift).toBe(0);
    expect(FARE_RULES.saver.uplift).toBe(30);
    expect(FARE_RULES.saverPlus.uplift).toBe(50);
    expect(FARE_RULES.comfortFlex.uplift).toBe(63);
  });

  it("gives LIGHT an underseat bag only, and the others a cabin bag", () => {
    expect(FARE_RULES.light.inclusions).toHaveLength(1);
    expect(FARE_RULES.light.inclusions[0]?.text).toContain("Underseat");
    for (const family of ["saver", "saverPlus", "comfortFlex"] as const) {
      expect(FARE_RULES[family].inclusions.some((i) => /cabin baggage/i.test(i.text))).toBe(
        true,
      );
    }
  });

  it("only COMFORT FLEX includes 30 kg and a sandwich", () => {
    expect(FARE_RULES.comfortFlex.inclusions.some((i) => i.text === "Sandwich")).toBe(true);
    expect(FARE_RULES.saverPlus.inclusions.some((i) => i.text === "Sandwich")).toBe(false);
    expect(FARE_RULES.comfortFlex.inclusions.some((i) => /30 Kg/.test(i.text))).toBe(true);
  });

  it("orders every flight's fares cheapest-first across the four packages", () => {
    for (const flight of inventory("STN", "SAW", "2026-10-19")) {
      const { light, saver, saverPlus, comfortFlex } = flight.fares;
      expect(light).toBeLessThan(saver ?? 0);
      expect(saver).toBeLessThan(saverPlus ?? 0);
      expect(saverPlus).toBeLessThan(comfortFlex ?? 0);
    }
  });
});

describe("the baggage upsell gap", () => {
  it("is the finding the whole demo rests on: later costs nearly double", () => {
    const gap = baggageUpsellGap("light");
    expect(gap).not.toBeNull();
    expect(gap?.payNow).toBe(30);
    expect(gap?.payLater).toBe(LIGHT_TO_SAVER_UPSELL);
    expect(gap?.payLater).toBe(59);
    expect(gap?.worseOffBy).toBe(29);
    expect(gap?.multiple).toBeGreaterThan(1.9);
  });

  it("says nothing for a package that already includes baggage", () => {
    expect(baggageUpsellGap("saver")).toBeNull();
    expect(baggageUpsellGap("saverPlus")).toBeNull();
    expect(baggageUpsellGap("comfortFlex")).toBeNull();
  });
});
