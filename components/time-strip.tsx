"use client";

import { useRouter, usePathname } from "next/navigation";
import { useJourney } from "./journey-provider";
import { asideFor } from "./companion-phone";
import { momentDates } from "@/lib/moments/moments";
import { dayMonth, shift, willDraft } from "@/lib/demo/personas";
import { inviteWhen } from "@/lib/group/when";

/**
 * Time, for a phone that cannot move its own clock.
 *
 * Most of what the companion does happens later: the evening the invites go
 * out, the morning check-in opens, the April morning two months before a
 * birthday. The strip under the main phone jumps to those moments. It is the
 * presenter's, like the panel, and it is the one thing the phone cannot do
 * for itself.
 */
type Jump = { label: string; when: string; href: string };

function emreJumps(): Jump[] {
  const d = momentDates();
  return [
    { label: "The nudge", when: `${dayMonth(d.nudge)}, 08:30`, href: "/moment/nudge" },
    { label: "Dad's phone", when: `${dayMonth(d.travel)}, 12:00`, href: "/moment/dad" },
    { label: "Cancelled", when: `${dayMonth(d.travel)}, 17:02`, href: "/moment/cancelled" },
    { label: "Next year", when: dayMonth(d.nextYear), href: "/moment/next-year" },
  ];
}

function willJumps(out: string, back: string): Jump[] {
  return [
    { label: "Waiting window", when: inviteWhen(out).waitingShort, href: "/squad/waiting" },
    { label: "Tom stalls", when: inviteWhen(out).stallsShort, href: "/invite/tom/stalls" },
    { label: "Check-in", when: `${dayMonth(shift(out, -2))}, 05:30`, href: "/squad/check-in" },
    { label: "Cancelled", when: `${dayMonth(out)}, 04:50`, href: "/squad/cancelled" },
    { label: "Next trip", when: dayMonth(shift(back, 60)), href: "/squad/next-trip" },
  ];
}

export function TimeStrip() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, update } = useJourney();
  const emre = /^\/(emre|flights|moment)/.test(pathname);
  const draft = state.draft ?? willDraft();
  // Jamie version: later scenes are scripted, so free play has no time jumps.
  if (state.sandbox) return null;
  const jumps = emre
    ? emreJumps()
    : willJumps(draft.departDate.value, draft.returnDate.value ?? draft.departDate.value);
  return (
    <nav
      aria-label="Jump in time"
      className="flex w-[410px] flex-wrap items-center gap-1.5 px-1"
    >
      <span className="mr-1 text-[11px] font-bold tracking-[0.08em] text-white/40 uppercase">
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
              on ? "bg-white/15 text-white" : "bg-white/[0.06] text-white/60 hover:text-white"
            }`}
          >
            <span className="tabular text-white/40">{j.when}</span>
            {j.label}
          </button>
        );
      })}
    </nav>
  );
}
