import { FARE_RULES, LIGHT_TO_SAVER_UPSELL, formatFare } from "./flights";

/**
 * Baggage economics.
 *
 * Every number here is read off the live app, not modelled:
 *
 *   Package selection      SAVER is +30.00 over LIGHT, and includes an 8 kg
 *                          cabin bag plus 25 kg checked.
 *   Upgrade interstitial   The same upgrade, offered after LIGHT is chosen,
 *                          costs 59.00.
 *   Baggage Selection      A la carte: cabin 17.00, 12 kg 20.00, 20 kg 41.00.
 *                          The 41.00 option carries a "Recommended" badge.
 *
 * Put together, SAVER strictly dominates: it is the cheapest way to get a cabin
 * bag and a checked bag, and it gives the most allowance. Every other route the
 * funnel offers is worse on both axes, and the one the app recommends is among
 * the worst. That is the whole argument for the Companion existing at this step.
 *
 * All of this is arithmetic and lives in code. The judgement layer cannot count
 * and is never asked to; it receives a finished sentence and decides only
 * whether saying it is welcome.
 */

export const BAGGAGE_PRICES = {
  cabin: 17,
  checked12: 20,
  checked20: 41,
} as const;

/** The option the live app badges "Recommended" on the Baggage Selection screen. */
export const APP_RECOMMENDED = "checked20" as const;

export type BaggagePath = {
  id: string;
  label: string;
  /** Cost over the LIGHT base fare, in GBP. */
  cost: number;
  /** Checked allowance in kg. */
  checkedKg: number;
  cabinBag: boolean;
  /** True for the option the app itself pushes. */
  appRecommended: boolean;
};

/** Every way a passenger can end up with a cabin bag and a checked bag. */
export function baggagePaths(): BaggagePath[] {
  return [
    {
      id: "saver",
      label: "Take SAVER at package selection",
      cost: FARE_RULES.saver.uplift,
      checkedKg: 25,
      cabinBag: true,
      appRecommended: false,
    },
    {
      id: "upsell",
      label: "Stay on LIGHT, accept the upgrade offer",
      cost: LIGHT_TO_SAVER_UPSELL,
      checkedKg: 20,
      cabinBag: true,
      appRecommended: false,
    },
    {
      id: "alacarte20",
      label: "Stay on LIGHT, buy cabin + 20 kg separately",
      cost: BAGGAGE_PRICES.cabin + BAGGAGE_PRICES.checked20,
      checkedKg: 20,
      cabinBag: true,
      appRecommended: true,
    },
    {
      id: "alacarte12",
      label: "Stay on LIGHT, buy cabin + 12 kg separately",
      cost: BAGGAGE_PRICES.cabin + BAGGAGE_PRICES.checked12,
      checkedKg: 12,
      cabinBag: true,
      appRecommended: false,
    },
  ];
}

export type BaggageVerdict = {
  best: BaggagePath;
  /** Paths that cost more AND give no more allowance than `best`. */
  dominated: BaggagePath[];
  /** The worst path the funnel will walk a passenger into. */
  worst: BaggagePath;
  /** What the app's own "Recommended" badge points at. */
  recommendedByApp: BaggagePath;
  /** One sentence, ready to hand to the judgement layer. */
  finding: string;
};

/**
 * Compare every path and say which wins.
 *
 * "Dominated" is the strong claim and the one worth making to a jury: a path is
 * dominated when it costs more and carries no more baggage. That is not a matter
 * of taste, and it cannot be argued with.
 */
export function compareBaggagePaths(): BaggageVerdict {
  const paths = baggagePaths();

  const best = paths.reduce((cheapest, path) => {
    if (path.cost < cheapest.cost) return path;
    if (path.cost === cheapest.cost && path.checkedKg > cheapest.checkedKg) return path;
    return cheapest;
  });

  const worst = paths.reduce((most, path) => (path.cost > most.cost ? path : most));

  const dominated = paths.filter(
    (path) => path.id !== best.id && path.cost > best.cost && path.checkedKg <= best.checkedKg,
  );

  const recommendedByApp = paths.find((p) => p.appRecommended) ?? worst;

  const gapToRecommended = Math.round((recommendedByApp.cost - best.cost) * 100) / 100;
  const kgDifference = best.checkedKg - recommendedByApp.checkedKg;

  const finding =
    `Taking SAVER now costs ${formatFare(best.cost)} GBP and includes ${best.checkedKg} kg. ` +
    `Buying the same baggage later costs up to ${formatFare(worst.cost)} GBP, and the option this app ` +
    `recommends is ${formatFare(gapToRecommended)} GBP more for ${kgDifference} kg less.`;

  return { best, dominated, worst, recommendedByApp, finding };
}
