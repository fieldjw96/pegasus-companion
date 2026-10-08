"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAgents, type Run } from "./agent-provider";
import { asideFor } from "./companion-phone";
import { useJourney } from "./journey-provider";
import { ACTS, sceneFor } from "@/lib/agent/scenes";
import type { AgentName, Step, StepKind } from "@/lib/agent/trace";
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
 * Scenes lists every beat of the journey and jumps straight to it. Beats on
 * someone else's phone open the second phone rather than replacing the main
 * one.
 *
 * Both are for the person giving the demo, not the passenger, which is why
 * the panel sits outside the device.
 */
type View = "agent" | "scenes";

export function Scenes() {
  const pathname = usePathname();
  const [view, setView] = useState<View>("agent");
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
          {(["agent", "scenes"] as const).map((v) => (
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
              {v === "agent" ? "Agent" : "Scenes"}
            </button>
          ))}
        </div>
      </div>
      {view === "agent" ? <AgentView /> : <SceneList pathname={pathname} />}
      <p className="mt-6 text-[11px] leading-4 text-white/35">
        Team Winging It, for the Pegasus × Berkeley Haas AI Travel Companion Hackathon. A
        concept, not a Pegasus product. Nothing here books anything.
      </p>
    </aside>
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
          {act.scenes.some((sc) => sc.href === "/") && (
            <button
              type="button"
              onClick={() => {
                update({
                  prompt: WILL_PROMPT,
                  draft: buildDraft(WILL_PROMPT, WILL),
                  edit: null,
                  origin: "sentence",
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
            last={run.done && i === shown.length - 1}
            compact={compact}
          />
        ))}
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

function StepRow({ step, last, compact }: { step: Step; last: boolean; compact: boolean }) {
  const muted = step.kind === "quiet" || step.kind === "wait";
  const [open, setOpen] = useState(false);
  const hasBody = !compact;
  return (
    <li className="rise flex gap-2.5 pb-3">
      <Rail kind={step.kind} last={last} />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => hasBody && setOpen((o) => !o)}
          aria-expanded={hasBody ? open : undefined}
          className={`flex w-full items-start gap-2 text-left ${hasBody ? "" : "cursor-default"}`}
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <AgentChip agent={step.agent} />
              <span className="text-[10px] font-bold tracking-[0.08em] text-white/40 uppercase">
                {KIND_LABEL[step.kind]}
              </span>
            </span>
            <span
              className={`mt-0.5 block text-[13px] leading-[18px] font-semibold ${
                muted || compact ? "text-white/70" : "text-white"
              }`}
            >
              {step.did}
            </span>
          </span>
          {hasBody && (
            <span
              aria-hidden
              className={`mt-1 shrink-0 text-[10px] text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
            >
              ▼
            </span>
          )}
        </button>
        {hasBody && open && (
          <div className="fade">
            <p
              className="mt-1 text-[12px] leading-[17px] text-white/60"
              style={{ textWrap: "pretty" }}
            >
              {step.thought}
            </p>
            {step.facts !== undefined && (
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
        )}
      </div>
    </li>
  );
}
