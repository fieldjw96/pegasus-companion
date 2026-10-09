import type { Field, TripDraft } from "@/lib/assistant/draft";
import { itineraryFor } from "@/lib/assistant/itinerary";
import type { PriceLine } from "@/lib/assistant/price";
import { SQUAD, ownerOf } from "@/lib/journey/script";

/**
 * Group booking.
 *
 * Jess books once. The sentence said mates, not who, so the companion asks
 * whether to send the trip on and suggests two people from her contacts. Each
 * gets a nudge in Jess's name with the seat next to hers offered, and a booking
 * already built: the flights from Jess, the rest from whatever Pegasus knows
 * about them. They pay their own way, and nobody sees anybody else's fare.
 * Nothing is frozen or held: the seat beside is an offer, not a reservation.
 *
 * Two kinds of invitee: Archie has the app, so his booking is built from his
 * saved preferences and arrives as a push. Will does not, so a WhatsApp link
 * opens the same booking on the web and brings him into the app.
 */

export type Friend = {
  name: string;
  account: boolean;
  /** How the invite reaches them. */
  channel: "push" | "whatsapp";
  pronoun: { subject: string; object: string; possessive: string };
  /** Why the companion suggests them, from the phone's contacts with permission. */
  because: string;
  /** What Pegasus already knows, when there is an account. */
  remembered: { passport: string; payment: string; meal: string | null } | null;
};

export const FRIENDS: Friend[] = [
  {
    name: "Archie Bell",
    account: true,
    channel: "push",
    pronoun: { subject: "he", object: "him", possessive: "his" },
    because: "Top of your recent calls, and on Pegasus already.",
    remembered: {
      passport: "GBR 508812294 · valid to Jun 2029",
      payment: "Card ending 8841",
      meal: "Hot meal, Pegasus Café",
    },
  },
  {
    name: "Will Parker",
    account: false,
    channel: "whatsapp",
    pronoun: { subject: "he", object: "him", possessive: "his" },
    because: "In the group chat you message most. No app, so a WhatsApp link.",
    remembered: null,
  },
];

export function friendByName(name: string): Friend | null {
  return FRIENDS.find((f) => f.name === name) ?? null;
}

export function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

/** When Jess booked and the invites went out. */
export const INVITE = {
  sentAt: "Tue 3 Mar, 18:30",
  sentLong: "Tuesday 3 March",
} as const;

/**
 * The rest of Jess's contacts, for the search under the two suggestions. The
 * companion suggests two and guesses no further; anyone else is Jess's call,
 * found by name. A contact added here gets the same link in Jess's name, but
 * no seat is held: the row has two seats beside her, and she said two mates.
 */
export type Contact = { name: string; note: string };

export const CONTACTS: Contact[] = [
  { name: "Sam Reed", note: "No app" },
  { name: "Priya Nair", note: "On Pegasus" },
  { name: "Jonny Hale", note: "No app" },
  { name: "Ben Okafor", note: "On Pegasus" },
  { name: "Chloe Marsh", note: "No app" },
  { name: "Dan Whitlock", note: "On Pegasus" },
  { name: "Maya Lindqvist", note: "No app" },
  { name: "Ollie Grant", note: "No app" },
];

/** Contacts matching a search, by the start of any name, up to four. Empty for an empty search. */
export function searchContacts(query: string, limit = 4): Contact[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [];
  return CONTACTS.filter((c) =>
    c.name
      .toLowerCase()
      .split(" ")
      .some((part) => part.startsWith(q) || c.name.toLowerCase().startsWith(q)),
  ).slice(0, limit);
}

/** "Archie and Will", "Archie, Will and Sam". */
export function listNames(names: string[]): string {
  const first = names.map(firstName);
  if (first.length <= 1) return first.join("");
  return `${first.slice(0, -1).join(", ")} and ${first[first.length - 1]}`;
}

/** Pegasus Café's hot meal, as remembered on Archie's bookings. */
export const MEAL_PRICE = 6.5;

/**
 * An invitee's booking, built from the organiser's flights and what Pegasus
 * knows about the invitee.
 *
 * The route and dates are "from Jess": the only tag with a face on it. The
 * fare and seat are predicted from Jess's reasons, which apply to the whole
 * squad. With an account, the passport, payment and the hot meal are
 * remembered and already in the basket.
 */
export function buildInviteeDraft(
  organiser: TripDraft,
  friend: Friend,
  organiserName: string,
): TripDraft {
  const shared = <T>(value: T): Field<T> => ({
    value,
    source: "shared",
    why: `From ${firstName(organiserName)}'s booking.`,
    from: organiserName,
  });
  const first = firstName(organiserName);
  const seat = seatBeside(organiser, friend, organiserName);

  return {
    origin: shared(organiser.origin.value),
    destination: shared(organiser.destination.value),
    stops: shared(organiser.stops.value),
    departDate: shared(organiser.departDate.value),
    returnDate: shared(organiser.returnDate.value),
    party: {
      value: { adults: 1, children: 0, infants: 0 },
      source: friend.remembered === null ? "predicted" : "profile",
      why:
        friend.remembered === null
          ? "Just you, from the invite."
          : "Just you, as on your other bookings.",
    },
    package: {
      value: organiser.package.value,
      source: "predicted",
      why: `Same week, same backpack: the fare ${first} is on, with the bag in it.`,
    },
    checkedKg: {
      value: organiser.checkedKg.value,
      source: "predicted",
      why: `Included in ${organiser.package.value === "light" ? "the fare you add it to" : "SAVER"}.`,
    },
    cabinBag: {
      value: true,
      source: "predicted",
      why: "Included in this fare.",
    },
    seating: {
      value: "window",
      source: "predicted",
      why: seat === null ? "Assigned at check-in." : `${seat}, next to ${first}.`,
    },
    flexibility: {
      value: "none",
      source: friend.remembered === null ? "predicted" : "profile",
      why:
        friend.remembered === null
          ? "Nothing says you pay to move trips, so I left it out."
          : "You've never paid for flexibility.",
    },
    notes: [],
  };
}

/** The seat offered to a friend: the next letter along from the organiser's, if free. */
export function seatBeside(
  organiser: TripDraft,
  friend: Friend,
  organiserName: string,
): string | null {
  const itinerary = itineraryFor(organiser, organiserName);
  const first = itinerary.out?.seats[0];
  if (first === undefined) return null;
  const who = ownerOf(friend.name);
  if (who === "archie") return SQUAD.seats.archie;
  if (who === "will") return SQUAD.seats.will;
  const row = first.slice(0, -1);
  const letter = first.slice(-1);
  const next = String.fromCharCode(
    letter.charCodeAt(0) + 1 + FRIENDS.findIndex((f) => f.name === friend.name),
  );
  return `${row}${next}`;
}

/** What an invitee's booking carries beyond the fare: a remembered meal, if there is one. */
export function inviteeExtras(
  organiser: TripDraft,
  friend: Friend,
  organiserName: string,
): PriceLine[] {
  const legs = itineraryFor(organiser, organiserName).legs.length;
  if (!friend.remembered?.meal) return [];
  return [
    {
      label: friend.remembered.meal,
      detail: `${MEAL_PRICE.toFixed(2)} × ${legs} legs, as on your last bookings`,
      amount: MEAL_PRICE * legs,
    },
  ];
}

export type MemberStatus = "booked" | "opened" | "unopened";

export type Member = {
  name: string;
  status: MemberStatus;
  seat: string | null;
  organiser: boolean;
};

/** Who has booked, in seat order. */
export function groupMembers(
  organiserName: string,
  organiserSeat: string | null,
  invited: string[],
  booked: Record<string, string | null>,
): Member[] {
  const members: Member[] = [
    { name: organiserName, status: "booked", seat: organiserSeat, organiser: true },
  ];
  for (const name of invited) {
    if (name in booked) {
      members.push({ name, status: "booked", seat: booked[name] ?? null, organiser: false });
      continue;
    }
    const friend = friendByName(name);
    members.push({
      name,
      status: friend?.account ? "opened" : "unopened",
      seat: null,
      organiser: false,
    });
  }
  return members;
}

/** Pegasus Café breakfast, offered once to the whole squad on the early flight. */
export const BREAKFAST = { each: 7.5, label: "Hot breakfast, Pegasus Café" } as const;
