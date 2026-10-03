import Link from "next/link";
import { JourneyFooter } from "@/components/journey-footer";
import { PassengerForm } from "@/components/passenger-form";
import { href, parseBooking } from "@/lib/journey/booking";
import { AIRPORTS, type AirportCode } from "@/lib/journey/flights";

/**
 * Passenger and Contact Details.
 *
 * The form itself is a client island (`PassengerForm`) because it has to be
 * usable — an earlier version rendered the fields as paragraphs, which looked
 * right in a screenshot and could not be typed into.
 *
 * Three of the live app's defaults are reproduced deliberately and are all wrong
 * for this booking: Nationality starts on Turkish Citizen, the phone code on
 * CA (+1), and the date-of-birth error shows before anything is typed. Every one
 * contradicts context the app already holds.
 */
export default async function PassengersScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const booking = parseBooking(await searchParams);
  const originCity = AIRPORTS[booking.origin as AirportCode]?.city ?? booking.origin;

  return (
    <>
      <div className="flex items-center justify-between bg-pg-yellow px-4 py-3">
        <Link href={href("fare", booking)} className="text-[22px] leading-none text-pg-navy">
          ←
        </Link>
        <h1 className="text-[17px] font-bold text-pg-navy">Passenger and Contact Details</h1>
        <span className="w-6" />
      </div>

      <div className="bg-pg-surface px-3 pt-4 pb-56">
        <PassengerForm originCity={originCity} />

        <Collapsed icon="✉" label="Contact Person" />
        <Collapsed icon="♿" label="Wheelchair Service" sub="Click to make a request." />
      </div>

      <JourneyFooter booking={booking} label="Continue" href={href("seats", booking)} />
    </>
  );
}

function Collapsed({ icon, label, sub }: { icon: string; label: string; sub?: string }) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-pg-line">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-[17px] font-semibold text-pg-ink">{label}</span>
        {sub !== undefined && <span className="block text-[14px] text-pg-ink">{sub}</span>}
      </span>
      <span className="text-[18px] text-pg-ink">⌄</span>
    </div>
  );
}
