"use client";

import { useRouter } from "next/navigation";
import { StatusBar, BottomNav } from "@/components/ui/app-shell";
import { BackArrow, PrimaryButton, TextButton } from "@/components/ui/primitives";
import type { TripDraft } from "@/lib/assistant/draft";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { priceOf } from "@/lib/assistant/price";
import { AIRPORTS, FARE_RULES, formatFare } from "@/lib/journey/flights";
import { shortDate } from "@/lib/demo/hero";
import { baggageOf } from "./ticket";

/**
 * Checkout: one tap, because this is a mock and a card form would be theatre.
 * The summary is a flat list because this is the moment to read, not to edit.
 */
export function CheckoutScreen({
  draft,
  names,
  seat,
  card,
  backHref,
  nextHref,
  extra = 0,
  onPay,
  owner,
}: {
  draft: TripDraft;
  names: string[];
  /** Printed after the traveller's name when a seat was bought. */
  seat?: string | null;
  card: { brand: string; last4: string };
  backHref: string;
  /** Where paying leads. */
  nextHref: string;
  /** Anything bought on top of the fare, such as a seat. */
  extra?: number;
  onPay: () => void;
  owner?: string;
}) {
  const router = useRouter();
  const total = Math.round((priceOf(draft) + extra) * 100) / 100;
  const itinerary = itineraryFor(draft, owner);
  const city =
    AIRPORTS[draft.destination.value as keyof typeof AIRPORTS]?.city ??
    draft.destination.value;
  const people = draft.party.value.adults + draft.party.value.children;
  const origin =
    AIRPORTS[draft.origin.value as keyof typeof AIRPORTS]?.name ?? draft.origin.value;

  return (
    <div className="relative flex h-full flex-col bg-pg-surface text-pg-navy">
      <StatusBar />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pt-3">
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
          <Line k="Route" v={`${origin} → ${city}`} />
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
                {formatFare(total)}
              </span>
              <span className="text-[13px] font-bold">GBP</span>
            </dd>
          </div>
        </dl>

        <div className="pg-card mt-4 flex flex-col gap-1 px-5 pt-3.5 pb-3">
          <span className="caps">Paying with</span>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-7 rounded-md border border-pg-line bg-pg-surface px-2.5 text-[12px] leading-7 font-extrabold tracking-[0.06em]">
                {card.brand}
              </span>
              <span className="tabular text-[16px] font-bold tracking-[0.02em]">
                •••• {card.last4}
              </span>
            </div>
            <TextButton ariaLabel="Change payment card" className="pl-3">
              Change
            </TextButton>
          </div>
        </div>
      </main>
      <div className="shrink-0 px-5 pt-3 pb-3.5">
        <PrimaryButton
          size="lg"
          onClick={() => {
            onPay();
            router.push(nextHref);
          }}
        >
          Pay {formatFare(total)} GBP
        </PrimaryButton>
      </div>
      <BottomNav />
    </div>
  );
}

function Line({ k, v, last = false }: { k: string; v: string; last?: boolean }) {
  return (
    <div
      className={`flex h-[43px] items-center justify-between gap-4 ${
        last ? "border-b-2 border-pg-navy" : "border-b border-pg-line"
      }`}
    >
      <dt className="text-[14px] text-pg-ink">{k}</dt>
      <dd className="tabular m-0 text-[15px] font-bold">{v}</dd>
    </div>
  );
}
