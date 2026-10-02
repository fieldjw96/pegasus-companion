import { judge } from "./jev";
import {
  INTERRUPTION_BUDGET,
  INTERRUPT_THRESHOLD,
  type CompanionState,
  type Intervention,
  type Judgement,
} from "./types";

/**
 * Turn a judgement into an intervention, or into silence.
 *
 * The decision to stay quiet is the interesting half. Three gates, in order, and
 * each one on its own is enough to silence the companion:
 *
 *   1. The interruption budget is spent.
 *   2. Nothing has actually changed for this passenger.
 *   3. The judgement says a notification would not be welcome.
 *
 * Only then does it choose what to say, and it says exactly one thing.
 */
export function chooseIntervention(
  state: CompanionState,
  judgement: Judgement,
): Intervention | null {
  if (state.interruptionsSoFar >= INTERRUPTION_BUDGET) return null;
  if (judgement.openQuestion === "none") return null;
  if (judgement.worthInterrupting < INTERRUPT_THRESHOLD) return null;

  const finding = state.findings[0] ?? null;
  const away = state.step === "search" && state.visits > 1;
  const channel: Intervention["channel"] = away ? "push" : "inline";

  switch (judgement.openQuestion) {
    case "waiting_for_price":
      if (finding === null) return null;
      return {
        channel,
        headline: "That changes your comparison",
        detail: finding,
        action: { label: "See the two together", href: "/results" },
        rationale: `You were weighing two options and one of them moved. Spoke because a fact changed, not because time passed. (worthInterrupting ${judgement.worthInterrupting.toFixed(2)})`,
        judgement,
      };

    case "which_date":
      return {
        headline: "One day either side is cheaper",
        detail: finding ?? "Shifting your outbound by a day lowers the fare on this route.",
        channel,
        action: { label: "Compare nearby dates", href: "/results" },
        rationale: `Hesitation looked date-shaped rather than price-shaped. (worthInterrupting ${judgement.worthInterrupting.toFixed(2)})`,
        judgement,
      };

    case "fare_family": {
      /*
       * The strongest thing this Companion can say, and the one the live app
       * does the opposite of.
       *
       * Choosing LIGHT and then accepting the baggage interstitial costs 59.00
       * GBP for inclusions that were 30.00 GBP on the previous screen. A
       * passenger who picks the cheaper fare ends up 29.00 worse off than one
       * who picked SAVER outright, and nothing in the funnel tells them.
       *
       * The arithmetic is done on the screen and arrives here as a Finding, so
       * this branch only decides whether saying it is welcome.
       */
      const gapFinding = state.findings.find((f) => /worse off/i.test(f));
      if (gapFinding !== undefined) {
        return {
          channel: "inline",
          headline: "Taking SAVER now is cheaper than adding a bag later",
          detail: gapFinding,
          action: { label: "Switch to SAVER", href: "/fare?package=saver" },
          rationale: `The baggage upsell after this screen is priced above the same inclusions on it. Said so because the passenger cannot see the next screen yet, and needsCheckedBag is ${judgement.needsCheckedBag.toFixed(2)}.`,
          judgement,
        };
      }
      return {
        channel: "inline",
        headline: bagHeadline(judgement),
        detail: bagDetail(judgement),
        action: { label: "Use that fare", href: "/fare" },
        rationale: `Stuck between fares, and the baggage judgement decides it. needsCheckedBag ${judgement.needsCheckedBag.toFixed(2)}, family ${judgement.isFamilyTrip.toFixed(2)}.`,
        judgement,
      };
    }

    case "seat_choice":
      return {
        channel: "inline",
        headline:
          judgement.isFamilyTrip > 0.5
            ? "Seats together are going"
            : "Worth choosing a seat on this one",
        detail:
          judgement.isFamilyTrip > 0.5
            ? "Only a few rows still have three seats side by side on this flight."
            : "This aircraft fills from the front. Choosing now costs less than at check-in.",
        action: { label: "Pick seats", href: "/seats" },
        rationale: `Seat step with upgradePropensity ${judgement.upgradePropensity.toFixed(1)} and family ${judgement.isFamilyTrip.toFixed(2)}.`,
        judgement,
      };

    case "waiting_on_companion":
      return {
        channel: "email",
        headline: "Send this to whoever you are waiting on",
        detail: "They can add their dates without the app, and you will both see one answer.",
        action: { label: "Share the choice", href: "/results" },
        rationale: `Deliberation looked like it was blocked on another person, so the useful channel is one they can reach without the app.`,
        judgement,
      };

    default:
      return null;
  }
}

function bagHeadline(judgement: Judgement): string {
  return judgement.needsCheckedBag > 0.6 ? "SAVER works out cheaper here" : "LIGHT is enough";
}

function bagDetail(judgement: Judgement): string {
  return judgement.needsCheckedBag > 0.6
    ? "This trip looks like it needs a checked bag, and SAVER includes 25 kg rather than charging for it later."
    : "Nothing in this trip looks like it needs a checked bag. LIGHT covers the underseat bag.";
}

/** The whole decision, judgement and all. What the API route calls. */
export async function decide(state: CompanionState): Promise<{
  intervention: Intervention | null;
  judgement: Judgement;
  source: "jev" | "stub";
  elapsedMs: number;
}> {
  const { judgement, source, elapsedMs } = await judge(state);
  return { intervention: chooseIntervention(state, judgement), judgement, source, elapsedMs };
}
