"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAgents } from "./agent-provider";
import { useJourney } from "./journey-provider";
import { ASSUMPTIONS, impactOf, type Figures } from "@/lib/metrics/impact";
import { formatFare } from "@/lib/journey/flights";

/**
 * The commercial column: what the companion is worth, as the demo moves.
 *
 * Four figures, each against today's app, each computed from the same drafts
 * the screens print. The bars grow as bookings land, add-ons are taken and
 * new people join. The model of "today" is written at the foot, because a
 * comparison nobody can check reads as a boast.
 */
type Tile = { key: keyof Figures; label: string; money: boolean };

const TILES: Tile[] = [
  { key: "revenue", label: "Revenue", money: true },
  { key: "addOns", label: "Add-ons", money: true },
  { key: "bookings", label: "Bookings", money: false },
  { key: "newUsers", label: "New users", money: false },
];

/** How long new figures wait for the next screen's run to start, in ms. */
const HOLD = 700;

/** Eases a number towards its target over a few hundred milliseconds. */
function useCountUp(target: number): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    const t0 = performance.now();
    const duration = 650;
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - p) * (1 - p);
      setShown(start + (target - start) * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return shown;
}

function Figure({ value, money }: { value: number; money: boolean }) {
  const shown = useCountUp(value);
  return (
    <span className="display tabular text-[26px] leading-7 font-extrabold text-white">
      {money ? formatFare(shown) : Math.round(shown)}
    </span>
  );
}

export function Impact() {
  const { state, reset } = useJourney();
  const agents = useAgents();
  const router = useRouter();
  /*
   * The column moves when the screen does, not when the tap lands. A booking
   * is in the state the moment Pay is tapped, but the phone shows "Booking…"
   * until the agents' run is done; the figures wait for the same moment. The
   * next screen starts its run a beat after the tap, so new figures are held
   * for that beat too: a run that starts inside it keeps the hold. Only
   * growth waits: a reset or a journey switch drops to zero at once, whatever
   * the first screen's run is doing.
   */
  const live = useMemo(() => impactOf(state), [state]);
  const settled = agents.active.every((run) => run.done);
  const [held, setHeld] = useState(live);
  useEffect(() => {
    if (!settled) return;
    const timer = setTimeout(() => setHeld(live), HOLD);
    return () => clearTimeout(timer);
  }, [settled, live]);
  // A drop is shown at once; state adjusted during render, as React allows.
  const dropped =
    live.companion.revenue + live.companion.newUsers <
    held.companion.revenue + held.companion.newUsers;
  if (dropped) setHeld(live);
  const { companion, today } = dropped ? live : held;
  return (
    <aside
      aria-label="Impact"
      className="w-full max-w-[410px] shrink-0 text-white/80 lg:w-[220px] lg:pt-2"
    >
      <div className="flex items-center justify-between py-1">
        <h2 className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase">
          Impact
        </h2>
        <button
          type="button"
          onClick={() => {
            // Everything back to zero: the phones, the passengers and the agents.
            reset();
            agents.reset();
            router.push("/");
          }}
          className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/70 hover:bg-white/15 hover:text-white"
        >
          Reset demo
        </button>
      </div>
      <div className="flex items-center justify-end py-1">
        <span className="flex items-center gap-3 text-[10px] font-semibold text-white/50">
          <span className="flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-sm bg-pg-yellow" />
            Companion
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden className="h-2 w-2 rounded-sm bg-white/30" />
            Today
          </span>
        </span>
      </div>
      <ol className="mt-3 flex flex-col gap-3">
        {TILES.map((tile) => {
          const a = companion[tile.key];
          const b = today[tile.key];
          const max = Math.max(a, b, tile.money ? 100 : 1);
          const delta = a - b;
          return (
            <li key={tile.key} className="rounded-2xl bg-white/[0.06] px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-semibold text-white/60">{tile.label}</span>
                {delta > 0 && (
                  <span className="tabular text-[11px] font-bold text-pg-yellow">
                    +{tile.money ? formatFare(delta) : delta}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <Figure value={a} money={tile.money} />
                {tile.money && (
                  <span className="text-[11px] font-bold text-white/60">GBP</span>
                )}
              </div>
              <div
                className="mt-2 flex flex-col gap-1"
                role="img"
                aria-label={`${tile.label}: companion ${a}, today ${b}`}
              >
                <Bar value={a} max={max} tone="companion" />
                <Bar value={b} max={max} tone="today" />
              </div>
              <div className="mt-1 text-[11px] text-white/45">
                Today: <span className="tabular">{tile.money ? formatFare(b) : b}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <details className="mt-4">
        <summary className="cursor-pointer text-[11px] font-bold tracking-[0.08em] text-white/40 uppercase">
          How today is counted
        </summary>
        <ul className="mt-2 flex flex-col gap-1.5 text-[11px] leading-4 text-white/45">
          {ASSUMPTIONS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </details>
    </aside>
  );
}

/** One thin bar, anchored at the left, that grows when its value does. */
function Bar({
  value,
  max,
  tone,
}: {
  value: number;
  max: number;
  tone: "companion" | "today";
}) {
  const width = max === 0 ? 0 : Math.max(value > 0 ? 3 : 0, (value / max) * 100);
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <span
        className={`block h-full rounded-full transition-[width] duration-700 ease-out ${
          tone === "companion" ? "bg-pg-yellow" : "bg-white/30"
        }`}
        style={{ width: `${width}%` }}
      />
    </span>
  );
}
