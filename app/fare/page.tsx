import Link from "next/link";
import { FlightsHeader } from "@/components/bolbol-header";
import { ReportStep } from "@/components/companion/report-step";
import {
  FARE_FAMILIES,
  FARE_RULES,
  formatDuration,
  formatFare,
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

  const origin = one("origin", "STN");
  const destination = one("destination", "SAW");
  const fallbackDate = new Date();
  fallbackDate.setDate(fallbackDate.getDate() + 17);
  const departDate = one("departDate", fallbackDate.toISOString().slice(0, 10));
  const flightId = one("flightId", "");
  const adults = Number(one("adults", "1"));
  const children = Number(one("children", "0"));

  const flights = inventory(origin, destination, departDate);
  const flight = flights.find((f) => f.id === flightId) ?? flights[0];

  if (flight === undefined) {
    return (
      <>
        <FlightsHeader title="Select Fare" />
        <div className="p-6">
          <p className="text-[15px] font-semibold">No flights on this route.</p>
          <Link href="/" className="mt-3 inline-block text-[13px] text-pg-orange">
            Start again
          </Link>
        </div>
      </>
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

      <FlightsHeader title="Select Fare" />

      <div className="bg-white px-4 py-3">
        <p className="text-[15px] font-bold">
          {flight.flightNo} · {flight.departs}–{flight.arrives}
        </p>
        <p className="text-[13px] text-pg-ink">
          {formatDuration(flight.durationMinutes)}
          {flight.via === null ? " · direct" : ` · via ${flight.via}`}
        </p>
      </div>

      <div className="bg-pg-surface px-3 pt-4 pb-32">
        {FARE_FAMILIES.map((family: FareFamily) => {
          const rules = FARE_RULES[family];
          const price = flight.fares[family] ?? 0;
          return (
            <div key={family} className="mb-3 rounded-2xl bg-white p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[17px] font-bold">{rules.label}</p>
                <p className="text-[20px] font-bold">
                  {formatFare(price)}{" "}
                  <span className="text-[12px] font-medium text-pg-ink">GBP</span>
                </p>
              </div>
              <ul className="mt-2 space-y-1 text-[13px] text-pg-ink">
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
              <button className="mt-3 w-full rounded-xl bg-pg-yellow py-3.5 text-[15px] font-bold text-pg-navy">
                Select {rules.label}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
