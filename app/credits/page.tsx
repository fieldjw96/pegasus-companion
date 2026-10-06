import Link from "next/link";
import { AppShell } from "@/components/ui/app-shell";
import { allCredits } from "@/components/ui/destination-photo";

/**
 * Image attribution. Several of the destination photographs are CC BY or CC
 * BY-SA, where attribution is a condition of the licence. The list is generated
 * from the same CREDITS.json the images load from, so it cannot drift.
 */
export default function CreditsPage() {
  const credits = allCredits();
  return (
    <AppShell bodyClassName="pt-4 pb-8">
      <Link href="/" className="text-[14px] font-bold text-pg-orange">
        ← Back
      </Link>
      <h1 className="mt-4 text-[28px] leading-[34px] font-extrabold tracking-[-0.02em]">
        Photography
      </h1>
      <p className="mt-2 text-[14px] leading-5 text-pg-ink">
        Destination photographs are from Wikimedia Commons, chosen because every file there
        carries machine-readable licence metadata. Each is listed with its author and licence.
      </p>
      <ul className="mt-5 flex flex-col gap-3">
        {credits.map((credit) => (
          <li key={credit.code} className="pg-card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="display text-[15px] font-extrabold">{credit.code}</span>
              <span className="rounded-full bg-pg-surface px-2.5 py-0.5 text-[11px] font-bold">
                {credit.licence}
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-snug">{credit.title}</p>
            <p className="mt-1 text-[12px] text-pg-ink">by {credit.author}</p>
            <a
              href={credit.source}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-block text-[12px] font-bold text-pg-orange"
            >
              Source
            </a>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
