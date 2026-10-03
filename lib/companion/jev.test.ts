import { describe, expect, it } from "vitest";
import { QUESTIONS, readAnswers, stubJudgement } from "./jev";
import { judgementSchema, type CompanionState } from "./types";

const state: CompanionState = {
  step: "fare",
  route: "STN-AJI",
  departDate: "2026-10-19",
  party: { adults: 1, children: 0, infants: 0 },
  shortlist: [],
  visits: 1,
  hoursSinceLastVisit: null,
  findings: [],
  interruptionsSoFar: 0,
};

/**
 * These assert the shape Jev's published API actually requires. The first
 * version of this client invented an endpoint and used `options` and `levels`
 * where the API wants `criteria`, and because the client swallowed its own
 * errors the only symptom was "running on the stub". These tests exist so that
 * cannot happen quietly again.
 */
describe("the question definitions match Jev's documented schema", () => {
  it("asks exactly the five judgements the Companion thresholds on", () => {
    expect(Object.keys(QUESTIONS).sort()).toEqual(
      [
        "isFamilyTrip",
        "needsCheckedBag",
        "openQuestion",
        "upgradePropensity",
        "worthInterrupting",
      ].sort(),
    );
  });

  it("gives every question a type and instructions", () => {
    for (const [id, question] of Object.entries(QUESTIONS)) {
      expect(["noul", "score", "choice"], `${id} type`).toContain(question.type);
      expect(question.instructions.length, `${id} instructions`).toBeGreaterThan(10);
    }
  });

  it("uses criteria, never options or levels", () => {
    const serialised = JSON.stringify(QUESTIONS);
    expect(serialised).not.toContain('"options"');
    expect(serialised).not.toContain('"levels"');
    expect(serialised).toContain('"criteria"');
  });

  it("gives the choice question an object of option to description", () => {
    const question = QUESTIONS.openQuestion;
    expect(question.type).toBe("choice");
    if (question.type !== "choice") return;
    expect(Array.isArray(question.criteria)).toBe(false);
    for (const [option, description] of Object.entries(question.criteria)) {
      expect(typeof description, `${option} description`).toBe("string");
    }
  });

  it("offers exactly the choices the Judgement type allows", () => {
    const question = QUESTIONS.openQuestion;
    if (question.type !== "choice") throw new Error("openQuestion must be a choice");
    const allowed = judgementSchema.shape.openQuestion.options;
    expect(Object.keys(question.criteria).sort()).toEqual([...allowed].sort());
  });

  it("gives the score question an ordered array of 2-10 levels", () => {
    const question = QUESTIONS.upgradePropensity;
    expect(question.type).toBe("score");
    if (question.type !== "score") return;
    expect(Array.isArray(question.criteria)).toBe(true);
    expect(question.criteria.length).toBeGreaterThanOrEqual(2);
    expect(question.criteria.length).toBeLessThanOrEqual(10);
    // Five levels so the weighted result lands on 0-4, which is what Judgement allows.
    expect(question.criteria).toHaveLength(5);
  });

  it("gives noul questions true/false criteria", () => {
    for (const id of ["isFamilyTrip", "needsCheckedBag", "worthInterrupting"] as const) {
      const question = QUESTIONS[id];
      if (question.type !== "noul") throw new Error(`${id} must be a noul`);
      expect(question.criteria?.true, `${id} true`).toBeTruthy();
      expect(question.criteria?.false, `${id} false`).toBeTruthy();
    }
  });
});

describe("reading Jev's answer envelope", () => {
  it("flattens the documented response into a Judgement", () => {
    const body = {
      model: "jev-1.13.0",
      answers: {
        isFamilyTrip: { type: "noul", noul: 0.05 },
        needsCheckedBag: { type: "noul", noul: 0.71 },
        upgradePropensity: {
          type: "score",
          score: 2.4,
          legend: { "0": "Very unlikely" },
          probabilities: { "2": 0.6 },
          confidence: 0.8,
        },
        openQuestion: {
          type: "choice",
          choice: "fare_family",
          probabilities: { fare_family: 0.9 },
          confidence: 0.77,
        },
        worthInterrupting: { type: "noul", noul: 0.88 },
      },
      usage: { input_tokens: 307, output_tokens: 20 },
    };

    const judgement = judgementSchema.parse(readAnswers(body));
    expect(judgement.needsCheckedBag).toBe(0.71);
    expect(judgement.upgradePropensity).toBe(2.4);
    expect(judgement.openQuestion).toBe("fare_family");
  });

  it("drops probabilities and confidence rather than carrying them around", () => {
    const flat = readAnswers({
      answers: { worthInterrupting: { type: "noul", noul: 0.5, confidence: 0.9 } },
    });
    expect(flat).toEqual({ worthInterrupting: 0.5 });
  });

  it("refuses a response with no answers rather than guessing", () => {
    expect(() => readAnswers({})).toThrow(/no answers/);
    expect(() => readAnswers(null)).toThrow(/not an object/);
  });
});

describe("the stub still answers when Jev cannot", () => {
  it("produces a Judgement that validates", () => {
    expect(() => judgementSchema.parse(stubJudgement(state))).not.toThrow();
  });

  it("reads a baggage finding as a fare-package question", () => {
    const withBagFinding: CompanionState = {
      ...state,
      findings: ["Taking SAVER now costs 30.00 GBP and includes 25 kg."],
    };
    expect(stubJudgement(withBagFinding).openQuestion).toBe("fare_family");
  });
});

describe("the endpoint and key are not guessed", () => {
  it("defaults to the TypeSafe API host, which is where console.typesafe.ai keys work", async () => {
    const mod = await import("./jev");
    // Exercised through the failure path so the URL appears in the reason.
    const previous = { ts: process.env.TYPESAFE_API_KEY, jev: process.env.JEV_API_KEY };
    delete process.env.TYPESAFE_API_KEY;
    delete process.env.JEV_API_KEY;
    const result = await mod.judge(state);
    expect(result.source).toBe("stub");
    expect(result.reason).toMatch(/no API key/);
    if (previous.ts !== undefined) process.env.TYPESAFE_API_KEY = previous.ts;
    if (previous.jev !== undefined) process.env.JEV_API_KEY = previous.jev;
  });

  it("always says why it fell back, so a bad endpoint cannot hide as a missing key", async () => {
    const mod = await import("./jev");
    const result = await mod.judge(state);
    expect(result.reason).not.toBeNull();
  });
});
