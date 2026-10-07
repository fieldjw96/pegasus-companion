/**
 * The demo's routes, pinned.
 *
 * Everything else in the inventory is hashed from (origin, destination, date),
 * which is deterministic but arbitrary. The routes the two journeys are built
 * around are not allowed to be arbitrary: the flight number on Will's ticket is
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

/** Journey 1: Will, Archie and Tom's week. Out and back, direct. */
export const SQUAD = {
  origin: "STN",
  /** Kayseri, for the balloons. Straight there and back, for the demo. */
  destination: "ASR",
  references: { will: "K4T7QX", archie: "M2PR8V", tom: "X7K2PQ" },
  row: 14,
  seats: { will: "14A", archie: "14B", tom: "14C" },
  seatPricePerLeg: 7,
  gate: "B12",
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
  "STN|ASR": [
    {
      flightNo: "PC 1172",
      departs: "06:10",
      arrives: "12:55",
      durationMinutes: 285,
      aircraft: "A321neo",
      seatsLeft: 9,
      light: 118.6,
    },
    {
      flightNo: "PC 1174",
      departs: "13:30",
      arrives: "20:15",
      durationMinutes: 285,
      aircraft: "A320neo",
      seatsLeft: 21,
      light: 126.9,
    },
  ],
  "ASR|STN": [
    {
      flightNo: "PC 1173",
      departs: "14:10",
      arrives: "17:15",
      durationMinutes: 305,
      aircraft: "A321neo",
      seatsLeft: 6,
      light: 124.3,
    },
  ],
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
  "SAW|TZX": [
    {
      flightNo: "PC 2652",
      departs: "19:05",
      arrives: "20:50",
      durationMinutes: 105,
      aircraft: "A320neo",
      seatsLeft: 11,
      light: 47.9,
    },
    {
      flightNo: "PC 2656",
      departs: "21:15",
      arrives: "23:00",
      durationMinutes: 105,
      aircraft: "A320neo",
      seatsLeft: 18,
      light: 52.4,
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
      light: 47.9,
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
export type Owner = "will" | "archie" | "tom" | "emre";

export function ownerOf(name: string | undefined): Owner | null {
  const first = (name ?? "").split(" ")[0]?.toLowerCase();
  return first === "will" || first === "archie" || first === "tom" || first === "emre"
    ? first
    : null;
}
