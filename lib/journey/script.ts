/**
 * The demo's hero trip, pinned.
 *
 * Everything else in the inventory is hashed from (origin, destination, date),
 * which is deterministic but arbitrary. The one trip the whole demo is built
 * around is not allowed to be arbitrary: the flight number on the ticket is the
 * flight number in the Live Activity, which is the one in the friend's
 * notification, which is the one in the deck. So the two legs of Jack's half
 * term are written down here, and `inventory()` serves them before it hashes
 * anything.
 *
 * The LIGHT base of 154.11 is chosen so that SAVER PLUS (154.11 + 50) for three
 * travellers over two legs comes to exactly 1224.66, the total the design
 * canvas prints, and so that a single LIGHT traveller with a cabin bag comes to
 * 342.22, the fare it prints on Sam's ticket. Every other number on those
 * screens is arithmetic on these.
 */

export type ScriptedFlight = {
  flightNo: string;
  departs: string;
  arrives: string;
  durationMinutes: number;
  aircraft: string;
  seatsLeft: number;
  /** The LIGHT fare per person per leg. The other families add their uplift. */
  light: number;
};

export const HERO = {
  origin: "STN",
  destination: "ADB",
  departDate: "2026-10-19",
  returnDate: "2026-10-25",
  reference: "NSVSXR",
  /** The reference printed on an invitee's booking of the same flights. */
  inviteeReference: "K7PM2W",
  gate: "A3",
  /** The block the family sits in, and the seat beside it a friend can take. */
  seats: ["19D", "19E", "19F"],
  seatBeside: "19C",
  seatPricePerLeg: 9,
} as const;

const SCRIPTED: Record<string, ScriptedFlight[]> = {
  [`${HERO.origin}|${HERO.destination}|${HERO.departDate}`]: [
    {
      flightNo: "PC 1474",
      departs: "07:17",
      arrives: "10:51",
      durationMinutes: 214,
      aircraft: "A320neo",
      seatsLeft: 9,
      light: 154.11,
    },
    {
      flightNo: "PC 1478",
      departs: "13:40",
      arrives: "17:14",
      durationMinutes: 214,
      aircraft: "A321neo",
      seatsLeft: 14,
      light: 171.4,
    },
  ],
  [`${HERO.destination}|${HERO.origin}|${HERO.returnDate}`]: [
    {
      flightNo: "PC 1355",
      departs: "07:59",
      arrives: "11:33",
      durationMinutes: 214,
      aircraft: "A320neo",
      seatsLeft: 11,
      light: 154.11,
    },
    {
      flightNo: "PC 1359",
      departs: "15:05",
      arrives: "18:39",
      durationMinutes: 214,
      aircraft: "A320neo",
      seatsLeft: 6,
      light: 166.2,
    },
  ],
};

/*
 * The runner-up from the watch: Antalya, which never quite comes under the cap.
 * SAVER PLUS for three over two legs is 1341.66, the figure the deadline rule
 * quotes, and the morning flight is down to its last four seats.
 */
SCRIPTED[`${HERO.origin}|AYT|${HERO.departDate}`] = [
  {
    flightNo: "PC 1180",
    departs: "08:40",
    arrives: "15:05",
    durationMinutes: 265,
    aircraft: "A321neo",
    seatsLeft: 4,
    light: 173.61,
  },
  {
    flightNo: "PC 1184",
    departs: "17:30",
    arrives: "23:55",
    durationMinutes: 265,
    aircraft: "A320neo",
    seatsLeft: 12,
    light: 168.2,
  },
];
SCRIPTED[`AYT|${HERO.origin}|${HERO.returnDate}`] = [
  {
    flightNo: "PC 1181",
    departs: "15:50",
    arrives: "18:15",
    durationMinutes: 265,
    aircraft: "A321neo",
    seatsLeft: 7,
    light: 173.61,
  },
];

export function scriptedFlights(
  origin: string,
  destination: string,
  date: string,
): ScriptedFlight[] | null {
  return SCRIPTED[`${origin}|${destination}|${date}`] ?? null;
}

/** True when a draft is the hero trip, whoever is flying it. */
export function isHeroRoute(
  origin: string,
  destination: string,
  departDate: string,
  returnDate: string | null,
): boolean {
  return (
    origin === HERO.origin &&
    destination === HERO.destination &&
    departDate === HERO.departDate &&
    returnDate === HERO.returnDate
  );
}
