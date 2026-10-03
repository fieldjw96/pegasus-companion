import Link from "next/link";
import { ReportStep } from "@/components/companion/report-step";
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
      <ReportStep
        step="payment"
        route={`${booking.origin}-${booking.destination}`}
        departDate={booking.departDate}
        party={{
          adults: booking.adults,
          children: booking.children,
          infants: booking.infants,
        }}
        findings={[
          "Payment shows a countdown of about an hour. Nothing about the fare actually expires then; it is a hold, not a deadline.",
        ]}
      />

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

          <div className="mt-4 flex items-start gap-3">
            <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-pg-yellow bg-pg-yellow">
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
            <span>
              <span className="block text-[17px]">Enter Card Information</span>
              <span className="block text-[15px] text-pg-ink">
                (Visa, Master Card, Maestro, Electron, American Express, Troy)
              </span>
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3 text-pg-line">
            <span className="h-6 w-6 rounded-full border-2 border-pg-line" />
            <span className="text-[17px]">Choose from your saved cards</span>
          </div>

          <CardField label="Card number" placeholder="Enter" />
          <CardField label="Credit card holder" placeholder="Enter" />
          <CardField label="Expiry date" placeholder="Month/Year" />
          <CardField label="CVV" placeholder="Enter" />

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

function CardField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="mt-4">
      <p className="text-[15px] text-pg-ink">{label}</p>
      <p className="border-b border-pg-line pb-1 text-[19px] text-pg-line">{placeholder}</p>
    </div>
  );
}
