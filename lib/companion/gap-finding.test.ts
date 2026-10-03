import { describe, expect, it } from "vitest";
import { findBaggageGap, isBaggageGapFinding } from "./gap-finding";
import { compareBaggagePaths } from "../journey/baggage";

describe("recognising the baggage comparison", () => {
  it("recognises the finding production actually generates", () => {
    expect(isBaggageGapFinding(compareBaggagePaths().finding)).toBe(true);
  });

  it("uses no regex literal, so an invisible escape cannot silently break it", () => {
    // The second version of this predicate was patched in by a shell script that
    // turned \b into a literal backspace. It read /kg/i in every editor and
    // matched nothing. Plain string operations cannot fail that way.
    expect(isBaggageGapFinding.toString()).not.toContain("/i.test");
  });

  it("ignores findings about dates or prices", () => {
    expect(isBaggageGapFinding("The 15th is now 12.00 GBP below the 14th.")).toBe(false);
    expect(isBaggageGapFinding("Nothing has changed on either of your dates.")).toBe(false);
  });

  it("needs both the package and the allowance, not just one", () => {
    expect(isBaggageGapFinding("SAVER is a package.")).toBe(false);
    expect(isBaggageGapFinding("You may add 20 kg later.")).toBe(false);
    expect(isBaggageGapFinding("SAVER includes 25 kg.")).toBe(true);
  });

  it("is case insensitive about the package name", () => {
    expect(isBaggageGapFinding("saver includes 25 KG")).toBe(true);
  });

  it("returns the first matching finding, or null", () => {
    const real = compareBaggagePaths().finding;
    expect(findBaggageGap(["unrelated", real])).toBe(real);
    expect(findBaggageGap(["unrelated"])).toBeNull();
    expect(findBaggageGap([])).toBeNull();
  });
});
