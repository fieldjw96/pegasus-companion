import Link from "next/link";
import { ReportStep } from "@/components/companion/report-step";
import { JourneyFooter } from "@/components/journey-footer";
import { href, parseBooking } from "@/lib/journey/booking";
import { formatFare } from "@/lib/journey/flights";

/** Days between today and departure, computed in code. Jev is never asked. */
function daysUntil(departDate: string): number {
  const today = new Date();
  const depart = new Date(`${departDate}T00:00:00Z`);
  const ms =
    depart.getTime() - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round(ms / 86400000));
}

/**
 * Food and Other Additional Services.
 *
 * Four upsells, each priced "Starting from". Two details are reproduced because
 * they are evidence:
 *
 *   - The Free Change Option appears here *and* on Selected Flights, at the same
 *     6.00, with no memory of having already asked. The funnel has no concept of
 *     an interruption budget; the Companion does.
 *   - Travel insurance is quoted in EUR on a booking priced in GBP throughout.
 */
export default async function ExtrasScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const booking = parseBooking(await searchParams);
  const days = daysUntil(booking.departDate);

  return (
    <>
      <ReportStep
        step="extras"
        route={`${booking.origin}-${booking.destination}`}
        departDate={booking.departDate}
        party={{
          adults: booking.adults,
          children: booking.children,
          infants: booking.infants,
        }}
        findings={
          booking.freeChange
            ? undefined
            : [
                `The Free Change Option at 6.00 GBP is being offered here having already been offered on Selected Flights. Departure is ${days} days away.`,
              ]
        }
      />

      <div className="flex items-center justify-between bg-pg-yellow px-4 py-3">
        <Link
          href={href("baggage", booking)}
          className="text-[22px] leading-none text-pg-navy"
        >
          ←
        </Link>
        <h1 className="text-[16px] font-bold text-pg-navy">
          Food and Other Additional Services
        </h1>
        <Link href={href("payment", booking)} className="text-[17px] font-bold text-pg-navy">
          Skip
        </Link>
      </div>

      <div className="bg-pg-surface px-3 pt-4 pb-56">
        <Card icon="🥪" title="Meal Selection">
          <p className="text-[17px] leading-snug text-pg-navy">
            Take your pick from Pegasus Cafe&apos;s delicious and budget-friendly menu options.
          </p>
          <Outlined label="Add to your flight" href={href("extras", booking)} />
        </Card>

        <Card icon="🛡" title="Free Change Option">
          <p className="text-[17px] leading-snug text-pg-navy">
            There are still <strong>{days}</strong> days until your flight. Plans can change;
            with the Free Cancellation option, you can cancel your ticket or change your
            flight.
          </p>
          <p className="mt-4 text-center text-[17px]">
            Starting from <strong>{formatFare(6)} GBP</strong>
          </p>
          <Outlined
            label={booking.freeChange ? "Added" : "Add to Flight"}
            href={href("extras", booking, { freeChange: !booking.freeChange })}
            active={booking.freeChange}
          />
        </Card>

        <Card icon="🎬" title="In-flight Entertainment">
          <p className="text-[17px] leading-snug text-pg-navy">
            Enjoy entertainment on your device throughout the flight
          </p>
          <p className="mt-4 text-center text-[17px]">
            Starting from <strong>{formatFare(1)} GBP</strong>
          </p>
          <Outlined label="Add to Flight" href={href("extras", booking)} />
        </Card>

        <Card icon="✈" title="GIG Travel Insurance">
          <p className="text-[17px] leading-snug text-pg-navy">
            Remember to purchase travel insurance to feel secure throughout your journey.
          </p>
          {/* EUR, on a booking priced in GBP everywhere else. Reproduced, not fixed. */}
          <p className="mt-4 text-center text-[17px]">
            Starting from <strong>15.00 EUR</strong>
          </p>
          <Outlined label="Add to Flight" href={href("extras", booking)} />
        </Card>
      </div>

      <JourneyFooter
        booking={booking}
        label="Go to Checkout"
        href={href("payment", booking)}
      />
    </>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 rounded-2xl bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="text-[28px]">{icon}</span>
        <h2 className="text-[21px] font-bold">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Outlined({
  label,
  href: to,
  active = false,
}: {
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={to}
      className={`mt-4 block w-full rounded-lg border py-3.5 text-center text-[17px] font-semibold ${
        active
          ? "border-pg-orange bg-pg-orange/10 text-pg-orange"
          : "border-pg-line text-pg-navy"
      }`}
    >
      {label}
    </Link>
  );
}
