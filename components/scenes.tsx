"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useJourney } from "./journey-provider";
import { ACTS, sceneFor } from "@/lib/agent/scenes";
import { traceFor, type AgentName, type Step, type StepKind } from "@/lib/agent/trace";

/**
 * The presenter's panel beside the phone, with two views.
 *
 * Agent, the default, shows the work behind the screen on the phone: which of
 * the four agents acted, what it read, what it concluded and what it did,
 * step by step, with the figures it used. Every step is computed from the
 * same calls the screen made, so the panel cannot say one thing while the
 * phone shows another.
 *
 * Scenes lists every beat of both journeys and jumps straight to it. The
 * companion speaks on lock screens, on different days, to different people,
 * and a phone cannot show "two days later" or "on Archie's phone" on its own.
 *
 * Both are for the person giving the demo, not the passenger, which is why
 * the panel sits outside the device.
 */
type View = "agent" | "scenes";

export function Scenes() {
  const pathname = usePathname();
  const { reset } = useJourney();
  const [view, setView] = useState<View>("agent");
  return (
    <aside
      aria-label="Presenter panel"
      className="no-scrollbar w-full max-w-[410px] shrink-0 text-white/80 lg:max-h-[864px] lg:w-[340px] lg:overflow-y-auto lg:pt-2"
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
        <button
          type="button"
          onClick={reset}
          className="text-[12px] font-semibold text-white/50 hover:text-white"
        >
          Reset demo
        </button>
      </div>
      {view === "agent" ? (
        <AgentView pathname={pathname} />
      ) : (
        <SceneList pathname={pathname} />
      )}
      <p className="mt-6 text-[11px] leading-4 text-white/35">
        Team Winging It, for the Pegasus × Berkeley Haas AI Travel Companion Hackathon. A
        concept, not a Pegasus product. Nothing here books anything.
      </p>
    </aside>
  );
}

function SceneList({ pathname }: { pathname: string }) {
  const current = sceneFor(pathname)?.scene.href ?? pathname;
  return (
    <div role="tabpanel" aria-label="Scenes">
      {ACTS.map((act) => (
        <section key={act.part} className="mt-5">
          <h3 className="text-[13px] font-bold text-white">{act.part}</h3>
          <p className="mt-0.5 text-[12px] leading-4 text-white/50">{act.journey}</p>
          <ol className="mt-2 flex flex-col gap-0.5">
            {act.scenes.map((scene, i) => {
              const on = current === scene.href;
              return (
                <li key={scene.href}>
                  <Link
                    href={scene.href}
                    aria-current={on ? "page" : undefined}
                    className={`flex items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-[13px] leading-[18px] ${
                      on ? "bg-white/10 text-white" : "hover:bg-white/5"
                    }`}
                  >
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
                  </Link>
                </li>
              );
            })}
          </ol>
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

function AgentView({ pathname }: { pathname: string }) {
  const { state } = useJourney();
  const found = sceneFor(pathname);
  const trace = traceFor(pathname, state);
  return (
    <div role="tabpanel" aria-label="Agent" className="mt-5">
      <h3 className="text-[13px] font-bold text-white">
        {found === null ? "This screen" : found.scene.title}
      </h3>
      <p className="mt-0.5 text-[12px] leading-4 text-white/50">
        {trace.who} · {trace.when}
      </p>
      {/* Keyed on the route so the steps rise in again on every scene change. */}
      <ol key={pathname} className="mt-4 flex flex-col">
        {trace.steps.map((s, i) => (
          <StepRow
            key={`${pathname}-${i}`}
            step={s}
            index={i}
            last={i === trace.steps.length - 1}
          />
        ))}
      </ol>
      <p className="mt-4 text-[11px] leading-4 text-white/35">
        Every figure above is computed by the same code that drew the screen. A held-back step
        is the companion deciding not to speak.
      </p>
    </div>
  );
}

function StepRow({ step, index, last }: { step: Step; index: number; last: boolean }) {
  const muted = step.kind === "quiet" || step.kind === "wait";
  return (
    <li
      className="rise flex gap-2.5 pb-4"
      style={{ animationDelay: `${index * 90}ms`, animationFillMode: "backwards" }}
    >
      <Rail kind={step.kind} last={last} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <AgentChip agent={step.agent} />
          <span className="text-[10px] font-bold tracking-[0.08em] text-white/40 uppercase">
            {KIND_LABEL[step.kind]}
          </span>
        </div>
        <p
          className={`mt-1 text-[13px] leading-[18px] font-semibold ${muted ? "text-white/70" : "text-white"}`}
        >
          {step.did}
        </p>
        <p
          className="mt-0.5 text-[12px] leading-[17px] text-white/60"
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
    </li>
  );
}
