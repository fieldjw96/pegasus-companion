"use client";

import { useState } from "react";
import { DestinationPhoto } from "./destination-photo";
import { PegasusSays } from "./pegasus-avatar";
import { referenceFor } from "@/lib/assistant/itinerary";
import { FIELD_LABELS, countBySource, type TripDraft } from "@/lib/assistant/draft";
import { AIRPORTS, FARE_RULES, formatFare } from "@/lib/journey/flights";

/**
 * Checkout, then confirmation.
 *
 * The demo needs an ending. A screen that stops at "Checkout" leaves the jury
 * to imagine the payoff, and the payoff is the whole argument: three things
 * said, nine filled in, booked in one pass.
 *
 * Payment is one tap because this is a mock and a card form would be theatre.
 * What is not skipped is the receipt of the assistant's work -- the
 * confirmation restates what was said versus inferred, so the last thing on
 * screen is the thing being claimed.
 */
export function Checkout({
  draft,
  total,
  onBack,
}: {
  draft: TripDraft;
  total: number;
  onBack: () => void;
}) {
  const [done, setDone] = useState(false);
  const counts = countBySource(draft);
  // The same reference the ticket printed. It was hardcoded here, so the
  // confirmation screen quietly disagreed with the pass two taps earlier --
  // exactly the detail a judge notices and nobody writing the code does.
  const reference = referenceFor(draft);
  const city =
    AIRPORTS[draft.destination.value as keyof typeof AIRPORTS]?.city ??
    draft.destination.value;
  const people = draft.party.value.adults + draft.party.value.children;

  if (done) {
    return (
      <div className="px-4 pt-6 pb-24">
        <div className="pg-card overflow-hidden">
          <div className="relative h-44">
            <DestinationPhoto
              code={draft.destination.value}
              className="absolute inset-0 h-full w-full"
            />
            <div className="relative flex h-full flex-col justify-end p-5">
              <p className="text-[12px] font-bold tracking-wider text-white/80 uppercase">
                Booked
              </p>
              <p className="text-[30px] leading-none font-bold text-white drop-shadow">
                {city}
              </p>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-pg-ink">Reference</span>
              <span className="font-mono text-[16px] font-bold">{reference}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-[13px] text-pg-ink">Paid</span>
              <span className="text-[20px] font-bold">{formatFare(total)} GBP</span>
            </div>

            <div className="mt-5 rounded-2xl bg-pg-surface p-4">
              <PegasusSays size={32}>
                You said {counts.said} thing{counts.said === 1 ? "" : "s"}. I remembered{" "}
                {counts.profile} and worked out {counts.predicted}. One screen, no forms, and
                every one of my guesses was on the ticket before you paid.
              </PegasusSays>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-[12px] leading-snug text-pg-ink">
          Nothing was booked and no payment was taken. This is a mock built for the Pegasus ×
          Berkeley Haas AI Travel Companion Hackathon.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-40">
      <button
        type="button"
        onClick={onBack}
        className="text-[14px] font-semibold text-pg-orange"
      >
        ← Back to the trip
      </button>

      <h1 className="mt-4 text-[26px] leading-tight font-bold tracking-tight">
        One tap and you are going to {city}
      </h1>

      <div className="pg-card mt-5 p-5">
        <Line k="Route" v={`${draft.origin.value} → ${draft.destination.value}`} />
        <Line k="Out" v={pretty(draft.departDate.value)} />
        <Line
          k="Back"
          v={draft.returnDate.value === null ? "One way" : pretty(draft.returnDate.value)}
        />
        <Line k={FIELD_LABELS.party} v={`${people} travelling`} />
        <Line k="Fare" v={FARE_RULES[draft.package.value].label} />
        <Line
          k="Baggage"
          v={
            draft.checkedKg.value === 0 ? "Cabin only" : `${draft.checkedKg.value} kg checked`
          }
        />
        <div className="mt-4 flex items-baseline justify-between border-t border-pg-line pt-4">
          <span className="text-[15px] font-bold">Total</span>
          <span className="text-[24px] font-bold">{formatFare(total)} GBP</span>
        </div>
      </div>

      <div className="pg-card mt-4 p-5">
        <p className="text-[13px] font-bold">Paying with</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-9 w-14 items-center justify-center rounded-md bg-pg-navy text-[11px] font-bold text-white">
            VISA
          </span>
          <span className="font-mono text-[15px]">•••• 4471</span>
          <span className="ml-auto text-[13px] font-semibold text-pg-orange">Change</span>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-pg-line bg-white/95 px-4 pt-3 pb-5 backdrop-blur">
        <button
          type="button"
          onClick={() => setDone(true)}
          className="mx-auto block w-full max-w-[358px] rounded-full bg-pg-yellow py-4 text-[17px] font-bold text-pg-navy"
        >
          Pay {formatFare(total)} GBP
        </button>
      </div>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-pg-line py-2.5 last:border-0">
      <span className="text-[13px] text-pg-ink">{k}</span>
      <span className="text-[15px] font-semibold">{v}</span>
    </div>
  );
}

function pretty(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
