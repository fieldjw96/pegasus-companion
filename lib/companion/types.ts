import { z } from "zod";

/**
 * The companion's world model.
 *
 * This is deliberately small. Jev's documented failure mode is that a large noisy
 * state distracts it, and more importantly a payload that carries everything the
 * app knows is a payload that leaks everything the app knows. Curate here; do not
 * spread the booking object.
 *
 * Every field must be something the agent genuinely needs to decide whether to
 * speak. If a field cannot be justified that way, it does not belong.
 */
export const companionStateSchema = z.object({
  /** Where the passenger is in the journey. */
  step: z.enum([
    "search",
    "results",
    "fare",
    "passengers",
    "seats",
    "baggage",
    "extras",
    "payment",
    "confirmation",
  ]),
  route: z.string(),
  departDate: z.string(),
  party: z.object({
    adults: z.number().int(),
    children: z.number().int(),
    infants: z.number().int(),
  }),
  /** Which fares and flights they have looked at but not bought. */
  shortlist: z.array(z.string()).default([]),
  /** Visit count across the whole deliberation, not this session. */
  visits: z.number().int().min(1).default(1),
  hoursSinceLastVisit: z.number().nonnegative().nullable().default(null),
  /**
   * Comparisons are computed in code and passed as findings, never asked of Jev.
   * Jev treats dates as text and does not do arithmetic; asking it "is this
   * cheaper" or "how many days until departure" produces confident nonsense.
   */
  findings: z.array(z.string()).default([]),
  /** How many times the companion has already spoken this deliberation. */
  interruptionsSoFar: z.number().int().nonnegative().default(0),
});

export type CompanionState = z.infer<typeof companionStateSchema>;

/** The typed judgements the companion asks for. Mirrors Jev's three primitives. */
export const judgementSchema = z.object({
  /** Noul: probability this is a family trip. */
  isFamilyTrip: z.number().min(0).max(1),
  /** Noul: probability checked baggage is actually needed. */
  needsCheckedBag: z.number().min(0).max(1),
  /** Score 0-4: appetite for a paid seat or extra legroom. */
  upgradePropensity: z.number().min(0).max(4),
  /** Choice: what the passenger appears to be stuck on. */
  openQuestion: z.enum([
    "which_date",
    "waiting_for_price",
    "fare_family",
    "seat_choice",
    "waiting_on_companion",
    "none",
  ]),
  /** Noul: would speaking right now be welcome rather than annoying? */
  worthInterrupting: z.number().min(0).max(1),
});

export type Judgement = z.infer<typeof judgementSchema>;

/** What the companion actually does, once it has decided to act. */
export type Intervention = {
  /** Where it shows up. The brief's in-scope channels. */
  channel: "inline" | "sheet" | "push" | "lock-screen" | "email";
  headline: string;
  detail: string;
  /** The single action offered. One, never a menu: a menu is a chatbot. */
  action: { label: string; href: string } | null;
  /** Why it spoke. Rendered in the demo so restraint is visible. */
  rationale: string;
  judgement: Judgement;
};

/**
 * The interruption budget.
 *
 * Pillar 4 of the brief is "acts on its own initiative", which is only impressive
 * if the agent also declines to act. A fixed allowance makes restraint a property
 * of the system rather than a promise in a slide.
 */
export const INTERRUPTION_BUDGET = 3;

/** Below this, the companion stays quiet however interesting the state is. */
export const INTERRUPT_THRESHOLD = 0.62;
