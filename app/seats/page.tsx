import Link from "next/link";
import { ReportStep } from "@/components/companion/report-step";
import { JourneyFooter } from "@/components/journey-footer";
import { bookingQuery, href, parseBooking, selectedFlight } from "@/lib/journey/booking";
import { AIRPORTS, type AirportCode } from "@/lib/journey/flights";

const LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/** Front Row XL 26.00-30.00, Front Row Comfort 24.00-25.00, per the live app. */
const ZONES = [
  {
    name: "Front Row XL",
    price: "26.00 - 30.00 GBP",
    border: "border-[#6B4FD8]",
    rows: [1],
    perks: ["Extra Legroom", "Easy Exit", "Service Start Point"],
    tag: "XL",
  },
  {
    name: "Front Row Comfort",
    price: "24.00 - 25.00 GBP",
    border: "border-pg-yellow",
    rows: [2, 3],
    perks: ["Easy Exit", "Service Start Point"],
    tag: null,
  },
] as const;

/** Deterministic occupancy, so the map looks the same on every rehearsal. */
function taken(row: number, index: number): boolean {
  return (row * 7 + index * 3) % 5 === 0;
}

export default async function SeatsScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const booking = parseBooking(await searchParams);
  const flight = selectedFlight(booking);
  const originCity = AIRPORTS[booking.origin as AirportCode]?.city ?? booking.origin;
  const destCity = AIRPORTS[booking.destination as AirportCode]?.city ?? booking.destination;

  return (
    <>
      <ReportStep
        step="seats"
        route={`${booking.origin}-${booking.destination}`}
        departDate={booking.departDate}
        party={{
          adults: booking.adults,
          children: booking.children,
          infants: booking.infants,
        }}
      />

      <div className="flex items-center justify-between bg-pg-yellow px-4 py-3">
        <Link
          href={href("passengers", booking)}
          className="text-[22px] leading-none text-pg-navy"
        >
          ←
        </Link>
        <h1 className="text-[17px] font-bold text-pg-navy">Seat</h1>
        {/* Skipping is a real path, and the one the Attention! modal exists to
            discourage. Not a Step: it is an interstitial, like the upgrade offer. */}
        <Link
          href={`/skip-seat?${bookingQuery(booking)}`}
          className="text-[17px] font-bold text-pg-navy"
        >
          SKIP
        </Link>
      </div>

      <div className="bg-pg-surface px-4 pt-4">
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="flex items-center gap-2">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full text-[18px] ${
                  i === 0 ? "bg-pg-yellow text-white" : "bg-white text-pg-line"
                }`}
              >
                ✈
              </span>
              {i < 3 && <span className="h-px w-5 bg-pg-line" />}
            </span>
          ))}
        </div>
        <p className="mt-4 text-[21px] font-bold">
          {originCity} - {destCity}
        </p>
      </div>

      <div className="bg-white px-4 py-3">
        <span className="inline-flex items-center gap-3 rounded-lg border-2 border-pg-yellow px-3 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-pg-surface">
            👤
          </span>
          <span>
            <span className="block text-[16px] font-bold">JACK F.</span>
            <span className="block text-[13px] text-pg-ink">
              {booking.seat === null ? "Select" : `Seat ${booking.seat}`}
            </span>
          </span>
        </span>
      </div>

      <div className="bg-pg-surface px-4 pt-3 pb-56">
        <div className="grid grid-cols-7 rounded-lg bg-pg-line/50 py-2 text-center text-[16px] font-bold">
          {LETTERS.map((l, i) => (
            <span key={l} className={i === 3 ? "col-start-5" : ""}>
              {l}
            </span>
          ))}
        </div>

        {ZONES.map((zone) => (
          <div key={zone.name} className="mt-4">
            <div className={`rounded-lg border-2 ${zone.border} p-3`}>
              <p className="text-[17px] font-bold">{zone.name}</p>
              <p className="text-[15px] text-pg-ink">{zone.price}</p>
              <ul className="mt-2 space-y-1">
                {zone.perks.map((perk) => (
                  <li key={perk} className="flex gap-2 text-[15px] text-pg-ink">
                    <span className="text-green-600">✓</span> {perk}
                  </li>
                ))}
              </ul>
            </div>

            {zone.rows.map((row) => (
              <div key={row} className="mt-2 flex items-center gap-1.5">
                <span className="w-5 text-[13px] text-pg-ink">{row}</span>
                {LETTERS.map((letter, index) => {
                  const seat = `${row}${letter}`;
                  const isTaken = taken(row, index);
                  const isChosen = booking.seat === seat;
                  return (
                    <span key={seat} className="flex items-center">
                      {index === 3 && <span className="w-4" />}
                      {isTaken ? (
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-pg-line text-pg-line">
                          ⊘
                        </span>
                      ) : (
                        <Link
                          href={href("baggage", booking, { seat })}
                          aria-label={`Choose seat ${seat}`}
                          className={`flex h-11 w-11 items-center justify-center rounded-lg border text-[12px] font-semibold ${
                            isChosen
                              ? "border-pg-orange bg-pg-orange text-white"
                              : "border-pg-yellow bg-pg-yellow/70 text-pg-navy"
                          }`}
                        >
                          {zone.tag ?? seat}
                        </Link>
                      )}
                    </span>
                  );
                })}
                <span className="w-5 text-right text-[13px] text-pg-ink">{row}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <JourneyFooter
        booking={booking}
        label="Proceed to next flight"
        href={href("baggage", booking)}
        note={
          booking.seat === null && flight !== null
            ? "No seat chosen yet. Choosing at the counter later is not free."
            : undefined
        }
      />
    </>
  );
}
