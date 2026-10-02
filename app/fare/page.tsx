import Link from "next/link";
import { ReportStep } from "@/components/companion/report-step";
import {
  FARE_FAMILIES,
  FARE_RULES,
  formatDuration,
  inventory,
  type FareFamily,
} from "@/lib/journey/flights";

export default async function FareScreen({
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

  const origin = one("origin", "SAW");
  const destination = one("destination", "STN");
  const departDate = one("departDate", new Date().toISOString().slice(0, 10));
  const flightId = one("flightId", "");
  const adults = Number(one("adults", "1"));
  const children = Number(one("children", "0"));

  const flights = inventory(origin, destination, departDate);
  const flight = flights.find((f) => f.id === flightId) ?? flights[0];

  if (flight === undefined) {
    return (
      <div className="p-6">
        <p className="text-[15px] font-semibold">No flights on this route.</p>
        <Link href="/" className="mt-3 inline-block text-[13px] text-pg-orange">
          Start again
        </Link>
      </div>
    );
  }

  return (
    <>
      <ReportStep
        step="fare"
        route={`${origin}-${destination}`}
        departDate={departDate}
        party={{ adults, children, infants: 0 }}
      />

      <header className="bg-pg-orange px-5 pt-3 pb-5 text-white">
        <Link
          href={`/results?${new URLSearchParams({ origin, destination, departDate, adults: String(adults), children: String(children) }).toString()}`}
          className="text-[13px] font-medium opacity-90"
        >
          ← Back to flights
        </Link>
        <h1 className="mt-2 text-[19px] font-bold tracking-tight">Choose your fare</h1>
        <p className="text-[12px] opacity-90">
          {flight.flightNo} · {flight.departs}–{flight.arrives} ·{" "}
          {formatDuration(flight.durationMinutes)}
        </p>
      </header>

      <div className="px-4 pt-4 pb-40">
        {FARE_FAMILIES.map((family: FareFamily) => {
          const rules = FARE_RULES[family];
          const price = flight.fares[family];
          return (
            <div key={family} className="mb-3 rounded-2xl bg-white p-4 ring-1 ring-pg-line">
              <div className="flex items-baseline justify-between">
                <p className="text-[16px] font-bold">{rules.label}</p>
                <p className="text-[18px] font-bold tracking-tight">
                  {price} <span className="text-[12px] font-medium text-pg-ink">EUR</span>
                </p>
              </div>
              <ul className="mt-2 space-y-1 text-[12px] text-pg-ink">
                <li>{rules.cabinBag}</li>
                <li>
                  {rules.checked === 0
                    ? "No checked baggage"
                    : `${rules.checked} kg checked bag`}
                </li>
                <li>
                  {rules.seatChoice ? "Seat selection included" : "Seat assigned at check-in"}
                </li>
                <li>{rules.changeable ? "Changeable" : "Non-changeable"}</li>
              </ul>
              <button className="mt-3 w-full rounded-xl bg-pg-orange py-3 text-[14px] font-bold text-white">
                Select {rules.label}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
