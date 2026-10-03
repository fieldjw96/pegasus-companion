import Link from "next/link";
import { CardForm } from "@/components/card-form";
import { JourneyFooter } from "@/components/journey-footer";
import { href, packageLabel, parseBooking, passengerCount } from "@/lib/journey/booking";
import { AIRPORTS, type AirportCode } from "@/lib/journey/flights";

/**
 * Payment.
 *
 * The purple "Last Chance to Buy At This Price" bar is the sharpest thing in the
 * whole funnel and is reproduced exactly. The app manufactures roughly an hour
 * of time pressure at the moment of payment, having left the real uncertainty —
 * book now or wait? — entirely alone for the three days before it.
 *
 * A Companion that watches a fare across days is the opposite of that bar, and
 * the two belong on one slide.
 */
export default async function PaymentScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const booking = parseBooking(await searchParams);
  const originCity = AIRPORTS[booking.origin as AirportCode]?.city ?? booking.origin;
  const destCity = AIRPORTS[booking.destination as AirportCode]?.city ?? booking.destination;

  return (
    <>
      <div className="flex items-center justify-between bg-pg-yellow px-4 py-3">
        <Link href={href("extras", booking)} className="text-[22px] leading-none text-pg-navy">
          ←
        </Link>
        <h1 className="text-[17px] font-bold text-pg-navy">Payment</h1>
        <span className="w-6" />
      </div>

      <div className="flex items-center justify-between bg-[#6B4FD8] px-4 py-3 text-white">
        <span className="text-[15px] font-semibold">Last Chance to Buy At This Price:</span>
        <span className="text-[15px] font-semibold">{deadline()}</span>
      </div>

      <div className="bg-pg-surface px-3 pt-4 pb-56">
        <div className="overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between bg-pg-surface px-4 py-3">
            <span className="text-[17px] font-bold">PNR No: 2GUPGP</span>
            <span className="text-[15px]">Travel Summary →</span>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <span>
                <span className="block text-[30px] leading-none font-bold">
                  {booking.origin}
                </span>
                <span className="block text-[13px] text-pg-ink">{originCity}</span>
              </span>
              <span className="text-[18px] text-pg-navy">· · ✈ · ·</span>
              <span className="text-right">
                <span className="block text-[30px] leading-none font-bold">
                  {booking.destination}
                </span>
                <span className="block text-[13px] text-pg-ink">{destCity}</span>
              </span>
            </div>
            <div className="mt-4 flex items-center gap-4 border-t border-pg-line pt-3 text-[15px]">
              <span>✈ Round Trip</span>
              <span className="text-pg-line">|</span>
              <span>👤 {passengerCount(booking)} Adult(s)</span>
              {packageLabel(booking) !== null && (
                <span className="ml-auto rounded bg-pg-surface px-2 py-1 text-[13px] font-bold">
                  {packageLabel(booking)}
                </span>
              )}
            </div>
          </div>
        </div>

        <h2 className="mt-5 mb-2 text-[21px] font-bold">Special Offers</h2>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
          <span className="text-[24px]">🎁</span>
          <span className="flex-1 text-[17px] font-bold">USE CAMPAIGN</span>
          <span className="text-[15px]">✏ Edit</span>
        </div>

        <h2 className="mt-5 mb-2 text-[21px] font-bold">Payment Methods</h2>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-pg-yellow">
          <div className="flex items-center justify-between">
            <p className="text-[19px] font-bold">Pay with credit or debit card</p>
            <span className="text-[18px]">⌃</span>
          </div>

          <CardForm />

          <p className="mt-5 text-[17px] font-bold">Installment Options</p>
          <p className="text-[15px] text-pg-ink">
            Enter your credit card details to view your instalment options
          </p>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-pg-line px-4 py-3 text-[15px] font-semibold">
            CLICK HERE FOR INSTALMENT OPTIONS <span>›</span>
          </div>

          <p className="mt-4 flex items-center gap-2 text-[14px] text-green-700">
            🔒 Secured Booking
          </p>
        </div>

        {[
          "Pay with PayPal",
          "Online Bank Transfer",
          "Pay with Trustly",
          "Pay with Apple Pay",
        ].map((method) => (
          <div
            key={method}
            className="mt-3 flex items-center justify-between rounded-2xl bg-white p-4 text-[19px] font-bold"
          >
            {method}
          </div>
        ))}
      </div>

      <JourneyFooter booking={booking} label="Pay now" href={href("confirmation", booking)} />
    </>
  );
}

/** About an hour out, matching the live app's window. */
function deadline(): string {
  const d = new Date(Date.now() + 58 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
