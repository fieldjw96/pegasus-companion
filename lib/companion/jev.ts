import { judgementSchema, type CompanionState, type Judgement } from "./types";

/**
 * Jev client.
 *
 * Jev is TypeSafe AI's decision-only model: it returns typed values (Choice,
 * Score, Noul) rather than text, in 70-500ms. That latency is why the Companion
 * can judge every state change rather than sampling, and why this call can sit in
 * a request path at all.
 *
 * Two things this file is careful about:
 *
 * 1. **It works with no API key.** `stubJudgement` is deterministic and good
 *    enough to demo and to test against. A demo that dies because an external
 *    API rate-limited is a demo that does not happen.
 * 2. **No arithmetic or date comparison is ever asked of Jev.** Those are its
 *    documented weak spots. Comparisons arrive pre-computed in `state.findings`.
 *
 * It also reports *why* it fell back. An earlier version swallowed the reason,
 * which meant a wrong endpoint URL and a missing key looked identical from the
 * outside: both just said "stub". `reason` exists so the demo panel can tell the
 * difference, and so the next mistake of this kind is visible in one glance.
 */

/**
 * Where Jev lives.
 *
 * TypeSafe AI is the vendor and `api.typesafe.ai` is its API host; keys are
 * issued from `console.typesafe.ai`. A secondary docs site (thejevai.com)
 * documents the same `/v1/systemone` path against its own host, so the base is
 * configurable rather than hardcoded — the first version of this file guessed
 * `api.thejevai.com/v1/decide`, which exists nowhere, and the client's silent
 * fallback meant the only symptom was "running on the stub".
 */
const BASE_URL = process.env.TYPESAFE_BASE_URL ?? "https://api.typesafe.ai";
const ENDPOINT = `${BASE_URL}/v1/systemone`;

/**
 * The vendor documents `TYPESAFE_API_KEY`. `JEV_API_KEY` is accepted too because
 * it reads better next to everything else here, and because it is already set on
 * the deployment.
 */
function apiKey(): string | undefined {
  return process.env.TYPESAFE_API_KEY ?? process.env.JEV_API_KEY;
}

/**
 * Question definitions in Jev's own shape.
 *
 * Every type takes `criteria`, and its meaning differs by type:
 *   noul   - optional {true, false} descriptions
 *   choice - an object mapping each option to a description
 *   score  - an ordered array of 2-10 level labels, returned as a weighted index
 */
type JevQuestion =
  | { type: "noul"; instructions: string; criteria?: { true: string; false: string } }
  | { type: "score"; instructions: string; criteria: string[] }
  | { type: "choice"; instructions: string; criteria: Record<string, string> };

export const QUESTIONS: Record<keyof Judgement, JevQuestion> = {
  isFamilyTrip: {
    type: "noul",
    instructions: "Is this party travelling as a family with children?",
    criteria: {
      true: "The party includes at least one child or infant",
      false: "Adults only",
    },
  },
  needsCheckedBag: {
    type: "noul",
    instructions:
      "Is checked baggage likely to be required for this trip, given the party, route and trip length described?",
    criteria: {
      true: "A trip of this shape normally needs a hold bag",
      false: "Cabin baggage would plausibly be enough",
    },
  },
  upgradePropensity: {
    type: "score",
    instructions: "How likely is this passenger to pay for a chosen seat or extra legroom?",
    // Five ordered levels, returned as a weighted 0-4, matching the Judgement type.
    criteria: ["Very unlikely", "Unlikely", "Might", "Likely", "Very likely"],
  },
  openQuestion: {
    type: "choice",
    instructions: "What does this passenger appear to be stuck on?",
    criteria: {
      which_date: "Weighing two or more travel dates against each other",
      waiting_for_price: "Waiting to see whether the fare moves before committing",
      fare_family: "Undecided between fare packages or what baggage they need",
      seat_choice: "Undecided about paying to choose a seat",
      waiting_on_companion: "Blocked on another person before they can book",
      none: "Showing no sign of hesitating",
    },
  },
  worthInterrupting: {
    type: "noul",
    instructions:
      "Would an unprompted notification right now be welcome rather than annoying? Consider how many times this passenger has already been interrupted and whether anything has actually changed for them.",
    criteria: {
      true: "Something material changed and they have not been interrupted much",
      false: "Nothing has changed, or they have already been interrupted enough",
    },
  },
};

export function jevConfigured(): boolean {
  return Boolean(apiKey());
}

/**
 * Deterministic stand-in for Jev.
 *
 * Rules, not randomness, so tests can assert on it and the demo is repeatable.
 * Intentionally cruder than the real model: swapping Jev in should visibly
 * improve the judgements, not be the only reason they exist.
 */
export function stubJudgement(state: CompanionState): Judgement {
  const children = state.party.children + state.party.infants;
  const returning = (state.hoursSinceLastVisit ?? 0) > 6 || state.visits > 1;
  const priceFinding = state.findings.some((f) => /price|fare|cheaper|dropped|below/i.test(f));
  const dateFinding = state.findings.some((f) => /date|day|earlier|later/i.test(f));
  const bagFinding = state.findings.some((f) => /baggage|bag|kg|SAVER|LIGHT/i.test(f));

  const openQuestion: Judgement["openQuestion"] = bagFinding
    ? "fare_family"
    : priceFinding
      ? "waiting_for_price"
      : dateFinding
        ? "which_date"
        : state.step === "fare"
          ? "fare_family"
          : state.step === "seats"
            ? "seat_choice"
            : returning
              ? "waiting_for_price"
              : "none";

  const spent = state.interruptionsSoFar;
  const hasNews = state.findings.length > 0;
  const worthInterrupting = !hasNews
    ? 0.15
    : spent === 0
      ? 0.88
      : spent === 1
        ? 0.7
        : spent === 2
          ? 0.45
          : 0.1;

  return {
    isFamilyTrip: children > 0 ? 0.95 : 0.05,
    needsCheckedBag: children > 0 ? 0.82 : state.party.adults > 1 ? 0.55 : 0.3,
    upgradePropensity: children > 0 ? 3 : state.party.adults > 1 ? 2 : 1,
    openQuestion,
    worthInterrupting,
  };
}

export type JudgeResult = {
  judgement: Judgement;
  source: "jev" | "stub";
  elapsedMs: number;
  /** Why the stub was used. Null when Jev answered. */
  reason: string | null;
};

/**
 * Ask Jev for all five judgements in one call. They are evaluated in parallel
 * against the same state, so asking five costs barely more than asking one.
 *
 * Falls back to the stub on any failure, and always says why. A 429 or a cold
 * network must degrade the Companion's judgement, never break the booking
 * journey underneath it.
 */
export async function judge(state: CompanionState): Promise<JudgeResult> {
  const startedAt = Date.now();
  const fallback = (reason: string): JudgeResult => ({
    judgement: stubJudgement(state),
    source: "stub",
    elapsedMs: Date.now() - startedAt,
    reason,
  });

  const key = apiKey();
  if (key === undefined || key === "") {
    return fallback("no API key: set TYPESAFE_API_KEY (or JEV_API_KEY)");
  }

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: "jev-latest", state, questions: QUESTIONS }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    return fallback(`could not reach ${ENDPOINT}: ${describe(error)}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const hint =
      response.status === 401
        ? " (key rejected)"
        : response.status === 422
          ? " (question definitions malformed)"
          : response.status === 429
            ? " (rate limited)"
            : "";
    return fallback(`Jev returned HTTP ${response.status}${hint}: ${body.slice(0, 160)}`);
  }

  try {
    const parsed = judgementSchema.parse(readAnswers(await response.json()));
    return {
      judgement: parsed,
      source: "jev",
      elapsedMs: Date.now() - startedAt,
      reason: null,
    };
  } catch (error) {
    return fallback(`Jev answered but the shape was unexpected: ${describe(error)}`);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Flatten Jev's `{answers: {id: {type, noul|score|choice}}}` into our shape.
 *
 * Each answer also carries probabilities, confidence and (for scores) a legend.
 * Those are deliberately dropped: the Companion thresholds on the value alone,
 * and carrying the rest would invite someone to start reasoning about it.
 */
export function readAnswers(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null) throw new Error("response was not an object");
  const answers = (body as { answers?: unknown }).answers;
  if (typeof answers !== "object" || answers === null)
    throw new Error("response had no answers");

  const out: Record<string, unknown> = {};
  for (const [id, answer] of Object.entries(answers as Record<string, unknown>)) {
    if (typeof answer !== "object" || answer === null) continue;
    const a = answer as { noul?: number; score?: number; choice?: string };
    out[id] = a.noul ?? a.score ?? a.choice;
  }
  return out;
}
