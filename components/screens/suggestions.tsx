"use client";

import { DestinationPhoto } from "@/components/ui/destination-photo";
import { ArrowRight } from "@/components/ui/primitives";
import { formatFare } from "@/lib/journey/flights";
import type { Suggestion } from "@/lib/assistant/discover";

/**
 * Discovery results. Destinations, not departure times: at this point the
 * passenger has not decided where they are going, and a list of flights would
 * be answering the wrong question. Each card carries the reason it is in the
 * list. A ranking nobody can audit is a slot machine with a brand on it.
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
      <h2 className="text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
        Three that fit
      </h2>
      <p className="mt-0.5 text-[13px] text-pg-ink">
        Cheapest LIGHT return each, for {travellers} travelling.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {suggestions.map((s) => (
          <button
            key={s.code}
            type="button"
            onClick={() => onChoose(s.code)}
            className="pg-card block w-full overflow-hidden text-left"
          >
            <span className="relative block h-32">
              <DestinationPhoto code={s.code} className="absolute inset-0" />
              <span className="relative flex h-full items-end justify-between gap-3 p-4">
                <span className="text-[22px] leading-none font-extrabold text-white">
                  {s.city}
                </span>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-right">
                  <span className="tabular block text-[15px] leading-tight font-extrabold">
                    {formatFare(s.from)}
                  </span>
                  <span className="block text-[10px] leading-tight text-pg-ink">from</span>
                </span>
              </span>
            </span>
            <span className="block p-4">
              <span className="block text-[14px] leading-snug">{s.pitch}</span>
              <span className="mt-2 block text-[12px] leading-snug text-pg-ink">
                {s.because}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-pg-orange">
                Plan this one
                <ArrowRight size={14} />
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
