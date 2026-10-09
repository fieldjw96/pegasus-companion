"use client";

import { useRouter, usePathname } from "next/navigation";
import { useJourney } from "./journey-provider";
import { asideFor } from "./companion-phone";
import { dayMonth, shift, willDraft } from "@/lib/demo/personas";

/**
 * Time, for a phone that cannot move its own clock.
 *
 * Most of what the companion does happens later: the evening the invites go
 * out, the morning check-in opens, the morning the companion speaks first.
 * The strip under the main phone jumps to those moments. It is the
 * presenter's, like the panel, and it is the one thing the phone cannot do
 * for itself.
 */
type Jump = { label: string; when: string; href: string };

function willJumps(out: string, back: string): Jump[] {
  return [
    { label: "The nudge", when: "3 Mar, 08:30", href: "/nudge" },
    { label: "Mum's phone", when: "3 Mar, 18:33", href: "/follow/mum" },
    { label: "Waiting window", when: "4 Mar, 20:14", href: "/squad/waiting" },
    { label: "Jess stalls", when: "5 Mar, 09:15", href: "/invite/jess/stalls" },
    { label: "Hostel", when: "6 Mar, 19:40", href: "/squad/hostel" },
    { label: "Check-in", when: `${dayMonth(shift(out, -2))}, 05:30`, href: "/squad/check-in" },
    { label: "Cancelled", when: `${dayMonth(out)}, 04:50`, href: "/squad/cancelled" },
    { label: "Next trip", when: dayMonth(shift(back, 60)), href: "/squad/next-trip" },
  ];
}

export function TimeStrip() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, update } = useJourney();
  const draft = state.draft ?? willDraft();
  const jumps = willJumps(
    draft.departDate.value,
    draft.returnDate.value ?? draft.departDate.value,
  );
  return (
    <nav
      aria-label="Jump in time"
      className="flex w-[410px] flex-wrap items-center gap-1.5 px-1"
    >
      <span className="mr-1 text-[11px] font-bold tracking-[0.08em] text-pg-ink uppercase">
        Later
      </span>
      {jumps.map((j) => {
        const aside = asideFor(j.href);
        const on = aside === null ? pathname === j.href : state.aside?.route === j.href;
        return (
          <button
            key={j.href}
            type="button"
            aria-current={on ? "true" : undefined}
            onClick={() => {
              if (aside !== null) update({ aside });
              else router.push(j.href);
            }}
            className={`flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold ${
              on ? "bg-pg-navy text-white" : "bg-pg-surface text-pg-ink hover:text-pg-navy"
            }`}
          >
            <span className={`tabular ${on ? "text-white/60" : "text-pg-muted"}`}>
              {j.when}
            </span>
            {j.label}
          </button>
        );
      })}
    </nav>
  );
}
