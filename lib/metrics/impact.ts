import type { TripDraft } from "@/lib/assistant/draft";
import { breakdown } from "@/lib/assistant/price";
import { BREAKFAST, FRIENDS, buildInviteeDraft, inviteeExtras } from "@/lib/group/group";
import { stayFor } from "@/lib/group/stay";
import { GIFTS } from "@/lib/moments/moments";
import { EMRE, WILL, emreDraft, willDraft } from "@/lib/demo/personas";

/**
 * What the companion is worth, in numbers that move as the demo moves.
 *
 * Every figure is computed from the same drafts and prices the screens print,
 * against a stated model of the app as it is today. The model is simple and
 * it is written down here, because a comparison nobody can check reads as a
 * boast. Today's app: sells the fare it opens on (LIGHT), sells add-ons at the
 * till where most are declined, sells one return where the companion routes
 * four sectors, and gives nobody a reason to join. The three friends still
 * book today; they just book less.
 */
export type Figures = {
  bookings: number;
  /** GBP, to the penny. */
  revenue: number;
  /** GBP of fare uplift, seats, bags, meals and gifts: everything above the opening fare. */
  addOns: number;
  /** People who joined the app because of the companion: Tom, Dad. */
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
  emre: {
    draft: TripDraft | null;
    booked: boolean;
    gifts: boolean;
    nextYear: boolean;
    dadTold: boolean;
  };
};

const ZERO: Figures = { bookings: 0, revenue: 0, addOns: 0, newUsers: 0 };
const round = (n: number) => Math.round(n * 100) / 100;

function add(a: Figures, b: Partial<Figures>): Figures {
  return {
    bookings: a.bookings + (b.bookings ?? 0),
    revenue: round(a.revenue + (b.revenue ?? 0)),
    addOns: round(a.addOns + (b.addOns ?? 0)),
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
  "A stay booked through the app counts its commission, 12% of the total. Today's app sells no stays.",
  "Today, Emre books late in May on LIGHT; nobody messages Dad.",
];

export function impactOf(state: ImpactState): Impact {
  let companion = ZERO;
  let today = ZERO;

  // Journey 1: Will.
  const will = state.draft ?? willDraft();
  if (state.booked) {
    const total = breakdown(will).total;
    const base = openingFare(will);
    companion = add(companion, { bookings: 1, revenue: total, addOns: total - base });
    today = add(today, { bookings: 1, revenue: base });
  }
  const me = WILL.travellers[0]?.name ?? "Will Parker";
  for (const friend of FRIENDS) {
    if (!(friend.name in state.inviteesBooked)) continue;
    const draft = buildInviteeDraft(will, friend, me);
    const extras = inviteeExtras(will, friend, me).reduce((a, l) => a + l.amount, 0);
    const total = breakdown(draft).total + extras;
    const base = openingFare(draft);
    companion = add(companion, {
      bookings: 1,
      revenue: total,
      addOns: total - base,
      newUsers: friend.account ? 0 : 1,
    });
    today = add(today, { bookings: 1, revenue: base });
  }
  if (state.breakfast) {
    const squad = 1 + Object.keys(state.inviteesBooked).length;
    companion = add(companion, {
      revenue: BREAKFAST.each * squad,
      addOns: BREAKFAST.each * squad,
    });
  }

  if (state.hostel === "booked") {
    const stay = stayFor(state.draft ?? willDraft());
    companion = add(companion, { revenue: stay.commission, addOns: stay.commission });
  }

  // Journey 2: Emre.
  if (state.emre.booked) {
    const draft = state.emre.draft ?? emreDraft();
    const gifts = state.emre.gifts ? GIFTS.extraWeight.perLeg + GIFTS.delight.perLeg : 0;
    const total = breakdown(draft).total + gifts;
    const base = openingFare(draft);
    companion = add(companion, { bookings: 1, revenue: total, addOns: total - base });
    today = add(today, { bookings: 1, revenue: base });
  }
  if (state.emre.dadTold) {
    companion = add(companion, { newUsers: 1 });
  }

  void EMRE;
  return { companion, today, assumptions: ASSUMPTIONS };
}
