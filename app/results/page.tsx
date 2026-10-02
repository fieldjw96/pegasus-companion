import Link from "next/link";
import { ReportStep } from "@/components/companion/report-step";
import { AIRPORTS, formatDuration, search, type AirportCode } from "@/lib/journey/flights";

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

  const today = new Date();
  today.setDate(today.getDate() + 14);

  const result = search({
    origin: one("origin", "SAW"),
    destination: one("destination", "STN"),
    departDate: one("departDate", today.toISOString().slice(0, 10)),
    returnDate: null,
    adults: Number(one("adults", "1")),
    children: Number(one("children", "0")),
    infants: Number(one("infants", "0")),
  });

  const { search: query, flights } = result;
  const originCity = AIRPORTS[query.origin as AirportCode]?.city ?? query.origin;
  const destCity = AIRPORTS[query.destination as AirportCode]?.city ?? query.destination;

  return (
    <>
      <ReportStep
        step="results"
        route={`${query.origin}-${query.destination}`}
        departDate={query.departDate}
        party={{ adults: query.adults, children: query.children, infants: query.infants }}
      />

      <header className="bg-pg-orange px-5 pt-3 pb-5 text-white">
        <Link href="/" className="text-[13px] font-medium opacity-90">
          ← Change search
        </Link>
        <h1 className="mt-2 text-[19px] font-bold tracking-tight">
          {originCity} → {destCity}
        </h1>
        <p className="text-[12px] opacity-90">
          {query.departDate} · {query.adults + query.children} passenger
          {query.adults + query.children === 1 ? "" : "s"}
        </p>
      </header>

      <div className="px-4 pt-4 pb-40">
        {flights.map((flight) => (
          <Link
            key={flight.id}
            href={`/fare?${new URLSearchParams({
              flightId: flight.id,
              origin: query.origin,
              destination: query.destination,
              departDate: query.departDate,
              adults: String(query.adults),
              children: String(query.children),
            }).toString()}`}
            className="mb-3 block rounded-2xl bg-white p-4 ring-1 ring-pg-line active:bg-pg-surface"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[18px] font-bold tracking-tight">
                  {flight.departs} → {flight.arrives}
                  {flight.arrivesNextDay && (
                    <span className="ml-1 align-super text-[10px] font-semibold text-pg-orange">
                      +1
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[12px] text-pg-ink">
                  {flight.flightNo} · {formatDuration(flight.durationMinutes)} · direct
                </p>
                <p className="mt-0.5 text-[11px] text-pg-ink">
                  {flight.aircraft}
                  {flight.seatsLeft <= 6 && (
                    <span className="ml-2 font-semibold text-pg-orange">
                      {flight.seatsLeft} seats left
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-pg-ink">from</p>
                <p className="text-[19px] font-bold tracking-tight">
                  {flight.fares.essentials}
                </p>
                <p className="text-[11px] text-pg-ink">EUR</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
