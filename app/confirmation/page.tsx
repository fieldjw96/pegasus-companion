import Link from "next/link";
import { compareBaggagePaths } from "@/lib/journey/baggage";
import {
  href,
  packageLabel,
  parseBooking,
  passengerCount,
  selectedFlight,
  total,
} from "@/lib/journey/booking";
import { AIRPORTS, formatFare, type AirportCode } from "@/lib/journey/flights";

/**
 * Confirmation.
 *
 * Nothing is booked; this is a mock. The screen earns its place by closing the
 * loop the Companion opened: if LIGHT was taken and baggage bought a la carte,
 * it says plainly what that path cost against the one SAVER offered, using the
 * same arithmetic the Companion used to warn about it.
 *
 * Saying it here rather than only at the fare step matters. A warning that is
 * never reconciled is just a nag.
 */
export default async function ConfirmationScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const booking = parseBooking(await searchParams);
  const flight = selectedFlight(booking);
  const originCity = AIRPORTS[booking.origin as AirportCode]?.city ?? booking.origin;
  const destCity = AIRPORTS[booking.destination as AirportCode]?.city ?? booking.destination;

  const verdict = compareBaggagePaths();
  const boughtBagsOnLight =
    booking.package === "light" && (booking.cabinBag || booking.checkedKg !== 0);

  return (
    <>
      <div className="flex items-center justify-center bg-pg-yellow px-4 py-3">
        <h1 className="text-[17px] font-bold text-pg-navy">Booking Confirmed</h1>
      </div>

      <div className="bg-pg-surface px-3 pt-5 pb-56">
        <div className="rounded-2xl bg-white p-5 text-center">
          <p className="text-[44px]">✈</p>
          <p className="mt-2 text-[21px] font-bold">You&apos;re going to {destCity}</p>
          <p className="mt-1 text-[15px] text-pg-ink">PNR 2GUPGP</p>
          <p className="mt-4 text-[32px] font-bold">{formatFare(total(booking))} GBP</p>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4">
          <Row k="Route" v={`${originCity} → ${destCity}`} />
          <Row k="Flight" v={flight?.flightNo ?? "—"} />
          <Row k="Date" v={booking.departDate} />
          <Row k="Package" v={packageLabel(booking) ?? "—"} />
          <Row k="Passengers" v={String(passengerCount(booking))} />
          <Row k="Seat" v={booking.seat ?? "assigned at check-in"} />
          <Row
            k="Baggage"
            v={
              booking.cabinBag || booking.checkedKg !== 0
                ? [
                    booking.cabinBag ? "cabin" : null,
                    booking.checkedKg ? `${booking.checkedKg} kg` : null,
                  ]
                    .filter(Boolean)
                    .join(" + ")
                : "included allowance only"
            }
          />
          <Row k="Free Change" v={booking.freeChange ? "added" : "not added"} />
        </div>

        {boughtBagsOnLight && (
          <div className="mt-4 rounded-2xl border-l-4 border-pg-orange bg-white p-4">
            <p className="text-[15px] font-bold">What this route cost</p>
            <p className="mt-1 text-[14px] leading-snug text-pg-ink">
              Baggage was bought after taking LIGHT. SAVER included a cabin bag and 25 kg for{" "}
              {formatFare(verdict.best.cost)} GBP more than LIGHT, which was the cheapest route
              to the same cover and the largest allowance.
            </p>
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-white p-4 text-[13px] leading-snug text-pg-ink">
          This is a mock built for the Pegasus × Berkeley Haas AI Travel Companion Hackathon.
          Nothing has been booked, no payment was taken, and every fare here is invented.
        </div>

        <Link
          href="/"
          className="mt-4 block w-full rounded-xl bg-pg-yellow py-4 text-center text-[17px] font-bold text-pg-navy"
        >
          Start another booking
        </Link>
        <Link
          href={href("fare", booking)}
          className="mt-3 block w-full text-center text-[15px] text-pg-ink"
        >
          Back to package selection
        </Link>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-pg-line py-2 last:border-0">
      <span className="text-[14px] text-pg-ink">{k}</span>
      <span className="text-[15px] font-semibold">{v}</span>
    </div>
  );
}
