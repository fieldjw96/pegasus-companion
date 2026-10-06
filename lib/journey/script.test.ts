import { describe, expect, it } from "vitest";
import { HERO } from "./script";
import { inventory } from "./flights";
import { heroDraft } from "@/lib/demo/hero";
import { breakdown, naivePath, priceOf } from "@/lib/assistant/price";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { countBySource } from "@/lib/assistant/draft";

/**
 * The numbers the design canvas prints, asserted exactly.
 *
 * The same figure appears on the ticket, the checkout, the Live Activity and
 * the friend's notification. If any one of them drifts, the demo contradicts
 * itself in front of the jury, and nothing but a test will notice.
 */
describe("the hero trip", () => {
  const draft = heroDraft();

  it("is the flights the canvas prints, in the order the pricer picks them", () => {
    const out = inventory(HERO.origin, HERO.destination, HERO.departDate);
    const back = inventory(HERO.destination, HERO.origin, HERO.returnDate);
    expect(out[0]?.flightNo).toBe("PC 1474");
    expect(out[0]?.departs).toBe("07:17");
    expect(out[0]?.arrives).toBe("10:51");
    expect(back[0]?.flightNo).toBe("PC 1355");
    expect(back[0]?.departs).toBe("07:59");
  });

  it("builds from the opening sentence to the dates and bag the canvas shows", () => {
    expect(draft.origin.value).toBe("STN");
    expect(draft.destination.value).toBe("ADB");
    expect(draft.departDate.value).toBe(HERO.departDate);
    expect(draft.returnDate.value).toBe(HERO.returnDate);
    expect(draft.package.value).toBe("saverPlus");
    expect(draft.checkedKg.value).toBe(25);
  });

  it("counts 4 said, 3 remembered, 3 predicted", () => {
    expect(countBySource(draft)).toEqual({ said: 4, profile: 3, predicted: 3, shared: 0 });
  });

  it("totals 1224.66 GBP, and 1308.66 bought the long way", () => {
    expect(priceOf(draft)).toBe(1224.66);
    expect(naivePath(draft)).toEqual({ paid: 1308.66, saved: 84 });
    const lines = breakdown(draft).lines.map((l) => l.amount);
    expect(lines).toEqual([1004.22, 220.44]);
  });

  it("prints NSVSXR, gate A3, boarding 06:47 and the family in 19D 19E 19F", () => {
    const itinerary = itineraryFor(draft);
    expect(itinerary.reference).toBe("NSVSXR");
    expect(itinerary.out?.gate).toBe("A3");
    expect(itinerary.out?.boards).toBe("06:47");
    expect(itinerary.out?.seats).toEqual(["19D", "19E", "19F"]);
    expect(itinerary.back?.seats).toEqual(["19D", "19E", "19F"]);
  });

  it("gives an invitee on the same flights a different reference", () => {
    expect(itineraryFor(draft, "Sam Okonkwo").reference).toBe("K7PM2W");
  });
});
