"use client";

import { formatFare } from "@/lib/journey/flights";
import { DestinationPhoto } from "./destination-photo";
import type { Suggestion } from "@/lib/assistant/discover";

/**
 * Discovery results.
 *
 * Destinations, not departure times: at this point the passenger has not
 * decided where they are going, and a list of flights would be answering the
 * wrong question.
 *
 * Each card carries the reason it is in the list. A ranking nobody can audit is
 * a slot machine with a brand on it.
 */
export function Suggestions({
  suggestions,
  travellers,
  onChoose,
}: {
  suggestions: Suggestion[];
  travellers: number;
  onChoose: (code: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <section>
      <h2 className="text-[20px] font-bold tracking-tight">Three that fit</h2>
      <p className="mt-0.5 text-[13px] text-pg-ink">
        Cheapest LIGHT fare, for {travellers} travelling.
      </p>

      <div className="mt-3 space-y-3">
        {suggestions.map((s) => (
          <button
            key={s.code}
            type="button"
            onClick={() => onChoose(s.code)}
            className="pg-card block w-full overflow-hidden text-left transition active:scale-[0.99]"
          >
            <span className="relative block h-32">
              <DestinationPhoto code={s.code} className="absolute inset-0 h-full w-full" />
              <span className="relative flex h-full items-end justify-between gap-3 p-4">
                <span className="text-[22px] leading-none font-bold text-white drop-shadow">
                  {s.city}
                </span>
                <span className="shrink-0 rounded-full bg-white/95 px-3 py-1 text-right">
                  <span className="block text-[15px] leading-tight font-bold text-pg-navy">
                    {formatFare(s.from)}
                  </span>
                  <span className="block text-[10px] leading-tight text-pg-ink">from</span>
                </span>
              </span>
            </span>

            <span className="block p-4">
              <span className="block text-[14px] leading-snug text-pg-navy/90">{s.pitch}</span>
              <span className="mt-2 block text-[12px] leading-snug text-pg-ink">
                {s.because}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-pg-orange">
                Plan this one
                <span aria-hidden>→</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
