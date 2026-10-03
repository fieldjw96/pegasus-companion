"use client";

import Link from "next/link";
import { useCompanion } from "./companion/companion-provider";

/**
 * The demo panel.
 *
 * Rebuilt around the question it should have been answering all along: *does
 * the Companion speak here, and was it right to?*
 *
 * An earlier version offered only "come back two days later" buttons, which
 * staged the across-days idea. The headline is now the baggage comparison, which
 * happens inside one session at package selection, so the scenarios lead with
 * that and every button says what to expect before it is pressed. A control that
 * needs explaining out loud is a control that gets fumbled on stage.
 */

type Scenario = {
  title: string;
  setup: string;
  expect: string;
  speaks: boolean;
  href: string;
};

const DEPART = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 17);
  return d.toISOString().slice(0, 10);
})();

const BASE = `origin=STN&destination=SAW&departDate=${DEPART}&infants=0`;

const SCENARIOS: Scenario[] = [
  {
    title: "1 · Picks LIGHT, needs a bag",
    setup: "Two adults and a child, at package selection, LIGHT chosen.",
    expect: "SAVER is 30.00 for 25 kg; the same cover later costs up to 59.00.",
    speaks: true,
    href: `/fare?${BASE}&adults=2&children=1&package=light`,
  },
  {
    title: "2 · Picks LIGHT, hand luggage only",
    setup: "One adult, LIGHT chosen, nothing suggesting a hold bag.",
    expect: "The price gap is a fact regardless of who is travelling.",
    speaks: true,
    href: `/fare?${BASE}&adults=1&children=0&package=light`,
  },
  {
    title: "3 · Picks SAVER straight away",
    setup: "Same traveller, but SAVER chosen at package selection.",
    expect: "Nothing to warn about. They already took the best route.",
    speaks: false,
    href: `/fare?${BASE}&adults=2&children=1&package=saver`,
  },
  {
    title: "4 · Reaches baggage having taken LIGHT",
    setup: "Further down the funnel, where the a la carte prices appear.",
    expect: "Cabin 17.00 + 20 kg 41.00 against SAVER's 30.00 for 25 kg.",
    speaks: true,
    href: `/baggage?${BASE}&adults=2&children=1&package=light`,
  },
];

export function DemoControls() {
  const { state, judgement, source, elapsedMs, reason, simulateReturn, reset, intervention } =
    useCompanion();

  return (
    <aside className="w-full max-w-sm rounded-2xl bg-white/5 p-5 text-white ring-1 ring-white/10">
      <h2 className="text-xs font-bold tracking-widest text-pg-yellow uppercase">
        Demo controls
      </h2>
      <p className="mt-2 text-[12px] leading-snug text-white/60">
        Not part of the app. These set up a situation in the phone beside you, then you watch
        the Companion decide whether to speak. Nothing is scripted — the judgement runs for
        real each time.
      </p>

      <h3 className="mt-5 text-[11px] font-bold tracking-widest text-white/40 uppercase">
        Scenarios
      </h3>
      <div className="mt-2 space-y-2">
        {SCENARIOS.map((scenario) => (
          <Link
            key={scenario.title}
            href={scenario.href}
            className="block rounded-xl bg-white/10 p-3 hover:bg-white/15"
          >
            <span className="block text-[13px] font-semibold">{scenario.title}</span>
            <span className="mt-1 block text-[11px] leading-snug text-white/55">
              {scenario.setup}
            </span>
            <span
              className={`mt-1.5 block text-[11px] leading-snug font-medium ${
                scenario.speaks ? "text-pg-yellow" : "text-emerald-300"
              }`}
            >
              {scenario.speaks ? "Expect it to speak — " : "Expect silence — "}
              <span className="font-normal">{scenario.expect}</span>
            </span>
          </Link>
        ))}
      </div>

      <h3 className="mt-5 text-[11px] font-bold tracking-widest text-white/40 uppercase">
        Across days
      </h3>
      <p className="mt-1 text-[11px] leading-snug text-white/50">
        The second beat: it works while nobody is looking. Press one, then look at the phone.
      </p>
      <div className="mt-2 space-y-2">
        <button
          onClick={() =>
            simulateReturn(
              "The 15th is now 12.00 GBP below the 14th, which reverses your comparison.",
              48,
            )
          }
          className="w-full rounded-xl bg-white/10 p-3 text-left"
        >
          <span className="block text-[13px] font-semibold">
            Two days later, the fare moved
          </span>
          <span className="mt-1 block text-[11px] text-pg-yellow">
            Expect a push — a fact changed that reverses the choice they were weighing.
          </span>
        </button>
        <button
          onClick={() => simulateReturn("Nothing has changed on either of your dates.", 48)}
          className="w-full rounded-xl bg-white/10 p-3 text-left"
        >
          <span className="block text-[13px] font-semibold">
            Two days later, nothing changed
          </span>
          <span className="mt-1 block text-[11px] text-emerald-300">
            Expect silence. The harder half, and the one that answers &ldquo;beyond a
            chatbot&rdquo;.
          </span>
        </button>
        <button
          onClick={reset}
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-[12px] font-medium text-white/70"
        >
          Reset the deliberation
        </button>
      </div>

      <h3 className="mt-5 text-[11px] font-bold tracking-widest text-white/40 uppercase">
        What it decided
      </h3>
      <dl className="mt-2 space-y-1 text-[11px]">
        <Row k="step" v={state.step} />
        <Row k="interruptions used" v={`${state.interruptionsSoFar} of 3`} />
        <Row k="findings on hand" v={String(state.findings.length)} />
        <Row
          k="right now"
          v={intervention === null ? "staying quiet" : `speaking via ${intervention.channel}`}
          highlight={intervention !== null}
        />
        <Row k="decided by" v={source === null ? "—" : `${source} (${elapsedMs ?? 0}ms)`} />
      </dl>

      {judgement !== null && (
        <dl className="mt-3 space-y-1 border-t border-white/10 pt-3 text-[11px]">
          <Row k="isFamilyTrip" v={judgement.isFamilyTrip.toFixed(2)} />
          <Row k="needsCheckedBag" v={judgement.needsCheckedBag.toFixed(2)} />
          <Row k="upgradePropensity" v={judgement.upgradePropensity.toFixed(1)} />
          <Row k="openQuestion" v={judgement.openQuestion} />
          <Row k="worthInterrupting" v={judgement.worthInterrupting.toFixed(2)} />
        </dl>
      )}

      {source === "stub" && (
        <div className="mt-4 rounded-lg bg-pg-yellow/10 p-2 text-[11px] leading-snug text-pg-yellow">
          <p className="font-semibold">Deciding with the deterministic stub.</p>
          {/* The reason matters: a missing key and a broken call used to look
              identical from here, which hid a wrong endpoint URL for an evening. */}
          <p className="mt-1 opacity-90">{reason ?? "no reason reported"}</p>
        </div>
      )}
    </aside>
  );
}

function Row({ k, v, highlight = false }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-white/40">{k}</dt>
      <dd className={`font-mono ${highlight ? "text-pg-yellow" : "text-white/90"}`}>{v}</dd>
    </div>
  );
}
