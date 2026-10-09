"use client";

import { useState } from "react";
import { useNav } from "@/components/phone-nav";
import { useAgentRun } from "@/components/agent-provider";
import { useJourney } from "@/components/journey-provider";
import { Avatar } from "@/components/ui/avatar";
import { LockCard, LockScreen } from "@/components/ui/lock-screen";
import {
  AppIcon,
  ChevronDown,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/primitives";
import { Speech } from "@/components/ui/speech";
import { traceFor } from "@/lib/agent/trace";
import { nudgeDraft, tripNudge } from "@/lib/group/trip-nudge";
import { formatFare } from "@/lib/journey/flights";
import { TRIP_NUDGE } from "@/lib/journey/script";
import { JESS_PROMPT, dayMonth } from "@/lib/demo/personas";

/**
 * The demo's first screen. Jess has said nothing; the companion speaks first,
 * once, on the lock screen, with "Why I spoke" a tap away. Yes builds the
 * week she would have asked for and lands on the ticket. Not this time keeps
 * it quiet until the next free week it finds; don't suggest trips keeps it
 * quiet for good. Either way it does not ask twice.
 */
export function JessNudgeScreen() {
  const router = useNav();
  const { state, update } = useJourney();
  const nudge = tripNudge(state.nudge);
  const [expanded, setExpanded] = useState(false);
  const silent = nudge.verdict === "silent";
  const ready = useAgentRun(`nudge:${state.nudge.declined}:${state.nudge.never}`, () =>
    traceFor("/nudge", state),
  );

  if (silent) {
    return (
      <LockScreen date={TRIP_NUDGE.date} time={TRIP_NUDGE.time}>
        {ready && (
          <p className="px-3 text-center text-[13px] leading-[18px] text-white/60">
            {state.nudge.never
              ? "Nothing. Jess said don’t suggest trips, and it holds."
              : "Nothing. Jess said not this time, and it holds until the next free week."}
          </p>
        )}
      </LockScreen>
    );
  }

  return (
    <LockScreen
      date={TRIP_NUDGE.date}
      time={TRIP_NUDGE.time}
      dim={expanded}
      bottom={expanded ? 34 : 116}
    >
      {ready && (
        <LockCard label={expanded ? "Pegasus notification, expanded" : "Pegasus notification"}>
          <div className="flex items-center gap-2">
            <AppIcon />
            <span className="text-[12px] leading-4 font-extrabold tracking-[0.06em]">
              PEGASUS
            </span>
            <span className="ml-auto text-[12px] leading-4 text-pg-ink">now</span>
          </div>
          <div className="mt-3.5 flex items-center gap-3">
            <Avatar size={52} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[16px] leading-[22px] font-extrabold">
                {nudge.headline}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="flex items-baseline gap-1.5">
                  <span className="display text-[24px] leading-7 font-extrabold">
                    {formatFare(nudge.priceEach)}
                  </span>
                  <span className="text-[13px] font-bold">GBP each</span>
                </span>
                <span className="h-[22px] rounded-full bg-pg-surface px-[9px] text-[12px] leading-[22px] font-semibold whitespace-nowrap">
                  all in
                </span>
              </span>
            </div>
          </div>
          <p
            className="mt-3 text-[15px] leading-5 font-extrabold"
            style={{ textWrap: "pretty" }}
          >
            {dayMonth(nudge.week.out)} to {dayMonth(nudge.week.back)} is free for the three of
            you, and May fares are at their low.
          </p>

          {expanded && <Speech title="Why I spoke" text={nudge.why} />}

          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <PrimaryButton
              className="h-12 w-full px-0 text-[16px]"
              onClick={() => {
                // Yes: the week is built as if she had said the sentence.
                update((prev) => ({
                  prompt: JESS_PROMPT,
                  draft: nudgeDraft(),
                  edit: null,
                  origin: "nudge",
                  booked: false,
                  thumbs: null,
                  nudge: { ...prev.nudge, spoken: prev.nudge.spoken + 1 },
                }));
                router.push("/");
              }}
            >
              Yes, plan it
            </PrimaryButton>
            <SecondaryButton
              className="w-full"
              onClick={() =>
                update((prev) => ({
                  nudge: { ...prev.nudge, declined: true, spoken: prev.nudge.spoken + 1 },
                }))
              }
            >
              Not this time
            </SecondaryButton>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            {!expanded ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-expanded={false}
                className="flex items-center gap-1 text-[12px] leading-4 font-bold text-pg-ink"
              >
                Why I spoke
                <ChevronDown size={12} />
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() =>
                update((prev) => ({
                  nudge: { ...prev.nudge, never: true, spoken: prev.nudge.spoken + 1 },
                }))
              }
              className="text-[12px] leading-4 font-bold text-pg-ink"
            >
              Don&rsquo;t suggest trips
            </button>
          </div>
        </LockCard>
      )}
    </LockScreen>
  );
}
