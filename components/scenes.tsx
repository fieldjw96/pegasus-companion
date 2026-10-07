"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAgents, type Run } from "./agent-provider";
import { asideFor } from "./companion-phone";
import { useJourney } from "./journey-provider";
import { ACTS, sceneFor } from "@/lib/agent/scenes";
import type { AgentName, Step, StepKind } from "@/lib/agent/trace";
import { commercialFor, outcomesOf, type Outcome } from "@/lib/agent/commercial";
import { emreComparison, willComparison, type Basket } from "@/lib/agent/basket";
import { formatFare } from "@/lib/journey/flights";
import { buildDraft } from "@/lib/assistant/understand";
import { WILL, WILL_PROMPT } from "@/lib/demo/personas";

/**
 * The presenter's panel beside the phone, with two views.
 *
 * Agent, the default, is the companion thinking, live. When a screen needs the
 * agents' work, their steps arrive here one at a time, the way a model's
 * reasoning streams, and the phone shows its result only when the last step
 * has landed. What each agent read, what it concluded, what it did, and what
 * it decided not to do, with the figures it used. Every step is computed from
 * the same calls the screen makes, so the panel cannot say one thing while
 * the phone shows another.
 *
 * Scenes lists every beat of both journeys and jumps straight to it. Beats on
 * someone else's phone open the second phone rather than replacing the main
 * one.
 *
 * Both are for the person giving the demo, not the passenger, which is why
 * the panel sits outside the device.
 */
type View = "agent" | "scenes" | "basket";

export function Scenes() {
  const pathname = usePathname();
  const router = useRouter();
  const { reset, update } = useJourney();
  const agents = useAgents();
  const [view, setView] = useState<View>("agent");
  const pending = useRef<1 | 2 | null>(null);
  const restart = useCallback(
    (journey: 1 | 2) => {
      reset();
      update({ persona: journey === 2 ? "emre" : "will" });
      agents.reset();
    },
    [reset, update, agents],
  );
  useEffect(() => {
    if (pending.current === null) return;
    restart(pending.current);
    pending.current = null;
  }, [pathname, restart]);
  return (
    <aside
      aria-label="Presenter panel"
      className="no-scrollbar w-full max-w-[410px] shrink-0 text-white/80 lg:max-h-[940px] lg:w-[340px] lg:overflow-y-auto lg:pt-2"
    >
      {/* Pinned while the list scrolls; the background is the stage's, so nothing shows through. */}
      <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between bg-[#0f1420] px-1 py-1">
        <div
          role="tablist"
          aria-label="Panel view"
          className="flex rounded-full bg-white/10 p-0.5 text-[12px] font-bold"
        >
          {(["agent", "scenes", "basket"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1 transition-colors ${
                view === v ? "bg-white text-pg-navy" : "text-white/60 hover:text-white"
              }`}
            >
              {v === "agent" ? "Agent" : v === "scenes" ? "Scenes" : "Basket"}
            </button>
          ))}
        </div>
        <JourneyToggle
          pathname={pathname}
          onPick={(journey) => {
            // Picking a journey starts it from the top: the phones, the
            // passengers' state and the agents' history all go back to zero.
            // The reset waits for the start screen to be the one mounted, or
            // the screen being left would run once more into the history.
            const target = journey === 2 ? "/moment/nudge" : "/";
            if (pathname === target) restart(journey);
            else {
              pending.current = journey;
              router.push(target);
            }
          }}
        />
      </div>
      {view === "agent" ? (
        <AgentView />
      ) : view === "scenes" ? (
        <SceneList pathname={pathname} />
      ) : (
        <BasketView journey={journeyOf(pathname)} />
      )}
      <p className="mt-6 text-[11px] leading-4 text-white/35">
        Jamie version, for comparison with Jack&rsquo;s build. Team Winging It, for the Pegasus ×
        Berkeley Haas AI Travel Companion Hackathon. A concept, not a Pegasus product. Nothing
        here books anything.
      </p>
    </aside>
  );
}

/** Which journey a route belongs to: Emre's start with his screens, the rest are Will's. */
export function journeyOf(pathname: string): 1 | 2 {
  return /^\/(emre|flights|moment)/.test(pathname) ? 2 : 1;
}

/** Journey 1 or 2. Picking one, even the current one, starts it again. */
function JourneyToggle({
  pathname,
  onPick,
}: {
  pathname: string;
  onPick: (journey: 1 | 2) => void;
}) {
  const current = journeyOf(pathname);
  return (
    <div
      role="group"
      aria-label="Journey"
      className="flex rounded-full bg-white/10 p-0.5 text-[12px] font-bold"
    >
      {([1, 2] as const).map((j) => (
        <button
          key={j}
          type="button"
          aria-pressed={current === j}
          title={
            j === 1
              ? "The lads go to Cappadocia. Starts again."
              : "Home for Mum's birthday. Starts again."
          }
          onClick={() => onPick(j)}
          className={`rounded-full px-3 py-1 transition-colors ${
            current === j ? "bg-pg-yellow text-pg-navy" : "text-white/60 hover:text-white"
          }`}
        >
          {j === 1 ? "Will" : "Emre"}
        </button>
      ))}
    </div>
  );
}

function SceneList({ pathname }: { pathname: string }) {
  const router = useRouter();
  const { state, update } = useJourney();
  const current = sceneFor(pathname)?.scene.href ?? pathname;
  return (
    <div role="tabpanel" aria-label="Scenes">
      {ACTS.map((act) => (
        <section key={act.part} className="mt-5">
          <h3 className="text-[13px] font-bold text-white">{act.part}</h3>
          <p className="mt-0.5 text-[12px] leading-4 text-white/50">{act.journey}</p>
          <ol className="mt-2 flex flex-col gap-0.5">
            {act.scenes.map((scene, i) => {
              const aside = asideFor(scene.href);
              const on =
                aside === null ? current === scene.href : state.aside?.route === scene.href;
              const cls = `flex w-full items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] leading-[18px] ${
                on ? "bg-white/10 text-white" : "hover:bg-white/5"
              }`;
              const body = (
                <>
                  <span className="tabular w-4 shrink-0 text-[11px] text-white/40">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{scene.title}</span>
                    {scene.note !== undefined && (
                      <span className="block text-[11px] text-white/45">{scene.note}</span>
                    )}
                  </span>
                  {scene.agent !== undefined && <AgentChip agent={scene.agent} />}
                </>
              );
              return (
                <li key={scene.href}>
                  {aside === null ? (
                    <Link
                      href={scene.href}
                      aria-current={on ? "page" : undefined}
                      className={cls}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      aria-current={on ? "true" : undefined}
                      onClick={() => update({ aside })}
                      className={cls}
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          {act.scenes[0]?.href === "/" && (
            <button
              type="button"
              onClick={() => {
                update({
                  prompt: WILL_PROMPT,
                  draft: buildDraft(WILL_PROMPT, WILL),
                  booked: false,
                  thumbs: null,
                });
                router.push("/");
              }}
              className="mt-1.5 ml-2.5 text-[12px] font-semibold text-pg-yellow hover:underline"
            >
              Say the sentence for Will ↗
            </button>
          )}
        </section>
      ))}
    </div>
  );
}

/*
 * One colour per agent, as text, so the four read as four voices rather than
 * four buttons. Yellow is the brand's primary, orange its accent, and the
 * other two are chosen to sit beside them on navy without competing.
 */
const AGENT_COLOUR: Record<AgentName, string> = {
  Trip: "text-pg-yellow",
  Offer: "text-pg-orange",
  Group: "text-sky-300",
  Moments: "text-emerald-300",
};

function AgentChip({ agent }: { agent: AgentName }) {
  return (
    <span
      className={`shrink-0 rounded-full bg-white/10 px-1.5 text-[10px] font-bold ${AGENT_COLOUR[agent]}`}
    >
      {agent}
    </span>
  );
}

const KIND_LABEL: Record<StepKind, string> = {
  read: "Read",
  think: "Thought",
  act: "Did",
  quiet: "Held back",
  wait: "Waiting",
};

/** The glyph on the rail: a dot for a step taken, a ring for one held back or waiting. */
function Rail({ kind, last }: { kind: StepKind; last: boolean }) {
  const open = kind === "quiet" || kind === "wait";
  return (
    <span className="relative flex w-4 shrink-0 flex-col items-center">
      <span
        aria-hidden
        className={`mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full ${
          open ? "border-2 border-white/40" : kind === "act" ? "bg-pg-yellow" : "bg-white/60"
        }`}
      />
      {!last && <span aria-hidden className="mt-1 w-px flex-1 bg-white/15" />}
    </span>
  );
}

function AgentView() {
  const { active, history, finish } = useAgents();
  // The second phone's run on top: when it is out, the story is on it.
  const shown = [...active].sort((a, b) =>
    a.lane === b.lane ? b.id - a.id : a.lane === "aside" ? -1 : 1,
  );
  return (
    <div role="tabpanel" aria-label="Agent" className="mt-5">
      {shown.length === 0 ? (
        <p className="text-[12px] leading-4 text-white/50">Nothing running yet.</p>
      ) : (
        <ol className="flex flex-col gap-6">
          {shown.map((run) => (
            <li key={run.id}>
              <RunView run={run} onFinish={finish} />
            </li>
          ))}
        </ol>
      )}
      {history.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-[11px] font-bold tracking-[0.08em] text-white/40 uppercase">
            Earlier · {history.length}
          </summary>
          <ol className="mt-3 flex flex-col gap-5">
            {history.map((run) => (
              <li key={run.id}>
                <RunView run={run} compact />
              </li>
            ))}
          </ol>
        </details>
      )}
      <p className="mt-4 text-[11px] leading-4 text-white/35">
        Every figure above is computed by the same code that drew the screen. A held-back step
        is the companion deciding not to speak.
      </p>
    </div>
  );
}

function RunView({
  run,
  compact = false,
  onFinish,
}: {
  run: Run;
  compact?: boolean;
  onFinish?: () => void;
}) {
  const shown = run.steps.slice(0, run.revealed);
  return (
    <section aria-label={run.title} aria-busy={!run.done}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className={`text-[13px] font-bold ${compact ? "text-white/70" : "text-white"}`}>
          {run.title}
        </h3>
        {!run.done && onFinish !== undefined && (
          <button
            type="button"
            onClick={onFinish}
            className="shrink-0 text-[11px] font-semibold text-white/40 hover:text-white"
          >
            Skip ahead
          </button>
        )}
      </div>
      <p className="mt-0.5 text-[12px] leading-4 text-white/50">
        {run.who} · {run.when}
      </p>
      <ol className="mt-4 flex flex-col">
        {shown.map((s, i) => (
          <StepRow
            key={`${run.id}-${i}`}
            step={s}
            repeat={i > 0 && sameValue(shown[i - 1], s)}
            last={run.done && i === shown.length - 1}
            compact={compact}
          />
        ))}
        {run.done && !compact && <Earned steps={shown} />}
        {!run.done && (
          <li className="flex gap-2.5 pb-4" aria-label="Thinking">
            <span className="relative flex w-4 shrink-0 flex-col items-center">
              <span
                aria-hidden
                className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full bg-pg-yellow"
                style={{ animation: "seatpulse 1.1s ease-in-out infinite" }}
              />
            </span>
            <span className="flex items-center gap-1 pt-0.5 text-[12px] text-white/50">
              <Dots />
            </span>
          </li>
        )}
      </ol>
    </section>
  );
}

/** Three dots, the way a message app shows someone typing. */
function Dots() {
  return (
    <span aria-hidden className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-white/50"
          style={{
            animation: "bob 0.7s ease-in-out infinite alternate",
            animationDelay: `${i * 160}ms`,
          }}
        />
      ))}
    </span>
  );
}

/** Jamie version: the same commercial line twice in a row says nothing new. */
function sameValue(a: Step | undefined, b: Step): boolean {
  if (a === undefined) return false;
  return commercialFor(a)?.gain === commercialFor(b)?.gain;
}

function StepRow({
  step,
  last,
  compact,
  repeat = false,
}: {
  step: Step;
  last: boolean;
  compact: boolean;
  repeat?: boolean;
}) {
  const muted = step.kind === "quiet" || step.kind === "wait";
  return (
    <li className="rise flex gap-2.5 pb-4">
      <Rail kind={step.kind} last={last} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <AgentChip agent={step.agent} />
          <span className="text-[10px] font-bold tracking-[0.08em] text-white/40 uppercase">
            {KIND_LABEL[step.kind]}
          </span>
        </div>
        <p
          className={`mt-1 text-[13px] leading-[18px] font-semibold ${
            muted || compact ? "text-white/70" : "text-white"
          }`}
        >
          {step.did}
        </p>
        {!compact && (
          <p
            className="mt-0.5 text-[12px] leading-[17px] text-white/60"
            style={{ textWrap: "pretty" }}
          >
            {step.thought}
          </p>
        )}
        {!compact && !repeat && <CommercialLine step={step} />}
        {!compact && step.facts !== undefined && (
          <ul className="mt-1.5 flex flex-wrap gap-1">
            {step.facts.map((f) => (
              <li
                key={f}
                className="tabular rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[11px] leading-4 text-white/70"
              >
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

/*
 * Jamie version: the commercial reason for every step, and a summary of what
 * the beat did for Pegasus. Colour by outcome so the five read at a glance.
 */
const OUTCOME_STYLE: Record<Outcome, { icon: string; cls: string }> = {
  "More passengers": { icon: "＋", cls: "bg-sky-400/15 text-sky-200" },
  "More per passenger": { icon: "€", cls: "bg-pg-yellow/15 text-pg-yellow" },
  "New direct customer": { icon: "↓", cls: "bg-emerald-400/15 text-emerald-200" },
  "Repeat booking": { icon: "↻", cls: "bg-violet-400/15 text-violet-200" },
  "Protects the booking": { icon: "◆", cls: "bg-orange-400/15 text-orange-200" },
  "Protects conversion": { icon: "◇", cls: "bg-white/10 text-white/75" },
};

function OutcomeChip({ outcome }: { outcome: Outcome }) {
  const style = OUTCOME_STYLE[outcome];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-bold ${style.cls}`}
    >
      <span aria-hidden>{style.icon}</span>
      {outcome}
    </span>
  );
}

function CommercialLine({ step }: { step: Step }) {
  const c = commercialFor(step);
  if (c === null) return null;
  return (
    <div className="mt-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5">
      <OutcomeChip outcome={c.outcome} />
      <p className="mt-1 text-[11.5px] leading-4 text-white/75">{c.gain}</p>
    </div>
  );
}

function Earned({ steps }: { steps: Step[] }) {
  const outcomes = outcomesOf(steps);
  if (outcomes.length === 0) return null;
  return (
    <li className="mt-1 rounded-lg bg-pg-yellow/10 px-3 py-2.5">
      <p className="text-[10px] font-bold tracking-[0.08em] text-pg-yellow uppercase">
        What this beat does for Pegasus
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {outcomes.map((o) => (
          <OutcomeChip key={o} outcome={o} />
        ))}
      </div>
    </li>
  );
}

/*
 * Jamie version: the third view. The same trip, booked the way most people
 * book it today, against what the companion sold. Figures from the pricing
 * code the tickets use.
 */
function BasketView({ journey }: { journey: 1 | 2 }) {
  const c = journey === 1 ? willComparison() : emreComparison();
  const uplift = c.companion.total - c.today.total;
  const perPaxToday = c.today.ancillary / Math.max(1, c.today.passengers);
  const perPaxCompanion = c.companion.ancillary / Math.max(1, c.companion.passengers);
  return (
    <div role="tabpanel" aria-label="Basket" className="mt-5 flex flex-col gap-4">
      <div>
        <h3 className="text-[13px] font-bold text-white">{c.title}</h3>
        <p className="mt-0.5 text-[12px] leading-4 text-white/50">
          Today: booked the way most people book it (cheapest fare, no seat, alone). With the
          companion: what the demo&rsquo;s screens sold. GBP.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <BasketCard label="Today's app" basket={c.today} muted />
        <BasketCard label="With the companion" basket={c.companion} />
      </div>
      <div className="rounded-lg bg-pg-yellow/10 px-3 py-2.5">
        <p className="text-[10px] font-bold tracking-[0.08em] text-pg-yellow uppercase">
          The difference
        </p>
        <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[12px] leading-4">
          <dt className="text-white/70">Basket</dt>
          <dd className="tabular text-right font-bold text-white">
            +{formatFare(uplift)} (
            {(c.companion.total / Math.max(1, c.today.total)).toFixed(1)}×)
          </dd>
          <dt className="text-white/70">Passengers</dt>
          <dd className="tabular text-right font-bold text-white">
            {c.today.passengers} → {c.companion.passengers}
          </dd>
          <dt className="text-white/70">Ancillary per passenger</dt>
          <dd className="tabular text-right font-bold text-white">
            {formatFare(perPaxToday)} → {formatFare(perPaxCompanion)}
          </dd>
        </dl>
      </div>
      <table className="w-full text-[11.5px] leading-4">
        <thead>
          <tr className="text-left text-white/40">
            <th className="pb-1 font-semibold"></th>
            <th className="pb-1 font-semibold">Today</th>
            <th className="pb-1 font-semibold text-pg-yellow">Companion</th>
          </tr>
        </thead>
        <tbody>
          {c.kpis.map((k) => (
            <tr key={k.label} className="border-t border-white/10 align-top">
              <td className="py-1.5 pr-2 text-white/70">{k.label}</td>
              <td className="py-1.5 pr-2 text-white/50">{k.today}</td>
              <td className="py-1.5 font-semibold text-white">{k.companion}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] leading-4 text-white/40">
        Scale: across Pegasus, every €1 more ancillary per passenger is worth about €43m a
        year, and 1% more passengers about €34m.
      </p>
    </div>
  );
}

function BasketCard({
  label,
  basket,
  muted = false,
}: {
  label: string;
  basket: Basket;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg px-2.5 py-2.5 ${muted ? "bg-white/[0.04]" : "bg-white/[0.09] ring-1 ring-pg-yellow/40"}`}
    >
      <p
        className={`text-[10px] font-bold tracking-[0.08em] uppercase ${muted ? "text-white/45" : "text-pg-yellow"}`}
      >
        {label}
      </p>
      <ul className="flex flex-col gap-1.5">
        {basket.rows.map((r) => (
          <li key={r.who} className="text-[11.5px] leading-4">
            <span className="flex justify-between gap-1 font-semibold text-white">
              <span>{r.who}</span>
              <span className="tabular">{formatFare(r.fare + r.ancillary)}</span>
            </span>
            <span className="block text-[10.5px] text-white/50">{r.note}</span>
            {r.ancillary > 0 && (
              <span className="tabular block text-[10.5px] text-pg-yellow/90">
                incl. {formatFare(r.ancillary)} extras
              </span>
            )}
          </li>
        ))}
        {muted && basket.passengers === 1 && (
          <li className="text-[10.5px] leading-4 text-white/45">
            Friends book on their own, if at all. About 40% of Pegasus sales come through OTAs
            and agents.
          </li>
        )}
      </ul>
      <p className="tabular mt-auto flex justify-between border-t border-white/10 pt-1.5 text-[12px] font-bold text-white">
        <span>{basket.passengers} pax</span>
        <span>{formatFare(basket.total)}</span>
      </p>
    </div>
  );
}
