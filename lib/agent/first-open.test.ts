import { describe, expect, it } from "vitest";
import { firstOpen, nextFreeWeekend, pitches } from "./first-open";
import { extract } from "@/lib/assistant/understand";

/**
 * The three cards on a first open are sentences the companion says on the
 * passenger's behalf. Each has to parse back into the trip it pitched, or the
 * tap would build something else.
 */
describe("the first open", () => {
  const signals = firstOpen("2026-10-06");
  const picks = pitches(signals);

  it("finds a Friday-to-Monday at least two weeks out", () => {
    const { from, to } = nextFreeWeekend("2026-10-06");
    expect(from).toBe("2026-10-23");
    expect(to).toBe("2026-10-26");
    expect(new Date(`${from}T00:00:00Z`).getUTCDay()).toBe(5);
  });

  it("never pitches Cappadocia: that is Jess's to say", () => {
    expect(picks.map((p) => p.code)).not.toContain("ASR");
    expect(picks).toHaveLength(3);
  });

  it("says sentences that parse back into the trips they pitch", () => {
    const warm = extract(picks[0]!.prompt);
    expect(warm.discovery).toBe(true);
    expect(warm.budget).toBe(600);

    const istanbul = extract(picks[1]!.prompt);
    expect(istanbul.destination).toBe("SAW");
    expect(istanbul.departDate).toBe("2026-10-23");
    expect(istanbul.returnDate).toBe("2026-10-26");
    expect(istanbul.cabinBag).toBe(true);

    const izmir = extract(picks[2]!.prompt);
    expect(izmir.destination).toBe("ADB");
    expect(izmir.nights).toBe(4);
    expect(izmir.month).toBe(10);
    expect(izmir.checkedBag).toBe(true);
  });

  it("quotes a fare for each, from the inventory", () => {
    for (const p of picks) expect(p.from).toBeGreaterThan(0);
  });
});
