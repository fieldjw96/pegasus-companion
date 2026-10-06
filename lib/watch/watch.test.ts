import { describe, expect, it } from "vitest";
import {
  INTENT,
  PROPOSAL_DATE,
  WATCH_START,
  bestToday,
  checkMorning,
  deadlineDate,
  mornings,
  shift,
} from "./watch";

/**
 * The gates. Each alone keeps the companion quiet, and a change that makes it
 * speak more often is a regression unless the brief says otherwise.
 */
describe("a morning's check", () => {
  it("is silent when nothing changed overnight", () => {
    const m = checkMorning(INTENT, shift(WATCH_START, 5));
    expect(m.verdict).toBe("silent");
    expect(m.quiet).toBe("Nothing changed overnight.");
    expect(m.why).toEqual([]);
  });

  it("speaks the morning the best fare crosses under the cap", () => {
    const m = checkMorning(INTENT, PROPOSAL_DATE);
    expect(m.verdict).toBe("propose");
    expect(m.best).toEqual({ code: "ADB", city: "Izmir", total: 1224.66 });
    expect(m.margin).toBeCloseTo(75.34, 2);
    expect(m.why[0]).toContain("dropped 94 GBP overnight");
    expect(m.why[0]).toContain("under 1,300 for the first time");
    expect(m.why[1]).toContain("Antalya is still 1,410");
    expect(m.why[1]).toContain("no direct to Dalaman");
  });

  it("stays silent the morning after a proposal, because nothing changed", () => {
    expect(checkMorning(INTENT, shift(PROPOSAL_DATE, 1)).verdict).toBe("silent");
  });

  it("is silent when a fare moves but stays over the cap", () => {
    const antalyaOnly = { ...INTENT, where: ["AYT" as const] };
    const m = checkMorning(antalyaOnly, shift(WATCH_START, 24));
    expect(bestToday(antalyaOnly, shift(WATCH_START, 24))?.total).toBe(1341.66);
    expect(m.verdict).toBe("silent");
    expect(m.quiet).toContain("still over your cap");
  });

  it("is silent once the interruption budget is spent, whatever happens", () => {
    expect(checkMorning(INTENT, PROPOSAL_DATE, 3).verdict).toBe("silent");
  });

  it("fires the deadline rule 21 days out, with the best there is", () => {
    const noIzmir = { ...INTENT, where: ["AYT" as const, "DLM" as const] };
    const date = deadlineDate(noIzmir);
    expect(date).toBe("2026-09-28");
    const m = checkMorning(noIzmir, date);
    expect(m.verdict).toBe("deadline");
    expect(m.why[0]).toContain("Antalya at 1,341.66");
    expect(m.why[0]).toContain("41.66 over");
    expect(m.why[0]).toContain("Your rule says ask");
  });

  it("speaks once in the first 23 days, on the 22nd", () => {
    const history = mornings(INTENT, shift(WATCH_START, 22));
    expect(history).toHaveLength(23);
    const spoken = history.filter((m) => m.verdict !== "silent");
    expect(spoken.map((m) => m.date)).toEqual([PROPOSAL_DATE]);
  });
});
