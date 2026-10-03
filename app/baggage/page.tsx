import Link from "next/link";
import { JourneyFooter } from "@/components/journey-footer";
import { BAGGAGE_PRICES, compareBaggagePaths } from "@/lib/journey/baggage";
import { href, parseBooking } from "@/lib/journey/booking";
import { AIRPORTS, formatFare, type AirportCode } from "@/lib/journey/flights";

/**
 * Baggage Selection.
 *
 * Where the Companion's warning at package selection is proved right or wrong.
 * A passenger who took LIGHT arrives here and finds cabin at 17.00 and 20 kg at
 * 41.00 — 58.00 for less allowance than SAVER included for 30.00 — with the
 * dearer option badged "Recommended".
 *
 * The badge is reproduced deliberately. Removing it would be editorialising, and
 * the comparison only lands because it is really there.
 */
export default async function BaggageScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const booking = parseBooking(await searchParams);
  const originCity = AIRPORTS[booking.origin as AirportCode]?.city ?? booking.origin;
  const destCity = AIRPORTS[booking.destination as AirportCode]?.city ?? booking.destination;

  const verdict = compareBaggagePaths();
  const tookLight = booking.package === "light";

  return (
    <>
      <div className="flex items-center justify-between bg-pg-yellow px-4 py-3">
        <Link href={href("seats", booking)} className="text-[22px] leading-none text-pg-navy">
          ←
        </Link>
        <h1 className="text-[17px] font-bold text-pg-navy">Baggage Selection</h1>
        <span className="w-6" />
      </div>

      <div className="bg-pg-surface px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pg-yellow text-[18px] text-white">
            ✈
          </span>
          <span className="h-px w-5 bg-pg-line" />
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[18px] text-pg-line">
            ✈
          </span>
        </div>
        <p className="mt-4 text-[19px]">
          <strong>Departure flight</strong> {originCity} - {destCity}
        </p>
      </div>

      <div className="bg-pg-surface px-3 pt-4 pb-56">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-[19px] font-bold">JACK FIELD</p>

          <section className="mt-4 rounded-xl border border-pg-line p-3">
            <p className="text-[17px] font-bold">
              Cabin Baggage Allowance: <span className="font-normal">Select</span>
            </p>
            <div className="mt-3 overflow-hidden rounded-lg border border-pg-line">
              <Option
                selected={booking.cabinBag}
                href={href("baggage", booking, { cabinBag: true })}
                label="Cabin Baggage"
                price={`${formatFare(BAGGAGE_PRICES.cabin)} GBP`}
                icon="🧳"
              />
              <Option
                selected={!booking.cabinBag}
                href={href("baggage", booking, { cabinBag: false })}
                label="I do not want cabin baggage"
                icon="🚫"
                divider
              />
            </div>
            <div className="mt-3 flex gap-2 rounded-lg bg-[#EAF4FD] p-3 text-[14px] text-[#1A6FB5]">
              <span>ℹ</span>
              <span>Please complete your mandatory baggage selection.</span>
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-pg-line p-3">
            <p className="text-[17px] font-bold">
              Checked Baggage Allowance: <span className="font-normal">Select</span>
            </p>
            <div className="mt-3 overflow-hidden rounded-lg border border-pg-line">
              <Option
                selected={booking.checkedKg === 12}
                href={href("baggage", booking, { checkedKg: 12 })}
                label="12 Kg"
                price={`${formatFare(BAGGAGE_PRICES.checked12)} GBP`}
                icon="🧳"
              />
              <Option
                selected={booking.checkedKg === 20}
                href={href("baggage", booking, { checkedKg: 20 })}
                label="20 Kg"
                price={`${formatFare(BAGGAGE_PRICES.checked20)} GBP`}
                icon="🧳"
                badge="Recommended"
                divider
              />
              <Option
                selected={booking.checkedKg === 0}
                href={href("baggage", booking, { checkedKg: 0 })}
                label="No checked baggage"
                icon="🚫"
                divider
              />
            </div>
          </section>

          {tookLight && (
            <p className="mt-4 text-[13px] leading-snug text-pg-ink">
              SAVER included a cabin bag and 25 kg for {formatFare(verdict.best.cost)} GBP more
              than LIGHT. The same cover bought here costs{" "}
              {formatFare(BAGGAGE_PRICES.cabin + BAGGAGE_PRICES.checked20)} GBP for 20 kg.
            </p>
          )}
        </div>
      </div>

      <JourneyFooter
        booking={booking}
        label="Proceed to next flight"
        href={href("extras", booking)}
      />
    </>
  );
}

function Option({
  selected,
  href: to,
  label,
  price,
  icon,
  badge,
  divider = false,
}: {
  selected: boolean;
  href: string;
  label: string;
  price?: string;
  icon: string;
  badge?: string;
  divider?: boolean;
}) {
  return (
    <Link
      href={to}
      className={`flex items-center gap-3 p-3 ${divider ? "border-t border-pg-line" : ""}`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-pg-orange bg-pg-orange" : "border-pg-line"
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
      <span className="text-[26px]">{icon}</span>
      {badge !== undefined && (
        <span className="rounded-full bg-gradient-to-r from-[#4A7BF0] to-[#6B4FD8] px-3 py-1 text-[12px] font-semibold text-white">
          {badge}
        </span>
      )}
      <span className="ml-auto text-right">
        <span className="block text-[17px] font-bold">{label}</span>
        {price !== undefined && <span className="block text-[17px] font-bold">{price}</span>}
      </span>
    </Link>
  );
}
