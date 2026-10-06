"use client";

import type { ReactNode } from "react";
import { BottomNav } from "@/components/ui/app-shell";
import { Says } from "@/components/ui/avatar";
import { DestinationPhoto } from "@/components/ui/destination-photo";
import { Wordmark } from "@/components/ui/primitives";
import type { TripDraft } from "@/lib/assistant/draft";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { priceOf } from "@/lib/assistant/price";
import { AIRPORTS, formatFare } from "@/lib/journey/flights";

/**
 * Confirmation. The demo needs an ending, and the ending restates the claim:
 * what was said versus inferred, so the last thing on screen is the thing
 * being argued.
 */
export function ConfirmationScreen({
  draft,
  owner,
  extra = 0,
  says,
  children,
}: {
  draft: TripDraft;
  owner?: string;
  /** Anything bought on top of the fare, such as a seat. */
  extra?: number;
  /** The companion's one line under the receipt. */
  says: ReactNode;
  /** Anything else: the group card, the seat, the group progress. */
  children?: ReactNode;
}) {
  const itinerary = itineraryFor(draft, owner);
  const total = Math.round((priceOf(draft) + extra) * 100) / 100;
  const city =
    AIRPORTS[draft.destination.value as keyof typeof AIRPORTS]?.city ??
    draft.destination.value;

  return (
    <div className="relative flex h-full flex-col bg-pg-surface text-pg-navy">
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="relative h-[300px] shrink-0">
          <DestinationPhoto
            code={draft.destination.value}
            className="absolute inset-0"
            scrim={false}
            priority
          />
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(31,42,55,0.45) 0%, rgba(31,42,55,0) 40%, rgba(31,42,55,0.75) 100%)",
            }}
          />
          <Wordmark size={22} className="absolute top-[66px] left-5 text-white" />
          <div className="absolute bottom-[54px] left-5 flex flex-col gap-1.5 text-white">
            <span className="flex h-6 items-center gap-1.5 self-start rounded-full bg-pg-yellow pr-2.5 pl-1.5 text-[11px] font-extrabold tracking-[0.08em] text-pg-navy">
              <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden>
                <path
                  d="M4.5 10.5l3.5 3.5 7.5-8"
                  fill="none"
                  stroke="#1F2A37"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              BOOKED
            </span>
            <h1 className="text-[44px] leading-[46px] font-extrabold tracking-[-0.02em]">
              {city}
            </h1>
          </div>
        </div>

        <div className="px-5 pb-6">
          <div className="pg-hero-card relative -mt-[34px] grid grid-cols-2 gap-4 px-5 py-[18px]">
            <div className="flex flex-col gap-1">
              <span className="caps">Reference</span>
              <span className="display text-[24px] leading-[30px] font-extrabold tracking-[0.06em]">
                {itinerary.reference}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-l border-pg-line pl-4">
              <span className="caps">Paid</span>
              <span className="flex items-baseline gap-1.5">
                <span className="display text-[24px] leading-[30px] font-extrabold">
                  {formatFare(total)}
                </span>
                <span className="text-[13px] font-bold">GBP</span>
              </span>
            </div>
          </div>

          <Says big className="mt-6">
            {says}
          </Says>

          {children}

          <p className="mt-6 border-t border-pg-line pt-4 text-[12px] leading-[18px] text-pg-ink">
            Nothing was booked and no payment was taken. This is a mock built for the Pegasus ×
            Berkeley Haas AI Travel Companion Hackathon.{" "}
            <a href="/credits" className="font-semibold text-pg-ink underline">
              Photography credits.
            </a>
          </p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
