import { describe, expect, it } from "vitest";
import { chooseIntervention } from "./decide";
import { stubJudgement } from "./jev";
import { INTERRUPTION_BUDGET, type CompanionState } from "./types";

const base: CompanionState = {
  step: "results",
  route: "SAW-STN",
  departDate: "2026-10-14",
  party: { adults: 2, children: 1, infants: 0 },
  shortlist: ["PC1123-20261014-0"],
  visits: 2,
  hoursSinceLastVisit: 48,
  findings: ["The 15th is now 12 EUR below the 14th, which reverses your comparison."],
  interruptionsSoFar: 0,
};

describe("the companion stays quiet unless speaking is earned", () => {
  it("says nothing when nothing has changed", () => {
    const state: CompanionState = { ...base, findings: [] };
    expect(chooseIntervention(state, stubJudgement(state))).toBeNull();
  });

  it("says nothing once the interruption budget is spent", () => {
    const state: CompanionState = { ...base, interruptionsSoFar: INTERRUPTION_BUDGET };
    expect(chooseIntervention(state, stubJudgement(state))).toBeNull();
  });

  it("says nothing when the judgement says it would be unwelcome", () => {
    const judgement = { ...stubJudgement(base), worthInterrupting: 0.1 };
    expect(chooseIntervention(base, judgement)).toBeNull();
  });

  it("says nothing when the passenger is not stuck on anything", () => {
    const judgement = { ...stubJudgement(base), openQuestion: "none" as const };
    expect(chooseIntervention(base, judgement)).toBeNull();
  });
});

describe("when it does speak", () => {
  it("speaks about the finding, not about time passing", () => {
    const intervention = chooseIntervention(base, stubJudgement(base));
    expect(intervention).not.toBeNull();
    expect(intervention?.detail).toContain("15th");
    expect(intervention?.rationale).toContain("a fact changed");
  });

  it("offers exactly one action, because a menu is a chatbot", () => {
    const intervention = chooseIntervention(base, stubJudgement(base));
    expect(intervention?.action).not.toBeNull();
    expect(Object.keys(intervention?.action ?? {})).toEqual(["label", "href"]);
  });

  it("always explains itself, so restraint is visible in the demo", () => {
    const intervention = chooseIntervention(base, stubJudgement(base));
    expect(intervention?.rationale.length ?? 0).toBeGreaterThan(20);
  });

  it("uses push rather than inline once the passenger has left and come back", () => {
    const state: CompanionState = { ...base, step: "search", visits: 3 };
    expect(chooseIntervention(state, stubJudgement(state))?.channel).toBe("push");
  });

  it("recommends the bundled fare when a checked bag is likely", () => {
    const state: CompanionState = { ...base, step: "fare" };
    const judgement = { ...stubJudgement(state), openQuestion: "fare_family" as const };
    expect(chooseIntervention(state, judgement)?.headline).toContain("Advantage");
  });

  it("recommends the cheaper fare when no bag is needed", () => {
    const state: CompanionState = {
      ...base,
      step: "fare",
      party: { adults: 1, children: 0, infants: 0 },
    };
    const judgement = {
      ...stubJudgement(state),
      openQuestion: "fare_family" as const,
      needsCheckedBag: 0.2,
    };
    expect(chooseIntervention(state, judgement)?.headline).toContain("Essentials");
  });

  it("reaches for email when the passenger is blocked on someone else", () => {
    const judgement = {
      ...stubJudgement(base),
      openQuestion: "waiting_on_companion" as const,
    };
    expect(chooseIntervention(base, judgement)?.channel).toBe("email");
  });
});

describe("the stub judgement is deterministic and sane", () => {
  it("returns the same answer for the same state", () => {
    expect(stubJudgement(base)).toEqual(stubJudgement(base));
  });

  it("reads a party with a child as a family trip", () => {
    expect(stubJudgement(base).isFamilyTrip).toBeGreaterThan(0.5);
  });

  it("does not read a solo traveller as a family trip", () => {
    const solo: CompanionState = { ...base, party: { adults: 1, children: 0, infants: 0 } };
    expect(stubJudgement(solo).isFamilyTrip).toBeLessThan(0.5);
  });

  it("spends down its willingness to interrupt as the budget is used", () => {
    const first = stubJudgement({ ...base, interruptionsSoFar: 0 }).worthInterrupting;
    const second = stubJudgement({ ...base, interruptionsSoFar: 1 }).worthInterrupting;
    const third = stubJudgement({ ...base, interruptionsSoFar: 2 }).worthInterrupting;
    expect(first).toBeGreaterThan(second);
    expect(second).toBeGreaterThan(third);
  });
});
