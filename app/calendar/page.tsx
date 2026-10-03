import { FlightsHeader } from "@/components/bolbol-header";
import { AIRPORTS, formatFare, inventory, type AirportCode } from "@/lib/journey/flights";

/**
 * Calendar / Chart.
 *
 * Worth noticing while reading this screen: the live app already marks the
 * month's lowest fare with a star and already shows the neighbouring days on the
 * results strip. "A different date is cheaper" is therefore a solved problem in
 * this product, which matters for what the Companion should and should not claim
 * as its own idea. What is not solved is noticing on the passenger's behalf while
 * they are not looking.
 */
export default async function CalendarScreen({
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
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 17);
  const selected = one("departDate", fallback.toISOString().slice(0, 10));

  const originCity = AIRPORTS[origin as AirportCode]?.city ?? origin;
  const destCity = AIRPORTS[destination as AirportCode]?.city ?? destination;

  const anchor = new Date(`${selected}T00:00:00Z`);
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const monthName = anchor.toLocaleString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Monday-first grid, which is what the screenshots show.
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    // Only some days have flights, as on a real thin route.
    const hasFlights = (day * 7 + month) % 3 !== 1;
    const cheapest = hasFlights
      ? inventory(origin, destination, iso).reduce<number | null>((min, f) => {
          const price = f.fares.light;
          if (price === undefined) return min;
          return min === null || price < min ? price : min;
        }, null)
      : null;
    return { day, iso, cheapest };
  });

  const lowest = days.reduce<{ iso: string; price: number } | null>((best, d) => {
    if (d.cheapest === null) return best;
    if (best === null || d.cheapest < best.price) return { iso: d.iso, price: d.cheapest };
    return best;
  }, null);

  const selectedDay = days.find((d) => d.iso === selected) ?? null;

  return (
    <>
      <FlightsHeader title="Calendar/Chart" />

      <div className="flex border-b border-pg-line bg-white text-[15px] font-semibold">
        <span className="flex-1 border-b-2 border-pg-orange py-3 text-center">
          🗓 Calendar ⌄
        </span>
        <span className="flex-1 py-3 text-center text-pg-ink">📊 Chart ⌄</span>
      </div>

      <div className="bg-pg-surface px-3 pt-4 pb-32">
        <h2 className="mb-3 text-[22px] font-bold">
          {originCity} <span className="text-pg-yellow">✈</span> {destCity}
        </h2>

        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-pg-line">
          <div className="grid grid-cols-3 text-center text-[13px]">
            <span className="bg-pg-surface py-3">
              <span className="block font-bold">Previous</span>
              <span className="text-pg-ink">month</span>
            </span>
            <span className="border-b-2 border-pg-yellow py-3">
              <span className="block font-bold">{monthName}</span>
              <span className="text-pg-ink">
                {lowest === null ? "–" : `${formatFare(lowest.price)} GBP`}
              </span>
            </span>
            <span className="bg-pg-surface py-3">
              <span className="block font-bold">Next</span>
              <span className="text-pg-ink">month</span>
            </span>
          </div>

          <div className="grid grid-cols-7 px-2 pt-3 text-center text-[13px] text-pg-ink">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 px-2 pb-3 text-center">
            {Array.from({ length: firstWeekday }, (_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {days.map((d) => {
              const isSelected = d.iso === selected;
              const isLowest = lowest !== null && d.iso === lowest.iso;
              return (
                <span
                  key={d.iso}
                  className={`rounded-lg py-1.5 ${isSelected ? "bg-pg-navy text-white" : ""}`}
                >
                  <span className="relative block text-[15px] font-medium">
                    {d.day}
                    {isLowest && !isSelected && (
                      <span className="absolute -top-1 -right-0.5 text-[10px]">⭐</span>
                    )}
                  </span>
                  <span
                    className={`block text-[12px] ${isSelected ? "text-white" : d.cheapest === null ? "text-pg-line" : "text-pg-navy"}`}
                  >
                    {d.cheapest === null ? "—" : Math.round(d.cheapest)}
                  </span>
                </span>
              );
            })}
          </div>

          <div className="space-y-1 border-t border-pg-line px-4 py-3 text-[14px]">
            <p>
              <span className="mr-2">⭐</span>
              <span className="text-pg-ink">Lowest fare</span>{" "}
              <strong>{lowest === null ? "–" : `${formatFare(lowest.price)} GBP`}</strong>
            </p>
            <p>
              <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-pg-navy align-middle" />
              <span className="text-pg-ink">Your Selection</span>
            </p>
            <p className="pl-6 text-[15px]">
              Gidiş {formatLong(selected)} -{" "}
              <strong>
                {selectedDay?.cheapest == null
                  ? "–"
                  : `${formatFare(selectedDay.cheapest)} GBP`}
              </strong>
            </p>
          </div>
        </div>

        <button className="mt-4 w-full rounded-xl bg-pg-yellow py-4 text-[17px] font-bold text-pg-navy">
          List Selected Dates
        </button>
      </div>
    </>
  );
}

function formatLong(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "short",
    timeZone: "UTC",
  });
}
