/**
 * The demo's routes, pinned.
 *
 * Everything else in the inventory is hashed from (origin, destination, date),
 * which is deterministic but arbitrary. The routes the two journeys are built
 * around are not allowed to be arbitrary: the flight number on Jess's ticket is
 * the one in Archie's notification, the one on the squad tracker, and the one
 * in the deck. So they are written down here, keyed by route and not by date,
 * and `inventory()` serves them before it hashes anything. Keying by route
 * rather than date means the demo prints the same numbers whichever month it
 * is given in.
 *
 * Fares are LIGHT per person per leg; the other families add their uplift.
 */

export type ScriptedFlight = {
  flightNo: string;
  departs: string;
  arrives: string;
  durationMinutes: number;
  aircraft: string;
  seatsLeft: number;
  light: number;
};

/** Journey 1: Jess, Archie and Will's week. Four sectors each. */
export const SQUAD = {
  origin: "STN",
  /** The headline place. The route runs through Istanbul and out via Antalya. */
  destination: "ASR",
  stops: [
    { code: "SAW", nights: 2 },
    { code: "ASR", nights: 3 },
    { code: "AYT", nights: 2 },
  ],
  references: { jess: "K4T7QX", archie: "M2PR8V", will: "X7K2PQ" },
  row: 14,
  seats: { jess: "14A", archie: "14B", will: "14C" },
  seatPricePerLeg: 7,
  gate: "B12",
} as const;

/**
 * The companion's opening move. Jess has never said a word to it; what it has
 * is what the phone and the app give away, with permission, and it speaks
 * once. These are the signals, pinned, so the card and the panel agree.
 */
export const TRIP_NUDGE = {
  /** The morning it speaks: the day Jess then books. */
  date: "Tuesday 3 March",
  time: "08:30",
  /** In-app searches for the place, and when. */
  searches: 2,
  searchedIn: "February",
  /** What the searches were for: it is where "backpacking" comes from. */
  searchedFor: "hostels in Göreme",
  /** The fare feed's word on May. */
  lowSince: "October",
  /** Unasked messages allowed a quarter. */
  budget: 1,
} as const;

/**
 * Journey 1's coda: the next trip. After the week, fares to Bodrum drop and
 * the squad hears first. The drop is a fact of the mock world, written down:
 * last week's LIGHT fares, and this week's, both pinned, so "down 10%" is
 * arithmetic over two scripted numbers and not a banner.
 */
export const NEXT_TRIP = {
  origin: "STN",
  destination: "BJV",
  /** A long weekend. */
  nights: 3,
  /** September, as a month index. */
  month: 8,
  /** Days after the squad gets home that the card appears. */
  daysAfter: 60,
  /** LIGHT per person, out and back, the week before the drop. */
  lastWeek: { out: 99, back: 111 },
} as const;

/**
 * Journey 1's stay. Three flights, three people and no bed on the booking:
 * the companion offers one hostel in Göreme for the balloon nights, priced
 * from the nights on the ticket. The rate and the commission are pinned here.
 * The hostel is invented, like the passengers.
 */
export const HOSTEL = {
  /** The stop the stay is for: the balloons. */
  stop: "ASR",
  fallbackNights: 3,
  name: "Fairy Chimney Cave Hostel",
  town: "Göreme",
  room: "6-bed cave dorm",
  /** GBP per bed per night. */
  perNight: 18.5,
  /** What Pegasus earns on a stay booked through the app. */
  commission: 0.12,
} as const;

/** Journey 2: Emre's usual trip home. */
export const HOME = {
  origin: "SAW",
  destination: "TZX",
  reference: "E9MBTZ",
  seat: "3A",
  seatPricePerLeg: 6,
  gate: "C4",
  /** The flight the cancellation scene moves him to. */
  later: "21:15",
} as const;

const SCRIPTED: Record<string, ScriptedFlight[]> = {
  "STN|SAW": [
    {
      flightNo: "PC 1164",
      departs: "06:10",
      arrives: "12:05",
      durationMinutes: 235,
      aircraft: "A321neo",
      seatsLeft: 9,
      light: 89.4,
    },
    {
      flightNo: "PC 1166",
      departs: "13:30",
      arrives: "19:25",
      durationMinutes: 235,
      aircraft: "A320neo",
      seatsLeft: 21,
      light: 97.1,
    },
  ],
  "SAW|ASR": [
    {
      flightNo: "PC 2340",
      departs: "14:30",
      arrives: "15:50",
      durationMinutes: 80,
      aircraft: "A320neo",
      seatsLeft: 14,
      light: 32.1,
    },
  ],
  "ASR|AYT": [
    {
      flightNo: "PC 2411",
      departs: "11:20",
      arrives: "12:35",
      durationMinutes: 75,
      aircraft: "A320neo",
      seatsLeft: 17,
      light: 38.6,
    },
  ],
  "AYT|STN": [
    {
      flightNo: "PC 1189",
      departs: "16:40",
      arrives: "18:55",
      durationMinutes: 255,
      aircraft: "A321neo",
      seatsLeft: 6,
      light: 101.3,
    },
  ],
  "STN|BJV": [
    {
      flightNo: "PC 1180",
      departs: "07:15",
      arrives: "13:40",
      durationMinutes: 265,
      aircraft: "A320neo",
      seatsLeft: 42,
      light: 89.1,
    },
  ],
  "BJV|STN": [
    {
      flightNo: "PC 1181",
      departs: "14:30",
      arrives: "17:05",
      durationMinutes: 275,
      aircraft: "A320neo",
      seatsLeft: 38,
      light: 99.9,
    },
  ],
  "SAW|TZX": [
    {
      flightNo: "PC 2652",
      departs: "19:05",
      arrives: "20:50",
      durationMinutes: 105,
      aircraft: "A320neo",
      seatsLeft: 11,
      light: 29.9,
    },
    {
      flightNo: "PC 2656",
      departs: "21:15",
      arrives: "23:00",
      durationMinutes: 105,
      aircraft: "A320neo",
      seatsLeft: 18,
      light: 34.4,
    },
  ],
  "TZX|SAW": [
    {
      flightNo: "PC 2655",
      departs: "17:30",
      arrives: "19:20",
      durationMinutes: 110,
      aircraft: "A320neo",
      seatsLeft: 13,
      light: 29.9,
    },
  ],
};

export function scriptedFlights(origin: string, destination: string): ScriptedFlight[] | null {
  return SCRIPTED[`${origin}|${destination}`] ?? null;
}

export function isScriptedRoute(origin: string, destination: string): boolean {
  return `${origin}|${destination}` in SCRIPTED;
}

/** Who a pinned seat or reference belongs to, by first name, lower case. */
export type Owner = "jess" | "archie" | "will" | "emre";

export function ownerOf(name: string | undefined): Owner | null {
  const first = (name ?? "").split(" ")[0]?.toLowerCase();
  return first === "jess" || first === "archie" || first === "will" || first === "emre"
    ? first
    : null;
}
