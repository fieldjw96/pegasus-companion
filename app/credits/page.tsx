import Link from "next/link";
import { allCredits } from "@/components/assistant/destination-photo";

/**
 * Image attribution.
 *
 * Several of the destination photographs are CC BY or CC BY-SA, where
 * attribution is a condition of the licence rather than a courtesy. Putting it
 * on a reachable page, generated from the same CREDITS.json the images are
 * loaded from, means it cannot drift out of date when a photo is swapped.
 */
export default function CreditsPage() {
  const credits = allCredits();

  return (
    <div className="assistant-bg min-h-full px-4 pt-6 pb-24">
      <Link href="/" className="text-[14px] font-semibold text-pg-orange">
        ← Back
      </Link>

      <h1 className="mt-4 text-[24px] font-bold tracking-tight">Photography</h1>
      <p className="mt-2 text-[14px] leading-snug text-pg-ink">
        Destination photographs are from Wikimedia Commons, chosen because every file there
        carries machine-readable licence metadata. Each is listed with its author and licence.
      </p>

      <ul className="mt-5 space-y-3">
        {credits.map((credit) => (
          <li key={credit.code} className="pg-card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-bold">{credit.code}</span>
              <span className="rounded-full bg-pg-surface px-2.5 py-0.5 text-[11px] font-semibold">
                {credit.licence}
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-snug">{credit.title}</p>
            <p className="mt-1 text-[12px] text-pg-ink">by {credit.author}</p>
            <a
              href={credit.source}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-block text-[12px] font-semibold text-pg-orange"
            >
              Source
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
