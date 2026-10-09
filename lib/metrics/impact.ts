import type { TripDraft } from "@/lib/assistant/draft";
import { breakdown } from "@/lib/assistant/price";
import { BREAKFAST, FRIENDS, buildInviteeDraft, inviteeExtras } from "@/lib/group/group";
import { stayFor } from "@/lib/group/stay";
import { JESS, jessDraft } from "@/lib/demo/personas";
import { COMPANION_TAPS, TODAY_TAPS_PER_BOOKING } from "./taps";

/**
 * What the companion is worth, in numbers that move as the demo moves.
 *
 * Every figure is computed from the same drafts and prices the screens print,
 * against a stated model of the app as it is today. The model is simple and
 * it is written down here, because a comparison nobody can check reads as a
 * boast. Today's app: sells the fare it opens on (LIGHT), sells add-ons at the
 * till where most are declined, sells one return where the companion routes
 * four sectors, and gives nobody a reason to join. The three friends still
 * book today; they just book less, and tap more.
 */
export type Figures = {
  /** GBP, to the penny. */
  revenue: number;
  /** GBP of fare uplift, seats, bags, meals and gifts: everything above the opening fare. */
  addOns: number;
  /** Touches between the first tap and "paid", across everyone who booked. Fewer is better. */
  taps: number;
  /** People who joined the app because of the companion: Will, and a parent each. */
  newUsers: number;
};

export type Impact = {
  companion: Figures;
  today: Figures;
  /** What moved most recently, for the panel to call out. */
  assumptions: string[];
};

/** The slice of the demo's state the figures read. Structurally the journey state. */
export type ImpactState = {
  draft: TripDraft | null;
  booked: boolean;
  invited: string[];
  inviteesBooked: Record<string, string | null>;
  breakfast: boolean;
  hostel: "booked" | "declined" | null;
  dadTold: boolean;
};

const ZERO: Figures = { revenue: 0, addOns: 0, taps: 0, newUsers: 0 };
const round = (n: number) => Math.round(n * 100) / 100;

function add(a: Figures, b: Partial<Figures>): Figures {
  return {
    revenue: round(a.revenue + (b.revenue ?? 0)),
    addOns: round(a.addOns + (b.addOns ?? 0)),
    taps: a.taps + (b.taps ?? 0),
    newUsers: a.newUsers + (b.newUsers ?? 0),
  };
}

/**
 * The fare the funnel opens on: LIGHT, no bag, no seat. What today's app sells.
 * On a multi-stop trip, today's app sells one return to the first stop; the
 * onward legs are bought elsewhere, so they are not Pegasus revenue.
 */
export function openingFare(draft: TripDraft): number {
  const first = draft.stops.value[0];
  return breakdown({
    ...draft,
    ...(first === undefined
      ? {}
      : {
          destination: { value: first.code, source: "predicted" as const, why: "" },
          stops: { value: [], source: "predicted" as const, why: "" },
        }),
    package: { value: "light", source: "predicted", why: "" },
    checkedKg: { value: 0, source: "predicted", why: "" },
    cabinBag: { value: false, source: "predicted", why: "" },
    seating: { value: "none", source: "predicted", why: "" },
    flexibility: { value: "none", source: "predicted", why: "" },
  }).total;
}

export const ASSUMPTIONS = [
  "Today's app sells the fare it opens on, LIGHT, and offers the bag and seat at the till.",
  "Today's app sells one return to Istanbul; the onward legs are bought elsewhere.",
  "The three friends book today too, on LIGHT, without the app. Nobody joins.",
  `Clicks are touches between the first tap and paid, keystrokes not counted. Today's ${TODAY_TAPS_PER_BOOKING} a booking are read screen by screen off the live journey: search, two flights, two packages, passenger details, seats, bags, extras, card.`,
  "A stay booked through the app counts its commission, 12% of the total. Today's app sells no stays.",
  "Today, nobody messages Dad. When Jess keeps him posted, each of the three adds a parent; only Dad's phone is shown.",
];

export function impactOf(state: ImpactState): Impact {
  let companion = ZERO;
  let today = ZERO;

  // Journey 1: Jess.
  const jess = state.draft ?? jessDraft();
  if (state.booked) {
    const total = breakdown(jess).total;
    const base = openingFare(jess);
    companion = add(companion, {
      revenue: total,
      addOns: total - base,
      taps: COMPANION_TAPS.organiser,
    });
    today = add(today, { revenue: base, taps: TODAY_TAPS_PER_BOOKING });
  }
  const me = JESS.travellers[0]?.name ?? "Jess Carter";
  let friendsBooked = 0;
  for (const friend of FRIENDS) {
    if (!(friend.name in state.inviteesBooked)) continue;
    friendsBooked += 1;
    const draft = buildInviteeDraft(jess, friend, me);
    const extras = inviteeExtras(jess, friend, me).reduce((a, l) => a + l.amount, 0);
    const total = breakdown(draft).total + extras;
    const base = openingFare(draft);
    companion = add(companion, {
      revenue: total,
      addOns: total - base,
      taps: COMPANION_TAPS.invitee,
      newUsers: friend.account ? 0 : 1,
    });
    today = add(today, { revenue: base, taps: TODAY_TAPS_PER_BOOKING });
  }
  // Jess's one tap that sent the trip on, counted once the first friend books off it.
  if (friendsBooked > 0) companion = add(companion, { taps: COMPANION_TAPS.send });
  if (state.breakfast) {
    const squad = 1 + Object.keys(state.inviteesBooked).length;
    companion = add(companion, {
      revenue: BREAKFAST.each * squad,
      addOns: BREAKFAST.each * squad,
    });
  }

  if (state.hostel === "booked") {
    const stay = stayFor(state.draft ?? jessDraft());
    companion = add(companion, { revenue: stay.commission, addOns: stay.commission });
  }

  // A parent for each of the squad: Jess's Dad, and one each for the friends the trip is for.
  if (state.dadTold) {
    const squad = 1 + (state.invited.length > 0 ? state.invited.length : FRIENDS.length);
    companion = add(companion, { newUsers: squad });
  }

  return { companion, today, assumptions: ASSUMPTIONS };
}
