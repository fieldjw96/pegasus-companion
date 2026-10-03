import Link from "next/link";
import { FlightsHeader } from "@/components/bolbol-header";
import {
  AIRPORTS,
  formatDuration,
  formatFare,
  inventory,
  search,
  shiftDate,
  type AirportCode,
} from "@/lib/journey/flights";

/** Next 15+ hands searchParams as a promise; awaiting it is not optional. */
export default async function ResultsScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const one = (key: string, fallback: string): string => {
    const value = raw[key];
    if (Array.isArray(value)) return value[0] ?? fallback;
    return value ?? fallback;
  };

  const fallbackDate = new Date();
  fallbackDate.setDate(fallbackDate.getDate() + 17);

  const result = search({
    origin: one("origin", "STN"),
    destination: one("destination", "SAW"),
    departDate: one("departDate", fallbackDate.toISOString().slice(0, 10)),
    returnDate: null,
    adults: Number(one("adults", "1")),
    children: Number(one("children", "0")),
    infants: Number(one("infants", "0")),
  });

  const { search: query, flights } = result;
  const originCity = AIRPORTS[query.origin as AirportCode]?.city ?? query.origin;
  const destCity = AIRPORTS[query.destination as AirportCode]?.city ?? query.destination;

  // The date strip shows the day either side with its own cheapest fare, which is
  // how the live app lets you see a neighbouring day is better without leaving.
  const strip = [-1, 0, 1].map((offset) => {
    const date = shiftDate(query.departDate, offset);
    const cheapest = inventory(query.origin, query.destination, date).reduce<number | null>(
      (min, f) => {
        const price = f.fares.light;
        if (price === undefined) return min;
        return min === null || price < min ? price : min;
      },
      null,
    );
    return { date, cheapest, selected: offset === 0 };
  });

  return (
    <>
      <FlightsHeader
        title="Departure Flights"
        action={<span className="text-[18px] text-pg-navy">☰</span>}
      />

      <div className="flex border-b border-pg-line bg-white">
        {strip.map((day) => (
          <div
            key={day.date}
            className={`flex-1 py-3 text-center ${
              day.selected ? "border-b-2 border-pg-orange" : ""
            }`}
          >
            <p className={`text-[14px] ${day.selected ? "font-bold" : "text-pg-ink"}`}>
              {formatStripDate(day.date)}
            </p>
            <p className={`text-[13px] ${day.selected ? "font-semibold" : "text-pg-ink"}`}>
              {day.cheapest === null ? "–" : `${formatFare(day.cheapest)} GBP`}
            </p>
          </div>
        ))}
      </div>

      <Link href="/calendar" className="flex items-center gap-3 bg-white px-4 py-3">
        <span className="text-[18px]">📊</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">View Month Prices</span>
          <span className="block text-[13px] text-pg-ink">View flights on calendar/chart</span>
        </span>
        <span className="text-[18px] text-pg-ink">›</span>
      </Link>

      <div className="bg-pg-surface px-3 pt-4 pb-32">
        <div className="flex items-center justify-between rounded-xl border-l-4 border-pg-orange bg-white p-3">
          <span>
            <span className="block text-[17px] font-bold">0.00</span>
            <span className="block text-[12px] text-pg-ink">Bolpoints you have</span>
          </span>
          <span className="flex rounded-full bg-pg-surface p-1 text-[13px] font-semibold">
            <span className="rounded-full bg-pg-orange px-4 py-1.5 text-white">GBP</span>
            <span className="px-4 py-1.5 text-pg-ink">BolPoints</span>
          </span>
        </div>

        <h2 className="mt-5 mb-3 text-[18px] font-semibold">
          {originCity} - {destCity}
        </h2>

        <div className="mb-3 flex items-start gap-3 rounded-xl bg-white p-3">
          <span className="text-[22px]">📍</span>
          <span>
            <span className="block text-[13px] font-bold">
              All passengers earn +3 Pins from the listed flights!
            </span>
            <span className="mt-1 block text-[12px] text-pg-ink">
              You only need to collect 15 Pins to benefit from BolBol Extra advantages.
            </span>
          </span>
        </div>

        {flights.map((flight) => (
          <Link
            key={flight.id}
            href={`/fare?${new URLSearchParams({ origin: query.origin, destination: query.destination, departDate: query.departDate, adults: String(query.adults), children: String(query.children), infants: String(query.infants), flightId: flight.id }).toString()}`}
            className="mb-3 block rounded-2xl bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <span>
                <span className="block text-[13px] text-pg-ink">{flight.origin}</span>
                <span className="block text-[26px] leading-tight font-bold">
                  {flight.departs}
                </span>
              </span>
              <span className="flex flex-1 flex-col items-center px-2">
                <span className="text-[13px] text-pg-ink">
                  {formatDuration(flight.durationMinutes)}
                </span>
                <span className="mt-1 w-full border-t border-pg-line" />
              </span>
              <span className="text-right">
                <span className="block text-[13px] text-pg-ink">{flight.destination}</span>
                <span className="block text-[26px] leading-tight font-bold">
                  {flight.arrives}
                  {flight.arrivesNextDay && (
                    <span className="align-super text-[11px] text-pg-orange">+1</span>
                  )}
                </span>
              </span>
            </div>

            {flight.via !== null && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-pg-surface px-3 py-2 text-[13px]">
                <span className="font-bold">Via {flight.via}</span>
                <span className="text-pg-ink">
                  {Math.floor(flight.layoverMinutes / 60)} hours {flight.layoverMinutes % 60}{" "}
                  minutes layover
                </span>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-pg-line pt-3">
              <span className="text-[16px]" title="Free cancellation within 24 hours">
                🕐
              </span>
              <span className="text-[22px] font-bold">
                {formatFare(flight.fares.light ?? 0)} GBP
              </span>
            </div>
          </Link>
        ))}

        <p className="mt-2 flex items-center gap-2 px-1 text-[13px] text-pg-ink">
          <span>🕐</span> Free cancellation within 24 hours
        </p>
      </div>
    </>
  );
}

function formatStripDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const day = date.getUTCDate();
  const month = date.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const weekday = date.toLocaleString("en-GB", { weekday: "short", timeZone: "UTC" });
  return `${day} ${month}, ${weekday}`;
}
