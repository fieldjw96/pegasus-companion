import { BAGGAGE_PRICES } from "./baggage";
import { FARE_FAMILIES, FARE_RULES, inventory, type FareFamily, type Flight } from "./flights";

/**
 * The booking in progress.
 *
 * Carried entirely in the URL. There is no server state and no database, which
 * means any screen can be opened directly, the back button always works, and a
 * demo can be restarted by editing the address bar. For a mock that is a feature,
 * not a shortcut.
 */

export const STEPS = [
  "search",
  "results",
  "fare",
  "passengers",
  "seats",
  "baggage",
  "extras",
  "payment",
  "confirmation",
] as const;

export type Step = (typeof STEPS)[number];

/** Where each step sends the passenger next. The journey's only ordering. */
const NEXT: Record<Step, Step | null> = {
  search: "results",
  results: "fare",
  fare: "passengers",
  passengers: "seats",
  seats: "baggage",
  baggage: "extras",
  extras: "payment",
  payment: "confirmation",
  confirmation: null,
};

export type Booking = {
  origin: string;
  destination: string;
  departDate: string;
  flightId: string | null;
  package: FareFamily | null;
  adults: number;
  children: number;
  infants: number;
  /** Seat chosen on the outbound, or null if skipped. */
  seat: string | null;
  /** Cabin bag added a la carte, after choosing LIGHT. */
  cabinBag: boolean;
  /** Checked allowance bought a la carte, in kg. Zero when none. */
  checkedKg: 0 | 12 | 20;
  /** Free Cancellation, 6.00 per person. */
  freeChange: boolean;
};

type RawParams = Record<string, string | string[] | undefined>;

function one(raw: RawParams, key: string): string | null {
  const value = raw[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Seventeen days out: far enough that the calendar has fares on either side. */
export function defaultDepartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 17);
  return d.toISOString().slice(0, 10);
}

export function parseBooking(raw: RawParams): Booking {
  const pkg = one(raw, "package");
  const checked = Number(one(raw, "checkedKg") ?? "0");

  return {
    origin: one(raw, "origin") ?? "STN",
    destination: one(raw, "destination") ?? "SAW",
    departDate: one(raw, "departDate") ?? defaultDepartDate(),
    flightId: one(raw, "flightId"),
    package: FARE_FAMILIES.includes(pkg as FareFamily) ? (pkg as FareFamily) : null,
    adults: Math.max(1, Number(one(raw, "adults") ?? "1")),
    children: Math.max(0, Number(one(raw, "children") ?? "0")),
    infants: Math.max(0, Number(one(raw, "infants") ?? "0")),
    seat: one(raw, "seat"),
    cabinBag: one(raw, "cabinBag") === "1",
    checkedKg: checked === 12 || checked === 20 ? checked : 0,
    freeChange: one(raw, "freeChange") === "1",
  };
}

/** Serialise back to a query string, dropping anything not yet chosen. */
export function bookingQuery(booking: Booking, overrides: Partial<Booking> = {}): string {
  const b = { ...booking, ...overrides };
  const params = new URLSearchParams({
    origin: b.origin,
    destination: b.destination,
    departDate: b.departDate,
    adults: String(b.adults),
    children: String(b.children),
    infants: String(b.infants),
  });
  if (b.flightId !== null) params.set("flightId", b.flightId);
  if (b.package !== null) params.set("package", b.package);
  if (b.seat !== null) params.set("seat", b.seat);
  if (b.cabinBag) params.set("cabinBag", "1");
  if (b.checkedKg !== 0) params.set("checkedKg", String(b.checkedKg));
  if (b.freeChange) params.set("freeChange", "1");
  return params.toString();
}

/** A link to any step, carrying the booking with it. */
export function href(step: Step, booking: Booking, overrides: Partial<Booking> = {}): string {
  const path = step === "search" ? "/" : `/${step}`;
  return `${path}?${bookingQuery(booking, overrides)}`;
}

export function nextStep(step: Step): Step | null {
  return NEXT[step];
}

export function selectedFlight(booking: Booking): Flight | null {
  const flights = inventory(booking.origin, booking.destination, booking.departDate);
  if (booking.flightId !== null) {
    const match = flights.find((f) => f.id === booking.flightId);
    if (match !== undefined) return match;
  }
  return flights[0] ?? null;
}

export function passengerCount(booking: Booking): number {
  return booking.adults + booking.children;
}

/**
 * The running total shown in the sticky footer on every screen after search.
 *
 * Extras are per passenger, which is how the live app prices them ("6.00 GBP /
 * Person"). Infants are not counted as fare-paying here; this is a mock and the
 * exactness that matters is in the baggage comparison, not the infant policy.
 */
export function total(booking: Booking): number {
  const flight = selectedFlight(booking);
  if (flight === null) return 0;

  const base = booking.package === null ? 0 : (flight.fares[booking.package] ?? 0);
  const people = passengerCount(booking);

  let sum = base * people;
  if (booking.cabinBag) sum += BAGGAGE_PRICES.cabin * people;
  if (booking.checkedKg === 12) sum += BAGGAGE_PRICES.checked12 * people;
  if (booking.checkedKg === 20) sum += BAGGAGE_PRICES.checked20 * people;
  if (booking.freeChange) sum += 6 * people;

  return Math.round(sum * 100) / 100;
}

/** Human label for the chosen package, for the footer and review screens. */
export function packageLabel(booking: Booking): string | null {
  return booking.package === null ? null : FARE_RULES[booking.package].label;
}
