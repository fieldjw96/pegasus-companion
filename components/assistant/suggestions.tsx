"use client";

import { formatFare } from "@/lib/journey/flights";
import type { Suggestion } from "@/lib/assistant/discover";

/**
 * Discovery results.
 *
 * Destinations, not departure times: at this point the passenger has not
 * decided where they are going, and a list of flights would be answering the
 * wrong question.
 *
 * Each card carries the reason it is in the list. A ranking nobody can audit is
 * just a slot machine with a brand on it.
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
      <h2 className="text-[19px] font-bold">Three that fit</h2>
      <p className="mt-0.5 text-[13px] text-pg-soft">
        Prices are the cheapest LIGHT fare for {travellers} travelling.
      </p>

      <div className="mt-3 space-y-3">
        {suggestions.map((s) => (
          <button
            key={s.code}
            type="button"
            onClick={() => onChoose(s.code)}
            className="block w-full rounded-2xl border border-pg-edge bg-white p-4 text-left transition hover:border-pg-yellow"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[18px] font-bold">{s.city}</span>
              <span className="shrink-0 text-right">
                <span className="block text-[17px] font-bold">{formatFare(s.from)}</span>
                <span className="block text-[11px] text-pg-soft">from, each way</span>
              </span>
            </div>
            <p className="mt-1 text-[14px] leading-snug text-pg-navy/85">{s.pitch}</p>
            <p className="mt-2 text-[12px] leading-snug text-pg-soft">{s.because}</p>
            <span className="mt-3 inline-block text-[13px] font-semibold text-pg-orange">
              Plan this one →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
