import { extract } from "@/lib/assistant/understand";
import type { TripDraft } from "@/lib/assistant/draft";
import { breakdown, withLines } from "@/lib/assistant/price";
import { emreDraft, WILL, willDraft } from "@/lib/demo/personas";
import {
  BREAKFAST,
  FRIENDS,
  buildInviteeDraft,
  firstName,
  inviteeExtras,
} from "@/lib/group/group";
import { GIFTS } from "@/lib/moments/moments";

/**
 * Jamie version: the basket, today against with the companion.
 *
 * "Today" is the same trip booked through the current app the way most people
 * book it: the cheapest fare (74% of Pegasus passengers), no seat (13% attach)
 * and nobody else on the booking. "With the companion" is what the demo's
 * screens actually sold. Every figure comes from the same pricing code the
 * tickets use; nothing is typed in.
 *
 * Ancillary is everything above the cheapest fare for the same flights: the
 * bag inside SAVER, seats, meals, extras.
 */

export type BasketRow = { who: string; fare: number; ancillary: number; note: string };
export type Basket = {
  rows: BasketRow[];
  passengers: number;
  total: number;
  ancillary: number;
};
export type Comparison = {
  title: string;
  today: Basket;
  companion: Basket;
  /** Outcomes that are not money in this basket but are the point of the beat. */
  kpis: { label: string; today: string; companion: string }[];
};

const round = (n: number): number => Math.round(n * 100) / 100;

/** The same flights at the cheapest fare, nothing added. */
function cheapest(draft: TripDraft): TripDraft {
  return {
    ...draft,
    package: { ...draft.package, value: "light" },
    checkedKg: { ...draft.checkedKg, value: 0 },
    cabinBag: { ...draft.cabinBag, value: false },
    seating: { ...draft.seating, value: "none" },
    flexibility: { ...draft.flexibility, value: "none" },
  };
}

function row(who: string, draft: TripDraft, extras: number, note: string): BasketRow {
  const base = breakdown(cheapest(draft)).total;
  const paid = breakdown(draft).total + extras;
  return { who, fare: round(base), ancillary: round(paid - base), note };
}

function basket(rows: BasketRow[]): Basket {
  const total = round(rows.reduce((a, r) => a + r.fare + r.ancillary, 0));
  const ancillary = round(rows.reduce((a, r) => a + r.ancillary, 0));
  return { rows, passengers: rows.length, total, ancillary };
}

export function willComparison(): Comparison {
  const me = WILL.travellers[0]?.name ?? "Will Parker";
  const draft = willDraft();
  const today = basket([
    row(firstName(me), cheapest(draft), 0, "Cheapest fare, no bag, no seat"),
  ]);
  const friends = FRIENDS.map((f) => {
    const d = buildInviteeDraft(draft, f, me);
    const extras =
      withLines(breakdown(d), inviteeExtras(draft, f, me)).total - breakdown(d).total;
    return row(
      firstName(f.name),
      d,
      extras + BREAKFAST.each,
      f.account
        ? "Pre-filled in the app, seat beside Will"
        : "WhatsApp link, books on the web",
    );
  });
  const companion = basket([
    row(firstName(me), draft, BREAKFAST.each, "Bag in SAVER, window seat, breakfast"),
    ...friends,
  ]);
  return {
    title: "Will and 2 friends · 4 flights each",
    today,
    companion,
    kpis: [
      {
        label: "Passengers on Pegasus.com / app",
        today: "1",
        companion: String(companion.passengers),
      },
      { label: "Friends booked via OTA (commission)", today: "Maybe", companion: "0" },
      { label: "Seats sold", today: "0", companion: String(companion.passengers) },
      {
        label: "Missed check-ins chased by staff",
        today: "Possible",
        companion: "0: auto check-in",
      },
      { label: "Next trip prompted", today: "Newsletter", companion: "Squad, in one tap" },
    ],
  };
}

export function emreComparison(): Comparison {
  const draft = emreDraft();
  const gifts = GIFTS.extraWeight.perLeg + GIFTS.delight.perLeg;
  const today = basket([row("Emre", draft, 0, "Searches himself, if he remembers in time")]);
  const companion = basket([
    row("Emre", draft, gifts, "His usual in one tap, plus gifts for Mum"),
  ]);
  return {
    title: "Emre home for Mum's birthday",
    today,
    companion,
    kpis: [
      {
        label: "Booked when fares are lowest",
        today: "Chance",
        companion: "Nudged at 61 days",
      },
      { label: "New direct customer", today: "0", companion: "1: Dad installs to follow" },
      {
        label: "If cancelled",
        today: "Desk queue or refund",
        companion: "Rebooked, Dad told",
      },
      { label: "Next year", today: "Starts from zero", companion: "Same trip, remembered" },
    ],
  };
}

/**
 * Jamie version: free play. Whatever the passenger typed, priced the same two
 * ways. Each extra traveller books their own copy of the trip, the way the
 * Group agent sends it: pre-filled, with the seat beside the organiser.
 */
export function typedComparison(draft: TripDraft, prompt: string): Comparison {
  const me = WILL.travellers[0]?.name ?? "Will Parker";
  const others = Math.max(0, extract(prompt).companions ?? 0);
  const today = basket([row("You", cheapest(draft), 0, "Cheapest fare, nothing added")]);
  const friendRows = Array.from({ length: others }, (_, i) => {
    const template = FRIENDS[i % FRIENDS.length]!;
    const name = i < FRIENDS.length ? firstName(template.name) : `Friend ${i + 1}`;
    const d = buildInviteeDraft(draft, template, me);
    const extras =
      i < FRIENDS.length
        ? withLines(breakdown(d), inviteeExtras(draft, template, me)).total -
          breakdown(d).total
        : 0;
    return row(name, d, extras, "Sent your trip, books their own");
  });
  const companion = basket([row("You", draft, 0, "What the companion built"), ...friendRows]);
  return {
    title: `Your trip · ${companion.passengers} travelling`,
    today,
    companion,
    kpis: [
      {
        label: "Passengers on Pegasus.com / app",
        today: "1",
        companion: String(companion.passengers),
      },
      {
        label: "Bag and seat decided",
        today: "Later, or at the airport",
        companion: "At booking, inside the fare",
      },
      {
        label: "Screens to book",
        today: "Search to payment funnel",
        companion: "One sentence, one ticket",
      },
    ],
  };
}
