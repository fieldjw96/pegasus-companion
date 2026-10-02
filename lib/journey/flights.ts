import { z } from "zod";

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
 * Pegasus fare families. These names should be checked against real screenshots:
 * they are the publicly advertised set, but the mock must match what Jack is
 * showing the jury, not what a search engine says.
 */
export const FARE_FAMILIES = ["essentials", "advantage", "extra"] as const;
export type FareFamily = (typeof FARE_FAMILIES)[number];

export const FARE_RULES: Record<
  FareFamily,
  {
    label: string;
    cabinBag: string;
    checked: number;
    seatChoice: boolean;
    changeable: boolean;
  }
> = {
  essentials: {
    label: "Essentials",
    cabinBag: "8 kg cabin bag",
    checked: 0,
    seatChoice: false,
    changeable: false,
  },
  advantage: {
    label: "Advantage",
    cabinBag: "8 kg cabin bag",
    checked: 20,
    seatChoice: true,
    changeable: true,
  },
  extra: {
    label: "Extra",
    cabinBag: "8 kg cabin bag",
    checked: 25,
    seatChoice: true,
    changeable: true,
  },
};

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

/** Every flight on one route on one date. Pegasus is point-to-point, so no stops. */
export function inventory(origin: string, destination: string, date: string): Flight[] {
  const random = rng(seedOf(`${origin}|${destination}|${date}`));
  const duration = baseDuration(origin, destination);
  const count = 4 + Math.floor(random() * 4);
  const flights: Flight[] = [];

  for (let i = 0; i < count; i += 1) {
    const departMinute = 5 * 60 + Math.floor(random() * (16 * 60));
    const number = 1000 + Math.floor(random() * 899);
    const base = Math.round((28 + duration * 0.42 + random() * 55) / 5) * 5;
    const total = departMinute + duration;

    flights.push({
      id: `PC${number}-${date.replace(/-/g, "")}-${i}`,
      flightNo: `PC ${number}`,
      origin,
      destination,
      date,
      departs: formatTime(departMinute),
      arrives: formatTime(total),
      durationMinutes: duration,
      arrivesNextDay: total >= 24 * 60,
      aircraft: random() < 0.6 ? "A320neo" : "A321neo",
      seatsLeft: 1 + Math.floor(random() * 23),
      fares: {
        essentials: base,
        advantage: Math.round((base * 1.45) / 5) * 5,
        extra: Math.round((base * 1.95) / 5) * 5,
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
    const price = f.fares.essentials;
    if (price === undefined) return min;
    return min === null || price < min ? price : min;
  }, null);
  return { search: parsed, flights, cheapest };
}
