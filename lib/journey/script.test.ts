import { describe, expect, it } from "vitest";
import { SQUAD, HOME } from "./script";
import { inventory } from "./flights";
import { EMRE, JESS, emreDraft, jessDraft } from "@/lib/demo/personas";
import { breakdown, naivePath, priceOf } from "@/lib/assistant/price";
import { itineraryFor, legPlan } from "@/lib/assistant/itinerary";
import { countBySource } from "@/lib/assistant/draft";

/**
 * The numbers the two journeys print, asserted exactly.
 *
 * The same figure appears on the ticket, the checkout, the Live Activity and
 * the friend's notification. If any one of them drifts, the demo contradicts
 * itself in front of the jury, and nothing but a test will notice.
 */
describe("Jess's week", () => {
  const draft = jessDraft();
  const me = JESS.travellers[0]!.name;

  it("is four flights, on the pinned routes, whatever the dates", () => {
    const legs = legPlan(draft);
    expect(legs.map((l) => `${l.from}-${l.to}`)).toEqual([
      "STN-SAW",
      "SAW-ASR",
      "ASR-AYT",
      "AYT-STN",
    ]);
    const first = inventory("STN", "SAW", draft.departDate.value)[0];
    expect(first?.flightNo).toBe("PC 1164");
    expect(first?.departs).toBe("06:10");
  });

  it("prices to the penny: SAVER for one over four legs, plus the window", () => {
    const price = breakdown(draft);
    // Fares: 89.40 + 32.10 + 38.60 + 101.30 light, + 30 SAVER each leg.
    expect(price.lines.map((l) => l.label)).toEqual([
      "SAVER flight fares",
      "Taxes, fees and charges",
      "Seat selection",
    ]);
    expect(priceOf(draft)).toBe(409.4);
    expect(naivePath(draft)).toEqual({ paid: 521.4, saved: 112 });
  });

  it("prints K4T7QX, gate B12 and seat 14A on every leg", () => {
    const itinerary = itineraryFor(draft, me);
    expect(itinerary.reference).toBe(SQUAD.references.jess);
    expect(itinerary.out?.gate).toBe(SQUAD.gate);
    expect(itinerary.legs.map((l) => l.seats[0])).toEqual(["14A", "14A", "14A", "14A"]);
  });

  it("counts what was said against what was predicted", () => {
    const counts = countBySource(draft);
    expect(counts.said).toBe(2);
    expect(counts.profile).toBe(0);
    expect(counts.shared).toBe(0);
    expect(counts.predicted).toBe(9);
  });
});

describe("Emre's usual trip", () => {
  const draft = emreDraft();
  const me = EMRE.travellers[0]!.name;

  it("is the Friday 19:05 home and the Sunday back", () => {
    const itinerary = itineraryFor(draft, me);
    expect(itinerary.out?.flight.flightNo).toBe("PC 2652");
    expect(itinerary.out?.flight.departs).toBe("19:05");
    expect(new Date(`${draft.departDate.value}T00:00:00Z`).getUTCDay()).toBe(5);
    expect(new Date(`${draft.returnDate.value}T00:00:00Z`).getUTCDay()).toBe(0);
  });

  it("sits in 3A under E9MBTZ, SAVER, all-in 133.80", () => {
    const itinerary = itineraryFor(draft, me);
    expect(itinerary.reference).toBe(HOME.reference);
    expect(itinerary.out?.seats).toEqual([HOME.seat]);
    expect(draft.package.value).toBe("saver");
    expect(priceOf(draft)).toBe(133.8);
  });

  it("guesses only the return, and says so", () => {
    expect(draft.returnDate.source).toBe("predicted");
    expect(draft.returnDate.uncertain).toBe(true);
    expect(countBySource(draft).profile).toBe(9);
  });
});

describe("the next trip", () => {
  it("is a 10% drop to the penny, for three", async () => {
    const { fareDrop } = await import("@/lib/group/next-trip");
    const drop = fareDrop(jessDraft(), 3);
    expect(drop.city).toBe("Bodrum");
    expect(drop.nowEach).toBe(189);
    expect(drop.wasEach).toBe(210);
    expect(drop.dropPercent).toBe(10);
    expect(drop.savingEach).toBe(21);
    expect(drop.savingSquad).toBe(63);
    expect(drop.out.slice(5, 7)).toBe("09");
  });
});
