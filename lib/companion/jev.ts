import { judgementSchema, type CompanionState, type Judgement } from "./types";

/**
 * Jev client.
 *
 * Jev is TypeSafe AI's decision-only model: it returns typed values (Choice,
 * Score, Noul) rather than text, in 70-500ms. That latency is why the companion
 * can judge every state change rather than sampling, and why this call can sit in
 * a request path at all.
 *
 * Two things this file is careful about:
 *
 * 1. **It works with no API key.** `stubJudgement` below is deterministic and
 *    good enough to demo and to test against. A hackathon demo that dies because
 *    an external API rate-limited is a demo that does not happen.
 * 2. **No arithmetic or date comparison is ever asked of Jev.** Those are its
 *    documented weak spots. Comparisons arrive pre-computed in `state.findings`.
 */

const ENDPOINT = "https://api.thejevai.com/v1/decide";

type JevQuestion =
  | { type: "noul"; instructions: string }
  | { type: "score"; instructions: string; levels: number }
  | { type: "choice"; instructions: string; options: string[] };

const QUESTIONS: Record<string, JevQuestion> = {
  isFamilyTrip: {
    type: "noul",
    instructions:
      "Is this party travelling as a family with children? Consider only the party composition given.",
  },
  needsCheckedBag: {
    type: "noul",
    instructions:
      "Is checked baggage likely to be required for this trip, given the party, route and trip length described?",
  },
  upgradePropensity: {
    type: "score",
    instructions:
      "How likely is this passenger to pay for a chosen seat or extra legroom? 0 is very unlikely, 4 is very likely.",
    levels: 5,
  },
  openQuestion: {
    type: "choice",
    instructions:
      "What does this passenger appear to be stuck on? Choose 'none' if they show no sign of hesitating.",
    options: [
      "which_date",
      "waiting_for_price",
      "fare_family",
      "seat_choice",
      "waiting_on_companion",
      "none",
    ],
  },
  worthInterrupting: {
    type: "noul",
    instructions:
      "Would an unprompted notification right now be welcome rather than annoying? Consider how many times this passenger has already been interrupted and whether anything has actually changed for them.",
  },
};

export function jevConfigured(): boolean {
  return Boolean(process.env.JEV_API_KEY);
}

/**
 * Deterministic stand-in for Jev.
 *
 * Rules, not randomness, so tests can assert on it and the demo is repeatable.
 * It is intentionally cruder than the real model: the point is that swapping Jev
 * in should visibly improve the judgements, not be the only reason they exist.
 */
export function stubJudgement(state: CompanionState): Judgement {
  const children = state.party.children + state.party.infants;
  const returning = (state.hoursSinceLastVisit ?? 0) > 6 || state.visits > 1;
  const priceFinding = state.findings.some((f) => /price|fare|cheaper|dropped|below/i.test(f));
  const dateFinding = state.findings.some((f) => /date|day|earlier|later/i.test(f));

  const openQuestion: Judgement["openQuestion"] = priceFinding
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

  const spentBudget = state.interruptionsSoFar;
  const hasNews = state.findings.length > 0;
  const worthInterrupting = !hasNews
    ? 0.15
    : spentBudget === 0
      ? 0.88
      : spentBudget === 1
        ? 0.7
        : spentBudget === 2
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

/**
 * Ask Jev for all five judgements in one call. They are evaluated in parallel
 * against the same state, so asking five costs barely more than asking one.
 *
 * Falls back to the stub on any failure. A 429 or a cold network must degrade the
 * companion's judgement, never break the booking journey underneath it.
 */
export async function judge(state: CompanionState): Promise<{
  judgement: Judgement;
  source: "jev" | "stub";
  elapsedMs: number;
}> {
  const startedAt = Date.now();

  if (!jevConfigured()) {
    return {
      judgement: stubJudgement(state),
      source: "stub",
      elapsedMs: Date.now() - startedAt,
    };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.JEV_API_KEY}`,
      },
      body: JSON.stringify({ model: "jev-latest", state, questions: QUESTIONS }),
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) throw new Error(`Jev returned HTTP ${response.status}`);

    const body: unknown = await response.json();
    return {
      judgement: judgementSchema.parse(readAnswers(body)),
      source: "jev",
      elapsedMs: Date.now() - startedAt,
    };
  } catch {
    // Deliberately swallowed: the caller gets a usable judgement either way, and
    // `source` tells the demo panel which one it is looking at.
    return {
      judgement: stubJudgement(state),
      source: "stub",
      elapsedMs: Date.now() - startedAt,
    };
  }
}

/** Flatten Jev's `{answers: {id: {type, noul|score|choice}}}` into our shape. */
function readAnswers(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null) throw new Error("Jev body was not an object");
  const answers = (body as { answers?: unknown }).answers;
  if (typeof answers !== "object" || answers === null)
    throw new Error("Jev body had no answers");

  const out: Record<string, unknown> = {};
  for (const [id, answer] of Object.entries(answers as Record<string, unknown>)) {
    if (typeof answer !== "object" || answer === null) continue;
    const a = answer as { noul?: number; score?: number; choice?: string };
    out[id] = a.noul ?? a.score ?? a.choice;
  }
  return out;
}
