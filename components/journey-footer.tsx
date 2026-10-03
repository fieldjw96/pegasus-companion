import Link from "next/link";
import { formatFare } from "@/lib/journey/flights";
import { total, type Booking } from "@/lib/journey/booking";

/**
 * The sticky Total amount bar and primary action, pinned above the tab bar on
 * every screen after search. It is in the live app on every one of these
 * screens, and its absence made the mock feel like a set of pages rather than a
 * flow.
 *
 * `disabled` renders the button dead rather than hiding it, because a missing
 * button reads as a broken screen and a greyed one reads as "choose something
 * first" — which is the actual state.
 */
export function JourneyFooter({
  booking,
  label,
  href,
  disabled = false,
  note,
}: {
  booking: Booking;
  label: string;
  href: string;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <div className="absolute inset-x-0 bottom-[72px] z-20 bg-white shadow-[0_-4px_16px_rgba(31,42,55,0.10)]">
      <div className="flex items-center justify-between px-5 py-3">
        <span className="text-[15px] text-pg-navy">Total amount</span>
        <span className="text-[21px] font-bold">{formatFare(total(booking))} GBP</span>
      </div>
      {note !== undefined && (
        <p className="px-5 pb-2 text-[12px] leading-snug text-pg-ink">{note}</p>
      )}
      {disabled ? (
        <span className="block w-full bg-pg-yellow/40 py-4 text-center text-[17px] font-bold text-pg-navy/50">
          {label}
        </span>
      ) : (
        <Link
          href={href}
          className="block w-full bg-pg-yellow py-4 text-center text-[17px] font-bold text-pg-navy"
        >
          {label}
        </Link>
      )}
    </div>
  );
}
