import Link from "next/link";
import { ReportStep } from "@/components/companion/report-step";
import { JourneyFooter } from "@/components/journey-footer";
import { href, parseBooking } from "@/lib/journey/booking";
import { AIRPORTS, type AirportCode } from "@/lib/journey/flights";

/**
 * Passenger and Contact Details.
 *
 * Reproduced faithfully, including three things the live app gets wrong, because
 * they are the "reduce friction" evidence and a mock that quietly fixed them
 * would destroy the comparison:
 *
 *   - Nationality defaults to Turkish Citizen and demands a Turkish ID, for a
 *     passenger departing London Stansted.
 *   - The phone country code defaults to CA (+1).
 *   - Validation errors show before anything has been typed.
 *
 * Every one of those contradicts context the app already holds.
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
      <ReportStep
        step="passengers"
        route={`${booking.origin}-${booking.destination}`}
        departDate={booking.departDate}
        party={{
          adults: booking.adults,
          children: booking.children,
          infants: booking.infants,
        }}
        findings={[
          `Departure is ${originCity}, the fare is in GBP, and the account is Jack Field — yet Nationality defaults to Turkish Citizen and the phone code to CA (+1).`,
        ]}
      />

      <div className="flex items-center justify-between bg-pg-yellow px-4 py-3">
        <Link href={href("fare", booking)} className="text-[22px] leading-none text-pg-navy">
          ←
        </Link>
        <h1 className="text-[17px] font-bold text-pg-navy">Passenger and Contact Details</h1>
        <span className="w-6" />
      </div>

      <div className="bg-pg-surface px-3 pt-4 pb-56">
        <div className="rounded-2xl bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-pg-yellow">
              👤
            </span>
            <div className="flex-1">
              <p className="text-[19px] font-bold">1. Adult passenger</p>
              <p className="text-[15px] text-pg-ink">Aged 12+</p>
            </div>
            <span className="text-[18px] text-pg-yellow">⌃</span>
          </div>

          <div className="mt-4 rounded-xl bg-pg-surface p-3">
            <p className="text-[16px] font-semibold">Select from Registered Contacts</p>
            <div className="mt-3 flex gap-3">
              <span className="rounded-md border border-pg-line bg-white px-4 py-2.5 text-[15px]">
                New Contact
              </span>
              <span className="rounded-md border border-pg-yellow bg-pg-yellow px-4 py-2.5 text-[15px] font-medium">
                Jack F.
              </span>
            </div>
          </div>

          <Field label="Name*" value="Jack" />
          <Field label="Surname*" value="Field" />

          <div className="mt-4 flex gap-3 rounded-xl bg-pg-surface p-3 text-[14px] leading-snug">
            <span className="text-pg-yellow">❗</span>
            <span>
              The details on your ticket and travel document (ID/passport) must be identical.
            </span>
          </div>

          <Field
            label="Date of birth*"
            value=""
            placeholder="DD/MM/YYYY"
            error="The age range for adults should be 12+."
          />

          <div className="mt-5">
            <p className="text-[17px] font-bold">Gender*</p>
            <div className="mt-2 flex gap-8">
              <Radio label="Female" />
              <Radio label="Male" />
            </div>
            <p className="mt-2 text-right text-[14px] text-red-600">Gender must be selected</p>
          </div>

          <div className="mt-5">
            <p className="text-[17px] font-bold">Nationality*</p>
            <div className="mt-2 flex gap-8">
              <Radio label="Turkish Citizen" checked />
              <Radio label="Other" />
            </div>
          </div>

          <Field
            label="Turkish ID Number*"
            value=""
            placeholder="Enter"
            error="Incorrect Turkish ID"
          />

          <div className="mt-5">
            <p className="text-[14px] text-pg-ink">Mobile Phone ⓘ</p>
            <div className="mt-1 flex items-baseline gap-3 border-b border-pg-line pb-1 text-[17px]">
              <span className="font-semibold text-pg-ink">CA (+1) ⌄</span>
              <span className="font-semibold">3412</span>
              <span className="text-pg-line">|</span>
              <span className="font-semibold">543412</span>
            </div>
          </div>

          <p className="mt-5 text-[13px] text-pg-ink">*Required fields.</p>
        </div>

        <Collapsed icon="✉" label="Contact Person" />
        <Collapsed icon="♿" label="Wheelchair Service" sub="Click to make a request." />
      </div>

      <JourneyFooter booking={booking} label="Continue" href={href("seats", booking)} />
    </>
  );
}

function Field({
  label,
  value,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="mt-5">
      <p className="text-[14px] text-pg-ink">{label}</p>
      <p
        className={`border-b pb-1 text-[19px] font-bold ${
          error === undefined ? "border-pg-line" : "border-red-600"
        } ${value === "" ? "text-pg-line" : ""}`}
      >
        {value === "" ? placeholder : value}
      </p>
      {error !== undefined && (
        <p className="mt-1 text-right text-[14px] text-red-600">{error}</p>
      )}
    </div>
  );
}

function Radio({ label, checked = false }: { label: string; checked?: boolean }) {
  return (
    <span className="flex items-center gap-3 text-[17px]">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
          checked ? "border-pg-yellow bg-pg-yellow" : "border-pg-line"
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
      {label}
    </span>
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
