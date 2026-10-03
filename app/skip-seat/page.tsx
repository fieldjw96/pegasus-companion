import Link from "next/link";
import { ReportStep } from "@/components/companion/report-step";
import { href, parseBooking } from "@/lib/journey/booking";

/**
 * The "Attention!" interstitial shown when a passenger skips seat selection.
 *
 * Reproduced verbatim, including the line that makes it worth reproducing:
 * *"You can choose the seat you want at the counter for a fee. These fees may be
 * higher."* May be. No number, at the exact moment a number would decide it.
 *
 * That omission is the same shape as the baggage one, which is why the Companion
 * treats both as the same job: quantify the vague thing at the moment of choice.
 */
export default async function SkipSeatScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const booking = parseBooking(await searchParams);

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
        findings={[
          "The seat warning says counter fees 'may be higher' without saying how much. Front Row Comfort is 24.00-25.00 GBP here.",
        ]}
      />

      <div className="flex items-center justify-between bg-pg-yellow px-4 py-3">
        <span className="w-6" />
        <h1 className="text-[17px] font-bold text-pg-navy">Attention!</h1>
        <Link href={href("seats", booking)} className="text-[22px] leading-none text-pg-navy">
          ✕
        </Link>
      </div>

      <div className="bg-white px-5 pt-5 pb-56">
        <div className="flex gap-3">
          <span className="text-[24px] text-pg-yellow">❗</span>
          <p className="text-[21px] leading-tight font-bold">
            Are you sure you want to continue without purchasing a seat?
          </p>
        </div>

        <p className="mt-4 text-[17px] leading-snug">
          If you don&apos;t purchase a seat,{" "}
          <strong>
            a seat will be assigned to you automatically after check-in. Seat change at the
            counter is not free.
          </strong>
        </p>

        <ul className="mt-4 space-y-3 text-[16px] leading-snug text-pg-navy">
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pg-line" />
            You will not be able to see your seat number until you have completed the check-in
            process. You will be assigned an empty seat on the aircraft.
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pg-line" />
            Seats cannot be changed at the counter for free after check-in is complete.
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pg-line" />
            You can choose the seat you want at the counter for a fee. These fees may be
            higher.
          </li>
        </ul>

        <Link
          href={href("seats", booking)}
          className="mt-7 block w-full rounded-lg bg-pg-yellow py-4 text-center text-[19px] font-semibold text-pg-navy"
        >
          Select Seat
        </Link>
        <Link
          href={href("baggage", booking)}
          className="mt-5 block w-full text-center text-[19px] text-pg-navy"
        >
          Continue
        </Link>
      </div>
    </>
  );
}
