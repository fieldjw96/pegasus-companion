import Link from "next/link";
import { ReportStep } from "@/components/companion/report-step";
import { JourneyFooter } from "@/components/journey-footer";
import { compareBaggagePaths } from "@/lib/journey/baggage";
import { href, parseBooking, selectedFlight } from "@/lib/journey/booking";
import { FARE_FAMILIES, FARE_RULES, formatFare, type FareFamily } from "@/lib/journey/flights";

/**
 * Outbound Flight Package Selection.
 *
 * The screen the Companion has most to say about, and the reason is one screen
 * further on: the same baggage costs 59.00 after this point and 30.00 on it.
 * See `compareBaggagePaths`.
 */
export default async function FareScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const booking = parseBooking(await searchParams);
  const flight = selectedFlight(booking);

  if (flight === null) {
    return (
      <div className="p-6">
        <p className="text-[15px] font-semibold">No flights on this route.</p>
        <Link href="/" className="mt-3 inline-block text-[13px] text-pg-orange">
          Start again
        </Link>
      </div>
    );
  }

  // Arithmetic here, in code. The judgement layer receives a finished sentence.
  const finding = booking.package === "light" ? compareBaggagePaths().finding : null;

  return (
    <>
      <ReportStep
        step="fare"
        route={`${booking.origin}-${booking.destination}`}
        departDate={booking.departDate}
        party={{
          adults: booking.adults,
          children: booking.children,
          infants: booking.infants,
        }}
        findings={finding === null ? undefined : [finding]}
      />

      <div className="flex items-center justify-between bg-pg-yellow px-4 py-3">
        <span className="w-6" />
        <h1 className="text-[17px] font-bold text-pg-navy">
          Outbound Flight Package Selection
        </h1>
        <Link
          href={href("results", booking)}
          className="text-[22px] leading-none text-pg-navy"
        >
          ✕
        </Link>
      </div>

      <div className="flex items-center justify-between bg-white px-4 py-3 text-[15px]">
        <span>
          <strong className="text-pg-ink">{flight.origin}</strong>{" "}
          <strong className="text-[17px]">{flight.departs}</strong>
          <span className="mx-2 text-pg-yellow">⟶</span>
          <strong className="text-pg-ink">{flight.destination}</strong>{" "}
          <strong className="text-[17px]">{flight.arrives}</strong>
        </span>
        <span className="text-[14px] text-pg-ink">{formatUk(booking.departDate)}</span>
      </div>

      <div className="bg-pg-surface px-3 pt-3 pb-56">
        {FARE_FAMILIES.map((family: FareFamily) => {
          const pkg = FARE_RULES[family];
          const price = flight.fares[family] ?? 0;
          const isSelected = booking.package === family;
          return (
            <Link
              key={family}
              href={href("fare", booking, { package: family, flightId: flight.id })}
              className={`mb-3 flex overflow-hidden rounded-2xl bg-white shadow-sm ${
                isSelected ? "ring-2 ring-pg-orange" : ""
              }`}
            >
              <span className={`w-1.5 shrink-0 ${pkg.accent}`} />
              <div className="min-w-0 flex-1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[19px] font-bold">{pkg.label}</p>
                  <span className="flex items-center gap-3">
                    <span className="text-[19px] font-bold">{formatFare(price)} GBP</span>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                        isSelected ? "border-pg-orange bg-pg-orange" : "border-pg-line"
                      }`}
                    >
                      {isSelected && <span className="text-[13px] text-white">✓</span>}
                    </span>
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
            </Link>
          );
        })}
      </div>

      <JourneyFooter
        booking={booking}
        label="Continue"
        href={href("passengers", booking, { flightId: flight.id })}
        disabled={booking.package === null}
        note={booking.package === null ? "Choose a package to continue." : undefined}
      />
    </>
  );
}

function formatUk(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
