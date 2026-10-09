import { AIRPORTS, inventory, type AirportCode } from "@/lib/journey/flights";
import { JESS, dayLongMonth, shift } from "@/lib/demo/personas";

/**
 * The first open, before a word has been said.
 *
 * Jess has no history, so the companion has nothing remembered to go on. It
 * still has more than nothing: what the phone will tell an app with
 * permission, what the sign-up said, and what Pegasus knows about its own
 * network and about passengers like her in aggregate. The three trips it
 * pitches are built from those, and every input is named on the trace so a
 * judge can see exactly how little was used, and that none of it is personal
 * data the passenger did not hand over.
 *
 * Everything here is a mock of a signal, labelled as such. The weather is a
 * constant. A real build would read the widget.
 */
export type FirstOpen = {
  /** From the sign-up form. */
  signup: { firstName: string; ageBand: string; bookings: number };
  /** From the device, with the permissions an airline app is granted. */
  device: {
    locale: string;
    timeZone: string;
    region: string;
    city: string;
    nearest: AirportCode[];
  };
  today: string;
  /** The weather widget, as a mock. */
  weather: { tempC: number; sky: string };
  /** Calendar permission, and the next weekend with nothing in it. */
  calendar: { granted: boolean; freeWeekend: { from: string; to: string } };
  /** Pegasus's own network from the nearest airport. */
  network: { from: AirportCode; direct: AirportCode[]; via: AirportCode };
  /** What first-time UK passengers in their twenties book, in aggregate. Invented. */
  cohort: { label: string; ranked: AirportCode[] };
};

/** The next Friday at least two weeks out, and the Monday after it. */
export function nextFreeWeekend(today: string): { from: string; to: string } {
  const start = shift(today, 14);
  const weekday = new Date(`${start}T00:00:00Z`).getUTCDay();
  const toFriday = (5 - weekday + 7) % 7;
  const from = shift(start, toFriday);
  return { from, to: shift(from, 3) };
}

export function firstOpen(today = new Date().toISOString().slice(0, 10)): FirstOpen {
  return {
    signup: {
      firstName: (JESS.travellers[0]?.name ?? "Jess").split(" ")[0] ?? "Jess",
      ageBand: "25 to 34",
      bookings: 0,
    },
    device: {
      locale: "en-GB",
      timeZone: "Europe/London",
      region: "United Kingdom",
      city: JESS.homeCity,
      nearest: ["STN", "LGW"],
    },
    today,
    weather: { tempC: 11, sky: "rain" },
    calendar: { granted: true, freeWeekend: nextFreeWeekend(today) },
    network: { from: "STN", direct: ["SAW"], via: "SAW" },
    cohort: {
      label: "first-time UK passengers, 25 to 34",
      ranked: ["SAW", "AYT", "ADB"],
    },
  };
}

export type Pitch = {
  code: AirportCode;
  title: string;
  /** The sentence the card says on the passenger's behalf when tapped. */
  prompt: string;
  /** A return in LIGHT for one, from the deterministic inventory. */
  from: number;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function monthName(iso: string): string {
  return MONTHS[new Date(`${iso}T00:00:00Z`).getUTCMonth()] ?? "";
}

/** The cheapest LIGHT fare on a route on a date, from the same inventory the ticket uses. */
function cheapestLight(from: AirportCode, to: AirportCode, date: string): number {
  return inventory(from, to, date).reduce(
    (min, f) => Math.min(min, f.fares.light ?? min),
    Infinity,
  );
}

/**
 * The lowest a passenger would actually pay to go and come back: the cheapest
 * LIGHT out on the date plus the cheapest LIGHT back, for one.
 */
export function returnFare(
  from: AirportCode,
  to: AirportCode,
  out: string,
  back: string,
): number {
  const a = cheapestLight(from, to, out);
  const b = cheapestLight(to, from, back);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((a + b) * 100) / 100;
}

/**
 * Three trips for a first open, none of which is a plan. A plan (balloons, a
 * wedding, a week with mates) has to come from the passenger; the companion
 * can only pitch what the signals support: the weather, a free weekend, the
 * cheapest city on the network that month.
 */
export function pitches(signals: FirstOpen): Pitch[] {
  const { freeWeekend } = signals.calendar;
  const threeWeeks = shift(signals.today, 21);
  const november = shift(freeWeekend.from, 21);
  return [
    {
      code: "AYT",
      title: "Somewhere warm",
      prompt: `Somewhere warm in ${monthName(threeWeeks)}, under £600, nothing too long`,
      from: returnFare(signals.network.from, "AYT", threeWeeks, shift(threeWeeks, 7)),
    },
    {
      code: "SAW",
      title: "Istanbul for the long weekend",
      prompt: `Istanbul ${dayLongMonth(freeWeekend.from)} to ${dayLongMonth(freeWeekend.to)}, hand luggage only`,
      from: returnFare(signals.network.from, "SAW", freeWeekend.from, freeWeekend.to),
    },
    {
      code: "ADB",
      title: AIRPORTS.ADB.city,
      prompt: `Izmir for four nights in ${monthName(november)}, with a hold bag`,
      from: returnFare(signals.network.from, "ADB", november, shift(november, 4)),
    },
  ];
}
