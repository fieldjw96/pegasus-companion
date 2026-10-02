import { describe, expect, it } from "vitest";
import { BAGGAGE_PRICES, baggagePaths, compareBaggagePaths } from "./baggage";

/**
 * These are the numbers the pitch rests on, so they are asserted exactly. Every
 * one was read off a screenshot of the live app; if a future screenshot
 * disagrees, the screenshot wins and these change with it.
 */
describe("the a la carte baggage prices", () => {
  it("matches the Baggage Selection screen", () => {
    expect(BAGGAGE_PRICES.cabin).toBe(17);
    expect(BAGGAGE_PRICES.checked12).toBe(20);
    expect(BAGGAGE_PRICES.checked20).toBe(41);
  });
});

describe("comparing every route to a cabin bag and a checked bag", () => {
  const verdict = compareBaggagePaths();

  it("finds SAVER is the cheapest", () => {
    expect(verdict.best.id).toBe("saver");
    expect(verdict.best.cost).toBe(30);
  });

  it("finds SAVER also gives the most allowance, so it strictly dominates", () => {
    for (const path of baggagePaths()) {
      if (path.id === "saver") continue;
      expect(path.cost).toBeGreaterThan(verdict.best.cost);
      expect(path.checkedKg).toBeLessThanOrEqual(verdict.best.checkedKg);
    }
  });

  it("marks every other route as dominated: more money, no more baggage", () => {
    expect(verdict.dominated.map((p) => p.id).sort()).toEqual([
      "alacarte12",
      "alacarte20",
      "upsell",
    ]);
  });

  it("identifies the upsell as the worst at 59.00", () => {
    expect(verdict.worst.cost).toBe(59);
  });

  it("shows the app recommends a route 28.00 worse for 5 kg less", () => {
    expect(verdict.recommendedByApp.id).toBe("alacarte20");
    expect(verdict.recommendedByApp.cost).toBe(58);
    expect(verdict.recommendedByApp.cost - verdict.best.cost).toBe(28);
    expect(verdict.best.checkedKg - verdict.recommendedByApp.checkedKg).toBe(5);
  });

  it("even the cheapest a la carte combination loses to SAVER", () => {
    const cheapestAlaCarte = BAGGAGE_PRICES.cabin + BAGGAGE_PRICES.checked12;
    expect(cheapestAlaCarte).toBe(37);
    expect(cheapestAlaCarte).toBeGreaterThan(verdict.best.cost);
  });

  it("produces a finding a human can read aloud", () => {
    expect(verdict.finding).toContain("30.00");
    expect(verdict.finding).toContain("25 kg");
    expect(verdict.finding).toContain("59.00");
    expect(verdict.finding).toMatch(/recommends/i);
  });
});
