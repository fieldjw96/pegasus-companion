import type { Field, TripDraft } from "@/lib/assistant/draft";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { priceOf } from "@/lib/assistant/price";
import { HERO } from "@/lib/journey/script";

/**
 * Group booking.
 *
 * The organiser books once. The companion then holds the same flights for the
 * people they usually travel with, builds each of them their own booking from
 * their own history, and lets them pay their own way. Nobody fills in a form
 * for anybody else, and nobody sees anybody else's fare.
 *
 * Two kinds of invitee: someone with a Pegasus account, whose booking the
 * companion can build from their past trips, and someone without, who gets an
 * email link to a booking built from the organiser's flights alone.
 */

export type Friend = {
  name: string;
  account: boolean;
  /** How many times they have flown with the organiser. */
  flewWith: number;
  /** Where their pronouns go in a sentence. */
  pronoun: { subject: string; object: string; possessive: string };
  /** What their own history says, when they have one. */
  habits: {
    checkedBag: boolean;
    paysForFlexibility: boolean;
    paysForSeats: boolean;
    usualNights: number;
  } | null;
};

export const FRIENDS: Friend[] = [
  {
    name: "Sam Okonkwo",
    account: true,
    flewWith: 3,
    pronoun: { subject: "he", object: "him", possessive: "his" },
    habits: {
      checkedBag: false,
      paysForFlexibility: false,
      paysForSeats: false,
      usualNights: 2,
    },
  },
  {
    name: "Priya Shah",
    account: true,
    flewWith: 1,
    pronoun: { subject: "she", object: "her", possessive: "her" },
    habits: {
      checkedBag: true,
      paysForFlexibility: false,
      paysForSeats: true,
      usualNights: 5,
    },
  },
  {
    name: "Tom Baker",
    account: false,
    flewWith: 0,
    pronoun: { subject: "he", object: "him", possessive: "his" },
    habits: null,
  },
];

export function friendByName(name: string): Friend | null {
  return FRIENDS.find((f) => f.name === name) ?? null;
}

export function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

/** The hold: 48 hours from when the organiser booked. */
export const HOLD = {
  bookedAt: "Mon 5 Oct, 14:20",
  until: "Wed 7 Oct, 14:20",
  untilShort: "Wed 14:20",
  /** Shown on the group card as time left, frozen for the demo. */
  remaining: "44h 12m",
  hours: 48,
} as const;

/**
 * An invitee's booking, built from the organiser's flights and the invitee's
 * own history.
 *
 * Provenance is the whole screen. The route and dates are "from Jack": the
 * only tag with a face on it, so it reads as a person. The fare, the bag and
 * the change right are remembered from the invitee's own trips. The one thing
 * the companion worked out on its own is a cabin bag, because six nights is
 * longer than this person's usual weekend, and it says so.
 */
export function buildInviteeDraft(organiser: TripDraft, friend: Friend): TripDraft {
  const from = organiser.party.value.adults > 0 ? "Jack Field" : "the organiser";
  const shared = <T>(value: T): Field<T> => ({
    value,
    source: "shared",
    why: `From ${firstName(from)}'s booking.`,
    from,
  });
  const habits = friend.habits;
  const nights = nightsBetween(organiser.departDate.value, organiser.returnDate.value);
  const longerThanUsual =
    habits !== null && nights !== null && nights > habits.usualNights + 2;
  const checked = habits?.checkedBag ?? false;
  const flexible = habits?.paysForFlexibility ?? false;
  const first = firstName(friend.name);

  return {
    origin: shared(organiser.origin.value),
    destination: shared(organiser.destination.value),
    departDate: shared(organiser.departDate.value),
    returnDate: shared(organiser.returnDate.value),
    party: {
      value: { adults: 1, children: 0, infants: 0 },
      source: "profile",
      why:
        habits === null ? "Just you, from the invite." : "Just you, as on every trip so far.",
    },
    package: {
      value: checked ? "saver" : "light",
      source: habits === null ? "predicted" : "profile",
      why:
        habits === null
          ? "The cheapest fare, because I know nothing about how you travel yet."
          : checked
            ? `You check a bag on most trips, and SAVER includes one for less than adding it later.`
            : `You've never checked a bag on a trip with ${first}'s name on it, and never paid for flexibility.`,
    },
    checkedKg: {
      value: checked ? 25 : 0,
      source: habits === null ? "predicted" : "profile",
      why: checked ? "Included in SAVER." : "You have never checked a bag.",
    },
    cabinBag: {
      value: true,
      source: "predicted",
      why: longerThanUsual
        ? `Six nights is longer than your usual weekend. I added a cabin bag, not a hold bag. Say so if you need more.`
        : "A cabin bag, because a week needs one.",
      uncertain: true,
    },
    seating: {
      value: "none",
      source: "predicted",
      why: "See the offer below.",
    },
    flexibility: {
      value: flexible ? "change" : "none",
      source: habits === null ? "predicted" : "profile",
      why: flexible
        ? "You usually pay to be able to move a trip."
        : "You have never paid for flexibility.",
    },
    notes: [],
  };
}

export function nightsBetween(from: string, to: string | null): number | null {
  if (to === null) return null;
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export type SeatOffer = {
  seat: string;
  /** Who is in the row, by seat letter. */
  row: number;
  neighbours: { seat: string; name: string }[];
  perLeg: number;
  total: number;
};

/**
 * The seat beside the organiser's block, if there is one free.
 *
 * Computed off the organiser's itinerary, so moving the family moves the offer.
 * The price is the one time the companion asks about money it did not add
 * itself: this person has never paid for a seat, and it says so.
 */
export function seatOffer(organiser: TripDraft, names: string[]): SeatOffer | null {
  const itinerary = itineraryFor(organiser);
  const seats = itinerary.out?.seats ?? [];
  if (seats.length === 0 || itinerary.back === null) return null;
  const row = Number.parseInt(seats[0] ?? "", 10);
  if (Number.isNaN(row)) return null;
  const letters = seats.map((s) => s.slice(-1));
  const beside = letters.includes("D") && !letters.includes("C") ? "C" : "D";
  if (letters.includes(beside)) return null;
  const legs = 2;
  const perLeg = HERO.seatPricePerLeg;
  return {
    seat: `${row}${beside}`,
    row,
    neighbours: seats.map((seat, i) => ({ seat, name: names[i] ?? "" })),
    perLeg,
    total: perLeg * legs,
  };
}

export type MemberStatus = "booked" | "opened" | "unopened";

export type Member = {
  name: string;
  status: MemberStatus;
  seat: string | null;
  /** True for the organiser. */
  organiser: boolean;
};

/**
 * Who has booked. The organiser always has; the first invitee's state comes
 * from the demo (whether their side of the journey has been played); the rest
 * are scripted so the card has a middle.
 */
export function groupMembers(
  organiserName: string,
  invited: string[],
  inviteeBooked: { name: string; seat: string | null } | null,
): Member[] {
  const members: Member[] = [
    { name: organiserName, status: "booked", seat: null, organiser: true },
  ];
  invited.forEach((name, i) => {
    if (inviteeBooked !== null && inviteeBooked.name === name) {
      members.push({ name, status: "booked", seat: inviteeBooked.seat, organiser: false });
      return;
    }
    const friend = friendByName(name);
    const status: MemberStatus =
      friend !== null && friend.account && i < 2 ? "opened" : "unopened";
    members.push({ name, status, seat: null, organiser: false });
  });
  return members;
}

/** What an invitee pays. Reads off the same pricer as everyone else. */
export function inviteeTotal(draft: TripDraft): number {
  return priceOf(draft);
}
