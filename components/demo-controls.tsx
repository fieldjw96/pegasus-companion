"use client";

import { useCompanion } from "./companion/companion-provider";

/**
 * The demo panel. Sits beside the phone, never inside it.
 *
 * The companion's whole value is that it does work while the passenger is away,
 * and a live demo has no three days to spare. These buttons stage that honestly:
 * the time travel is fake, the judgement that follows is not.
 */
export function DemoControls() {
  const { state, judgement, source, elapsedMs, reason, simulateReturn, reset, intervention } =
    useCompanion();

  return (
    <aside className="w-full max-w-sm rounded-2xl bg-white/5 p-5 text-white ring-1 ring-white/10">
      <h2 className="text-xs font-bold tracking-widest text-pg-yellow uppercase">
        Demo controls
      </h2>
      <p className="mt-2 text-[12px] leading-snug text-white/60">
        Stage the gap between visits. The companion is deciding for real; only the clock is
        pretend.
      </p>

      <div className="mt-4 space-y-2">
        <button
          onClick={() =>
            simulateReturn(
              "The 15th is now 12 EUR below the 14th, which reverses your comparison.",
              48,
            )
          }
          className="w-full rounded-xl bg-pg-orange px-3 py-2.5 text-left text-[13px] font-semibold"
        >
          Two days later — the fare moved
          <span className="block text-[11px] font-normal opacity-80">
            The one that should earn an interruption
          </span>
        </button>

        <button
          onClick={() => simulateReturn("Nothing has changed on either of your dates.", 48)}
          className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-left text-[13px] font-semibold"
        >
          Two days later — nothing changed
          <span className="block text-[11px] font-normal opacity-60">
            Should stay silent. This is the slide that wins pillar 4
          </span>
        </button>

        <button
          onClick={reset}
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-[12px] font-medium text-white/70"
        >
          Reset the deliberation
        </button>
      </div>

      <dl className="mt-5 space-y-1 border-t border-white/10 pt-4 text-[11px]">
        <Row k="step" v={state.step} />
        <Row k="visits" v={String(state.visits)} />
        <Row k="interruptions used" v={`${state.interruptionsSoFar} of 3`} />
        <Row k="findings" v={String(state.findings.length)} />
        <Row
          k="speaking now"
          v={intervention === null ? "no — staying quiet" : intervention.channel}
        />
        <Row k="decided by" v={source === null ? "—" : `${source} (${elapsedMs ?? 0}ms)`} />
      </dl>

      {judgement !== null && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
            Typed judgement
          </p>
          <dl className="mt-2 space-y-1 text-[11px]">
            <Row k="isFamilyTrip" v={judgement.isFamilyTrip.toFixed(2)} />
            <Row k="needsCheckedBag" v={judgement.needsCheckedBag.toFixed(2)} />
            <Row k="upgradePropensity" v={judgement.upgradePropensity.toFixed(1)} />
            <Row k="openQuestion" v={judgement.openQuestion} />
            <Row k="worthInterrupting" v={judgement.worthInterrupting.toFixed(2)} />
          </dl>
        </div>
      )}

      {source === "stub" && (
        <div className="mt-4 rounded-lg bg-pg-yellow/10 p-2 text-[11px] leading-snug text-pg-yellow">
          <p className="font-semibold">Deciding with the deterministic stub.</p>
          {/* The reason matters: a missing key and a broken call used to look
              identical from here, which hid a wrong endpoint URL for an evening. */}
          <p className="mt-1 opacity-90">{reason ?? "no reason reported"}</p>
          {reason === "JEV_API_KEY is not set" && (
            <p className="mt-1 opacity-80">
              Set <code>JEV_API_KEY</code> and redeploy to decide with Jev instead. The
              judgements get better; the architecture does not change.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-white/40">{k}</dt>
      <dd className="font-mono text-white/90">{v}</dd>
    </div>
  );
}
