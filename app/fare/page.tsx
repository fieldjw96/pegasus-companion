import Link from "next/link";
import { ReportStep } from "@/components/companion/report-step";
import { compareBaggagePaths } from "@/lib/journey/baggage";
import {
  FARE_FAMILIES,
  FARE_RULES,
  baggageUpsellGap,
  formatFare,
  inventory,
  type FareFamily,
} from "@/lib/journey/flights";

/**
 * Outbound Flight Package Selection.
 *
 * Matched to the live app: four cards, each with a coloured bar down the left,
 * the package name, the price, a bulleted inclusion list, and a radio.
 *
 * This is the screen the Companion has the most to say about, and the reason is
 * on the "Upgrade Your Package" interstitial that follows it. See
 * `baggageUpsellGap`.
 */
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
  const selected = (one("package", "") || null) as FareFamily | null;

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

  /*
   * Computed here, in code, and handed to the Companion as a finished sentence.
   *
   * The comparison is across all four routes to a checked bag, not just the
   * upgrade offer: SAVER strictly dominates, and the route the app itself badges
   * "Recommended" is 28.00 GBP worse for 5 kg less. See lib/journey/baggage.ts.
   */
  const gap = selected === null ? null : baggageUpsellGap(selected);
  const finding = gap === null ? null : compareBaggagePaths().finding;

  return (
    <>
      <ReportStep
        step="fare"
        route={`${origin}-${destination}`}
        departDate={departDate}
        party={{ adults, children, infants: 0 }}
        findings={finding === null ? undefined : [finding]}
      />

      <div className="flex items-center justify-between bg-pg-yellow px-4 py-3">
        <span className="w-6" />
        <h1 className="text-[17px] font-bold text-pg-navy">
          Outbound Flight Package Selection
        </h1>
        <span className="text-[22px] leading-none text-pg-navy">✕</span>
      </div>

      <div className="flex items-center justify-between bg-white px-4 py-3 text-[15px]">
        <span>
          <strong className="text-pg-ink">{flight.origin}</strong>{" "}
          <strong className="text-[17px]">{flight.departs}</strong>
          <span className="mx-2 text-pg-yellow">⟶</span>
          <strong className="text-pg-ink">{flight.destination}</strong>{" "}
          <strong className="text-[17px]">{flight.arrives}</strong>
        </span>
        <span className="text-[14px] text-pg-ink">{formatUk(departDate)}</span>
      </div>

      <div className="bg-pg-surface px-3 pt-3 pb-32">
        {FARE_FAMILIES.map((family: FareFamily) => {
          const pkg = FARE_RULES[family];
          const price = flight.fares[family] ?? 0;
          const isSelected = selected === family;
          return (
            <div
              key={family}
              className="mb-3 flex overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <span className={`w-1.5 shrink-0 ${pkg.accent}`} />
              <div className="min-w-0 flex-1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[19px] font-bold">{pkg.label}</p>
                  <span className="flex items-center gap-3">
                    <span className="text-[19px] font-bold">{formatFare(price)} GBP</span>
                    <Link
                      href={`/fare?${new URLSearchParams({
                        flightId: flight.id,
                        origin,
                        destination,
                        departDate,
                        adults: String(adults),
                        children: String(children),
                        package: family,
                      }).toString()}`}
                      aria-label={`Select ${pkg.label}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                        isSelected ? "border-pg-orange bg-pg-orange" : "border-pg-line"
                      }`}
                    >
                      {isSelected && <span className="text-[13px] text-white">✓</span>}
                    </Link>
                  </span>
                </div>

                <ul className="mt-3 space-y-2">
                  {pkg.inclusions.map((item) => (
                    <li key={item.text} className="flex gap-2 text-[15px]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pg-line" />
                      <span>
                        {item.text}
                        {item.detail !== undefined && (
                          <span className="block text-[14px] text-pg-ink">{item.detail}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {pkg.note !== undefined && (
                  <div className="mt-3 flex gap-2 rounded-lg bg-[#EAF4FD] p-3 text-[14px] leading-snug text-[#1A6FB5]">
                    <span>ℹ</span>
                    <span>{pkg.note}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function formatUk(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
