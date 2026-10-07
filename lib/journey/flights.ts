import { z } from "zod";
import { scriptedFlights } from "./script";

/**
 * Mock Pegasus inventory.
 *
 * Deterministic from (origin, destination, date): the same search always returns
 * the same flights, so a screenshot taken today still matches tomorrow and a demo
 * rehearsal matches the live run. Nothing here talks to a network.
 *
 * Routes are Pegasus's real network shape, hubbed on Istanbul Sabiha Gokcen.
 */

export const AIRPORTS = {
  SAW: { city: "Istanbul", name: "Sabiha Gokcen", country: "Turkiye" },
  IST: { city: "Istanbul", name: "Istanbul Airport", country: "Turkiye" },
  AYT: { city: "Antalya", name: "Antalya", country: "Turkiye" },
  ADB: { city: "Izmir", name: "Adnan Menderes", country: "Turkiye" },
  ESB: { city: "Ankara", name: "Esenboga", country: "Turkiye" },
  BJV: { city: "Bodrum", name: "Milas-Bodrum", country: "Turkiye" },
  DLM: { city: "Dalaman", name: "Dalaman", country: "Turkiye" },
  TZX: { city: "Trabzon", name: "Trabzon", country: "Turkiye" },
  ASR: { city: "Cappadocia", name: "Kayseri", country: "Turkiye" },
  STN: { city: "London", name: "Stansted", country: "United Kingdom" },
  LGW: { city: "London", name: "Gatwick", country: "United Kingdom" },
  BER: { city: "Berlin", name: "Brandenburg", country: "Germany" },
  CDG: { city: "Paris", name: "Charles de Gaulle", country: "France" },
  AMS: { city: "Amsterdam", name: "Schiphol", country: "Netherlands" },
  FCO: { city: "Rome", name: "Fiumicino", country: "Italy" },
  DXB: { city: "Dubai", name: "Dubai Intl", country: "UAE" },
} as const;

export type AirportCode = keyof typeof AIRPORTS;

export const airportCodes = Object.keys(AIRPORTS) as AirportCode[];

/**
 * Pegasus fare packages, read off the live app's "Outbound Flight Package
 * Selection" screen. These are the real four, with the real inclusions and the
 * real accent colour on each card's left edge.
 */
export const FARE_FAMILIES = ["light", "saver", "saverPlus", "comfortFlex"] as const;
export type FareFamily = (typeof FARE_FAMILIES)[number];

export type FarePackage = {
  label: string;
  /** Tailwind class for the coloured bar down the left of the card. */
  accent: string;
  /** Uplift over LIGHT, in GBP, as shown at package selection. */
  uplift: number;
  inclusions: { text: string; detail?: string }[];
  note?: string;
};

export const FARE_RULES: Record<FareFamily, FarePackage> = {
  light: {
    label: "LIGHT",
    accent: "bg-[#2E8FE0]",
    uplift: 0,
    inclusions: [{ text: "1 Piece of Underseat Bag Only", detail: "(40x30x15 cm, 3 kg)" }],
    note: "When you choose the Light package, you may add cabin baggage and/or 12 kg of checked baggage during baggage selection.",
  },
  saver: {
    label: "SAVER",
    accent: "bg-[#19A34A]",
    uplift: 30,
    inclusions: [
      { text: "1 piece of cabin baggage", detail: "(55x40x23 cm, 8 kg)" },
      { text: "1 Piece of Underseat Bag Only", detail: "(40x30x15 cm, 3 kg)" },
      { text: "25 Kg Check-in Baggage" },
    ],
  },
  saverPlus: {
    label: "SAVER PLUS",
    accent: "bg-[#E03E1A]",
    uplift: 50,
    inclusions: [
      { text: "1 piece of cabin baggage", detail: "(55x40x23 cm, 8 kg)" },
      { text: "1 Piece of Underseat Bag Only", detail: "(40x30x15 cm, 3 kg)" },
      { text: "25 Kg Check-in Baggage" },
      { text: "Standard Seat Selection" },
      { text: "Flexible Refund/Change Right (up to 7 days before the flight)" },
    ],
  },
  comfortFlex: {
    label: "COMFORT FLEX",
    accent: "bg-[#6B4FD8]",
    uplift: 63,
    inclusions: [
      { text: "1 piece of cabin baggage", detail: "(55x40x23 cm, 8 kg)" },
      { text: "1 Piece of Underseat Bag Only", detail: "(40x30x15 cm, 3 kg)" },
      { text: "30 Kg Check-in Baggage" },
      { text: "Preferred Seat Selection" },
      { text: "Flexible Refund/Change Right (up to 2 hours before the flight)" },
      { text: "Sandwich" },
    ],
  },
};

/**
 * What the app charges to add baggage *after* LIGHT has been selected.
 *
 * Read straight off the "Upgrade Your Package" interstitial: 59.00 GBP for the
 * Saver inclusions that cost 30.00 GBP one screen earlier. This constant is the
 * reason the Companion has anything worth saying at the fare step.
 */
export const LIGHT_TO_SAVER_UPSELL = 59;

/**
 * The gap between buying baggage now and buying the identical baggage in sixty
 * seconds. Returns null when there is nothing to warn about.
 *
 * Deliberately arithmetic, in code. The judgement layer cannot count and must
 * never be asked to; it is handed the finished sentence and decides only whether
 * saying it is welcome.
 */
export function baggageUpsellGap(selected: FareFamily): {
  payNow: number;
  payLater: number;
  worseOffBy: number;
  multiple: number;
} | null {
  if (selected !== "light") return null;
  const payNow = FARE_RULES.saver.uplift;
  const payLater = LIGHT_TO_SAVER_UPSELL;
  if (payLater <= payNow) return null;
  return {
    payNow,
    payLater,
    worseOffBy: Math.round((payLater - payNow) * 100) / 100,
    multiple: Math.round((payLater / payNow) * 100) / 100,
  };
}

export const flightSchema = z.object({
  id: z.string(),
  flightNo: z.string(),
  origin: z.string(),
  destination: z.string(),
  date: z.string(),
  departs: z.string(),
  arrives: z.string(),
  durationMinutes: z.number().int().positive(),
  arrivesNextDay: z.boolean(),
  aircraft: z.string(),
  seatsLeft: z.number().int().nonnegative(),
  /**
   * Pegasus is not purely point-to-point. The live app routes long thin pairs
   * through the hub and shows "Via ADB, 11 hours 50 minutes layover", so the
   * mock has to model a connection or the results screen cannot be reproduced.
   */
  via: z.string().nullable(),
  layoverMinutes: z.number().int().nonnegative(),
  fares: z.record(z.enum(FARE_FAMILIES), z.number().positive()),
});

export type Flight = z.infer<typeof flightSchema>;

/** Deterministic hash, so "random" is reproducible from the inputs. */
function seedOf(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const DURATIONS: Record<string, number> = {
  "AYT-SAW": 75,
  "ADB-SAW": 70,
  "ESB-SAW": 70,
  "BJV-SAW": 75,
  "DLM-SAW": 80,
  "SAW-TZX": 105,
  "ASR-SAW": 80,
  "STN-ASR": 285,
  "ASR-STN": 305,
  "ASR-AYT": 75,
  "SAW-STN": 230,
  "LGW-SAW": 235,
  "BER-SAW": 170,
  "CDG-SAW": 185,
  "AMS-SAW": 195,
  "FCO-SAW": 160,
  "DXB-SAW": 275,
};

function baseDuration(origin: string, destination: string): number {
  const key = [origin, destination].sort().join("-");
  const known = DURATIONS[key];
  if (known !== undefined) return known;
  return 70 + (seedOf(key) % 240);
}

function formatTime(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60) % 24;
  const m = minutesFromMidnight % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** Fares are shown in GBP to two decimals in the live app ("199.13 GBP"). */
export function formatFare(amount: number): string {
  return amount.toFixed(2);
}

/** Hub for connections. Domestic Turkish pairs route through Istanbul or Izmir. */
const HUBS = ["ADB", "SAW", "ESB"] as const;

/**
 * Every flight on one route on one date.
 *
 * Some are direct and some route through a hub with a long layover, because the
 * live app shows both and the difference is exactly the kind of thing a companion
 * should have an opinion about.
 */
export function inventory(origin: string, destination: string, date: string): Flight[] {
  // The demo's routes are written down, not hashed. See script.ts for why.
  const scripted = scriptedFlights(origin, destination);
  if (scripted !== null) {
    return scripted.map((s, i) => ({
      id: `${s.flightNo.replace(" ", "")}-${date.replace(/-/g, "")}-${i}`,
      flightNo: s.flightNo,
      origin,
      destination,
      date,
      departs: s.departs,
      arrives: s.arrives,
      durationMinutes: s.durationMinutes,
      arrivesNextDay: false,
      aircraft: s.aircraft,
      seatsLeft: s.seatsLeft,
      via: null,
      layoverMinutes: 0,
      fares: {
        light: s.light,
        saver: Math.round((s.light + FARE_RULES.saver.uplift) * 100) / 100,
        saverPlus: Math.round((s.light + FARE_RULES.saverPlus.uplift) * 100) / 100,
        comfortFlex: Math.round((s.light + FARE_RULES.comfortFlex.uplift) * 100) / 100,
      },
    }));
  }

  const random = rng(seedOf(`${origin}|${destination}|${date}`));
  const duration = baseDuration(origin, destination);
  const count = 3 + Math.floor(random() * 4);
  const flights: Flight[] = [];

  for (let i = 0; i < count; i += 1) {
    const departMinute = 5 * 60 + Math.floor(random() * (16 * 60));
    const number = 1000 + Math.floor(random() * 899);

    const connects = random() < 0.35;
    const hub = HUBS[Math.floor(random() * HUBS.length)] ?? "ADB";
    const via = connects && hub !== origin && hub !== destination ? hub : null;
    const layoverMinutes = via === null ? 0 : 90 + Math.floor(random() * 660);
    const total = duration + layoverMinutes;

    // A connection is cheaper per hour but costs the traveller a day; price it so
    // the trade-off is real rather than decorative.
    const base = 28 + duration * 0.42 + random() * 55 - (via === null ? 0 : 22);
    const essentials = Math.max(19, Math.round(base * 100) / 100);

    flights.push({
      id: `PC${number}-${date.replace(/-/g, "")}-${i}`,
      flightNo: `PC ${number}`,
      origin,
      destination,
      date,
      departs: formatTime(departMinute),
      arrives: formatTime(departMinute + total),
      durationMinutes: total,
      arrivesNextDay: departMinute + total >= 24 * 60,
      aircraft: random() < 0.6 ? "A320neo" : "A321neo",
      seatsLeft: 1 + Math.floor(random() * 23),
      via,
      layoverMinutes,
      fares: {
        light: essentials,
        saver: Math.round((essentials + FARE_RULES.saver.uplift) * 100) / 100,
        saverPlus: Math.round((essentials + FARE_RULES.saverPlus.uplift) * 100) / 100,
        comfortFlex: Math.round((essentials + FARE_RULES.comfortFlex.uplift) * 100) / 100,
      },
    });
  }

  return flights.sort((a, b) => a.departs.localeCompare(b.departs));
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const searchSchema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(8).default(0),
  infants: z.number().int().min(0).max(4).default(0),
});

export type Search = z.infer<typeof searchSchema>;

export type SearchResult = {
  search: Search;
  flights: Flight[];
  cheapest: number | null;
};

/**
 * Run a search. `searchSchema` is applied at this boundary rather than inside the
 * page, so a malformed URL fails here naming the field instead of rendering a
 * screen full of undefined.
 */
export function search(input: unknown): SearchResult {
  const parsed = searchSchema.parse(input);
  const flights = inventory(parsed.origin, parsed.destination, parsed.departDate);
  const cheapest = flights.reduce<number | null>((min, f) => {
    const price = f.fares.light;
    if (price === undefined) return min;
    return min === null || price < min ? price : min;
  }, null);
  return { search: parsed, flights, cheapest };
}
