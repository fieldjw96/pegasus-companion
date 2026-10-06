"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { StatusBar, BottomNav } from "@/components/ui/app-shell";
import { BackArrow, PrimaryButton, TextButton } from "@/components/ui/primitives";
import type { TripDraft } from "@/lib/assistant/draft";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { breakdown, withLines, type PriceLine } from "@/lib/assistant/price";
import { AIRPORTS, FARE_RULES, formatFare } from "@/lib/journey/flights";
import { shortDate } from "@/lib/demo/personas";
import { baggageOf, cityOf } from "./ticket";

/**
 * Checkout: one tap, because this is a mock and a card form would be theatre.
 *
 * What is not skipped is the receipt of the companion's work. The passport and
 * payment lines say where they came from, because "nothing to type" is a
 * claim this screen has to show rather than assert.
 *
 * Tom's card is declined once. The companion's rescue is the next line: try
 * Apple Pay, the seat is still next to them.
 */
export function CheckoutScreen({
  draft,
  names,
  seat,
  onFile,
  backHref,
  nextHref,
  extraLines = [],
  note,
  declineFirst = false,
  onPay,
  owner,
  cta = "Pay",
}: {
  draft: TripDraft;
  names: string[];
  /** Printed after the traveller's name when a seat was bought. */
  seat?: string | null;
  onFile: { passport: string; payment: string };
  backHref: string;
  nextHref: string;
  extraLines?: PriceLine[];
  /** A heads-up the companion caught before payment. */
  note?: ReactNode;
  /** The first attempt fails, and Apple Pay is offered. */
  declineFirst?: boolean;
  onPay: () => void;
  owner?: string;
  cta?: string;
}) {
  const router = useRouter();
  const [declined, setDeclined] = useState(false);
  const price = withLines(breakdown(draft), extraLines);
  const itinerary = itineraryFor(draft, owner);
  const city = cityOf(draft.destination.value);
  const people = draft.party.value.adults + draft.party.value.children;
  const route = [
    draft.origin.value,
    ...draft.stops.value.map((s) => s.code),
    ...(draft.stops.value.length > 0 ? [] : [draft.destination.value]),
  ]
    .map((code) => AIRPORTS[code as keyof typeof AIRPORTS]?.city ?? code)
    .filter((c, i, all) => i === 0 || c !== all[i - 1]);

  return (
    <div className="relative flex h-full flex-col bg-pg-surface text-pg-navy">
      <StatusBar />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-4">
        <TextButton href={backHref} className="gap-2 text-[15px] text-pg-navy">
          <BackArrow />
          Back to the trip
        </TextButton>
        <h1
          className="mt-2 text-[28px] leading-[34px] font-extrabold tracking-[-0.02em]"
          style={{ textWrap: "balance" }}
        >
          One tap and you are going to {city}
        </h1>

        <dl className="pg-card mt-5 flex flex-col px-5 pt-1.5">
          <Line k="Route" v={route.join(" → ")} />
          <Line
            k="Out"
            v={`${shortDate(draft.departDate.value)}${itinerary.out === null ? "" : ` · ${itinerary.out.flight.departs}`}`}
          />
          <Line
            k="Back"
            v={
              draft.returnDate.value === null
                ? "One way"
                : `${shortDate(draft.returnDate.value)}${itinerary.back === null ? "" : ` · ${itinerary.back.flight.departs}`}`
            }
          />
          <Line
            k="Travellers"
            v={`${names[0] ?? "Passenger"}${people > 1 ? ` +${people - 1}` : ""}${
              seat ? ` · ${seat}` : ""
            }`}
          />
          <Line k="Fare" v={FARE_RULES[draft.package.value].label} />
          <Line k="Baggage" v={baggageOf(draft)} last />
          <div className="flex h-[60px] items-center justify-between gap-4">
            <dt className="text-[15px] font-extrabold">Total</dt>
            <dd className="m-0 flex items-baseline gap-1.5">
              <span className="display text-[24px] leading-7 font-extrabold">
                {formatFare(price.total)}
              </span>
              <span className="text-[13px] font-bold">GBP</span>
            </dd>
          </div>
        </dl>

        <div className="pg-card mt-4 flex flex-col px-5 py-1">
          <div className="flex h-[52px] items-center justify-between gap-4 border-b border-pg-line">
            <span className="caps">Passport</span>
            <span className="text-[14px] font-bold">{onFile.passport}</span>
          </div>
          <div className="flex h-[52px] items-center justify-between gap-3">
            <span className="caps">Paying with</span>
            <span className="flex items-center gap-3">
              <span className="text-[14px] font-bold">
                {declined ? "Apple Pay" : onFile.payment}
              </span>
              <TextButton ariaLabel="Change payment" className="min-h-0 pl-1">
                Change
              </TextButton>
            </span>
          </div>
        </div>
        <p className="mt-2 px-1 text-[12px] leading-[18px] text-pg-ink">
          Nothing to type. Both are on file, and a wrong guess costs one tap.
        </p>

        {note !== undefined && (
          <div
            className="mt-4 rounded-[14px] bg-pg-speech px-4 py-3.5 text-[14px] leading-5"
            style={{ textWrap: "pretty" }}
          >
            {note}
          </div>
        )}

        {declined && (
          <div
            role="alert"
            className="fade mt-4 rounded-[14px] bg-white px-4 py-3.5 text-[14px] leading-5 shadow-[inset_0_0_0_2px_#1F2A37]"
            style={{ textWrap: "pretty" }}
          >
            <strong className="font-extrabold">Card declined.</strong> Try Apple Pay.{" "}
            {seat ?? "Your seat"} is still next to them.
          </div>
        )}
      </main>
      <div className="shrink-0 px-5 pt-3 pb-3.5">
        <PrimaryButton
          size="lg"
          onClick={() => {
            if (declineFirst && !declined) {
              setDeclined(true);
              return;
            }
            onPay();
            router.push(nextHref);
          }}
        >
          {declined ? "Pay with Apple Pay" : cta} {formatFare(price.total)} GBP
        </PrimaryButton>
      </div>
      <BottomNav />
    </div>
  );
}

function Line({ k, v, last = false }: { k: string; v: string; last?: boolean }) {
  return (
    <div
      className={`flex min-h-[43px] items-center justify-between gap-4 py-1.5 ${
        last ? "border-b-2 border-pg-navy" : "border-b border-pg-line"
      }`}
    >
      <dt className="shrink-0 text-[14px] text-pg-ink">{k}</dt>
      <dd className="tabular m-0 text-right text-[15px] font-bold">{v}</dd>
    </div>
  );
}
