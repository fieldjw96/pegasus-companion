import type { FareFamily } from "@/lib/journey/flights";

/**
 * Who is holding the phone.
 *
 * Two people, two starts. Jess has never used the app: a cold start, where
 * everything the companion fills in is a prediction and says so. Emre flies
 * the same route home a few times a year: a warm start, where most of the
 * ticket is remembered from the last time.
 *
 * This is where the companion's leverage comes from. A sentence can carry a
 * destination and a month; it cannot reasonably carry "you always take the
 * Friday 19:05 and sit in 3A".
 */

export type Traveller = {
  name: string;
  kind: "adult" | "child" | "infant";
  age?: number;
};

export type Profile = {
  id: "jess" | "emre";
  label: string;
  travellers: Traveller[];
  /** True when there is no history to remember from. */
  coldStart: boolean;
  /** Where the phone says home is, used to predict an origin. */
  homeAirport: string;
  homeCity: string;
  /** What this person usually books. Feeds prediction, never overrides. */
  habits: {
    package: FareFamily;
    checkedBag: boolean;
    seatPreference: "aisle" | "window" | "together" | "none";
    flexibility: "none" | "change" | "full";
    flexibilityReason: string;
    preferredDeparture: "early" | "midday" | "evening" | "any";
    reason: string;
  };
  /** Remembered from past bookings and shown as such. */
  remembers: string[];
  /** Things on file that fill in a form nobody has to see. */
  onFile: { passport: string; from: string; payment: string };
  /** Who is at home: the parent the companion can keep posted, with permission. */
  parent: { name: string; relation: string; city: string } | null;
  pronoun: { subject: string; object: string; possessive: string };
};

export const PROFILES: Profile[] = [
  {
    id: "jess",
    label: "First time here",
    travellers: [{ name: "Jess Carter", kind: "adult" }],
    coldStart: true,
    homeAirport: "STN",
    homeCity: "London",
    habits: {
      package: "light",
      checkedBag: false,
      seatPreference: "none",
      flexibility: "none",
      flexibilityReason: "Nothing on file says you pay to move trips, so I left it out.",
      preferredDeparture: "any",
      reason: "You're new here, so this is a guess from the trip, not a memory.",
    },
    remembers: [],
    onFile: {
      passport: "GBR 533120471 · valid to Mar 2032",
      from: "From your Wallet, with permission",
      payment: "Apple Pay",
    },
    parent: { name: "Dad", relation: "dad", city: "Norwich" },
    pronoun: { subject: "she", object: "her", possessive: "her" },
  },
  {
    id: "emre",
    label: "Flies home a few times a year",
    travellers: [{ name: "Emre Kaya", kind: "adult" }],
    coldStart: false,
    homeAirport: "SAW",
    homeCity: "Istanbul",
    habits: {
      package: "saver",
      checkedBag: true,
      seatPreference: "window",
      flexibility: "none",
      flexibilityReason: "You have never paid to make a trip home changeable.",
      preferredDeparture: "evening",
      reason: "Every trip to Trabzon so far: the Friday 19:05, SAVER, and seat 3A.",
    },
    remembers: ["Friday 19:05", "SAVER", "Seat 3A", "Passport and card"],
    onFile: {
      passport: "TUR U21844713 · valid to Aug 2027",
      from: "On file from your last trip",
      payment: "VISA •••• 2210",
    },
    parent: null,
    pronoun: { subject: "he", object: "him", possessive: "his" },
  },
];

export function profileById(id: string): Profile {
  return PROFILES.find((p) => p.id === id) ?? PROFILES[0]!;
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

export function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}
