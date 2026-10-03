import type { FareFamily } from "@/lib/journey/flights";

/**
 * Saved booking profiles.
 *
 * The dropdown under the chat box is not a filter. Each option is a remembered
 * context from previous bookings of that kind: who travels, what they usually
 * take, what they usually pay for. Choosing one is how the assistant knows
 * things nobody has typed yet.
 *
 * This is where the product's leverage actually comes from. A prompt can carry
 * a destination and a date; it cannot reasonably carry "Mila is four, so we
 * need seats together and a hold bag".
 */

export type Traveller = {
  name: string;
  kind: "adult" | "child" | "infant";
  age?: number;
  /** Anything the profile knows that changes a booking. */
  note?: string;
};

export type Profile = {
  id: string;
  label: string;
  blurb: string;
  travellers: Traveller[];
  /** What this kind of trip usually needs. Feeds prediction, never overrides. */
  habits: {
    package: FareFamily;
    checkedBag: boolean;
    seatPreference: "aisle" | "window" | "together" | "none";
    flexibility: "none" | "change" | "full";
    preferredDeparture: "early" | "midday" | "evening" | "any";
    reason: string;
  };
  /** Shown as a chip so the remembered context is visible, not hidden. */
  remembers: string[];
};

export const PROFILES: Profile[] = [
  {
    id: "business",
    label: "Personal — business",
    blurb: "Solo, in and out, flexible",
    travellers: [{ name: "Jack Field", kind: "adult" }],
    habits: {
      package: "saverPlus",
      checkedBag: false,
      seatPreference: "aisle",
      flexibility: "change",
      preferredDeparture: "early",
      reason:
        "Your last four work trips were hand luggage only, aisle, and changed at least once.",
    },
    remembers: ["Just you", "Hand luggage only", "Aisle seat", "Needs to be changeable"],
  },
  {
    id: "holiday",
    label: "Personal — holiday",
    blurb: "You and Ayşe, a week away",
    travellers: [
      { name: "Jack Field", kind: "adult" },
      { name: "Ayşe Field", kind: "adult" },
    ],
    habits: {
      package: "saver",
      checkedBag: true,
      seatPreference: "window",
      flexibility: "none",
      preferredDeparture: "any",
      reason:
        "You check a bag on every holiday booking, and you have never paid for flexibility.",
    },
    remembers: ["You and Ayşe", "One checked bag", "Window seat", "Price over timing"],
  },
  {
    id: "family",
    label: "Family holiday",
    blurb: "With Ayşe and Mila (4)",
    travellers: [
      { name: "Jack Field", kind: "adult" },
      { name: "Ayşe Field", kind: "adult" },
      { name: "Mila Field", kind: "child", age: 4, note: "Needs a seat beside an adult" },
    ],
    habits: {
      package: "saverPlus",
      checkedBag: true,
      seatPreference: "together",
      flexibility: "change",
      preferredDeparture: "midday",
      reason:
        "Travelling with Mila, you have always chosen seats together and avoided the first flight of the day.",
    },
    remembers: [
      "Three of you",
      "Mila is 4",
      "Seats together",
      "Not the 06:00",
      "25 kg checked",
    ],
  },
  {
    id: "weekend",
    label: "Weekend away",
    blurb: "Two of you, light and cheap",
    travellers: [
      { name: "Jack Field", kind: "adult" },
      { name: "Sam Okonkwo", kind: "adult" },
    ],
    habits: {
      package: "light",
      checkedBag: false,
      seatPreference: "none",
      flexibility: "none",
      preferredDeparture: "evening",
      reason: "Short trips, cabin bags only, and you have never chosen a seat on one.",
    },
    remembers: ["You and Sam", "Cabin bag only", "Friday evening out", "Cheapest fare"],
  },
];

export function profileById(id: string): Profile | null {
  return PROFILES.find((p) => p.id === id) ?? null;
}

export function partyOf(profile: Profile): {
  adults: number;
  children: number;
  infants: number;
} {
  return {
    adults: profile.travellers.filter((t) => t.kind === "adult").length,
    children: profile.travellers.filter((t) => t.kind === "child").length,
    infants: profile.travellers.filter((t) => t.kind === "infant").length,
  };
}
