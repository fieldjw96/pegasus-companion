"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useLocalNav } from "./phone-nav";
import { AppShell } from "@/components/ui/app-shell";
import { ThinkingAvatar } from "@/components/ui/avatar";
import type { Step, Trace } from "@/lib/agent/trace";

/**
 * The agents, running.
 *
 * A screen that needs the companion's work asks for a run: the steps that
 * get it from what it knows to what it shows. The steps arrive one at a time
 * on the presenter's panel, the way a model's reasoning streams, and the
 * phone waits for the last one before it shows the result. That wait is the
 * point: a trip that appears instantly looks looked up; one that appears
 * after visible reasoning looks decided.
 *
 * Two phones can think at once: Will's updates while Archie's opens. Each
 * phone is a lane with one run in it; starting a run in a lane retires the
 * lane's previous run to history, finished.
 *
 * A tiny external store rather than context state, for the same reason the
 * journey is: several screens and the panel read it, and none of them should
 * set state in an effect to do so.
 */
export type Lane = "main" | "aside";

export type Run = Trace & {
  /** The scene the run belongs to. */
  title: string;
  id: number;
  /** Which screen asked, so the same screen does not re-run on a re-render. */
  key: string;
  lane: Lane;
  /** How many steps have arrived so far. */
  revealed: number;
  done: boolean;
};

type AgentState = { active: Run[]; history: Run[] };

let snapshot: AgentState = { active: [], history: [] };
const listeners = new Set<() => void>();
const timers = new Map<number, number>();
let nextId = 1;

/** How long a step takes to arrive, by what kind of step it is. */
const PACE: Record<Step["kind"], number> = {
  read: 480,
  think: 820,
  act: 640,
  quiet: 520,
  wait: 320,
};

function emit(next: AgentState): void {
  snapshot = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function clearTimer(id: number): void {
  const t = timers.get(id);
  if (t !== undefined) {
    window.clearTimeout(t);
    timers.delete(id);
  }
}

function reveal(id: number): void {
  timers.delete(id);
  const run = snapshot.active.find((r) => r.id === id);
  if (run === undefined || run.done) return;
  const revealed = run.revealed + 1;
  const done = revealed >= run.steps.length;
  const updated = { ...run, revealed, done };
  emit({ ...snapshot, active: snapshot.active.map((r) => (r.id === id ? updated : r)) });
  if (!done) {
    const next = run.steps[revealed];
    timers.set(
      id,
      window.setTimeout(() => reveal(id), next === undefined ? 0 : PACE[next.kind]),
    );
  }
}

/** Start a run in a lane, unless that key's run is already in it. */
function start(key: string, lane: Lane, trace: Trace & { title?: string }): void {
  if (snapshot.active.some((r) => r.key === key)) return;
  const previous = snapshot.active.filter((r) => r.lane === lane);
  previous.forEach((r) => clearTimer(r.id));
  const retired = previous.map((r) => ({ ...r, revealed: r.steps.length, done: true }));
  const run: Run = {
    ...trace,
    title: trace.title ?? "Thinking",
    id: nextId,
    key,
    lane,
    revealed: 0,
    done: trace.steps.length === 0,
  };
  nextId += 1;
  emit({
    active: [...snapshot.active.filter((r) => r.lane !== lane), run],
    history: [...retired, ...snapshot.history].slice(0, 8),
  });
  if (trace.steps.length > 0) {
    timers.set(
      run.id,
      window.setTimeout(() => reveal(run.id), 260),
    );
  }
}

/** A phone was put away: its runs are over, whatever step they were on. */
function retireLane(lane: Lane): void {
  const gone = snapshot.active.filter((r) => r.lane === lane);
  if (gone.length === 0) return;
  gone.forEach((r) => clearTimer(r.id));
  emit({
    active: snapshot.active.filter((r) => r.lane !== lane),
    history: [
      ...gone.map((r) => ({ ...r, revealed: r.steps.length, done: true })),
      ...snapshot.history,
    ].slice(0, 8),
  });
}

/** Show everything at once: the presenter is in a hurry. */
function finish(): void {
  snapshot.active.forEach((r) => clearTimer(r.id));
  emit({
    ...snapshot,
    active: snapshot.active.map((r) => ({ ...r, revealed: r.steps.length, done: true })),
  });
}

/** Bumped on every reset, so a screen whose key has not changed still re-runs. */
let generation = 0;

function reset(): void {
  snapshot.active.forEach((r) => clearTimer(r.id));
  generation += 1;
  emit({ active: [], history: [] });
}

const EMPTY: AgentState = { active: [], history: [] };

export function useAgents(): AgentState & {
  finish: () => void;
  reset: () => void;
  retireLane: (lane: Lane) => void;
} {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
  return { ...state, finish, reset, retireLane };
}

function isDone(key: string): boolean {
  const run = snapshot.active.find((r) => r.key === key);
  if (run !== undefined) return run.done;
  return snapshot.history.some((r) => r.key === key);
}

/**
 * Ask for a run and learn whether it has finished.
 *
 * `key` names the piece of work; pass null when there is nothing to run. The
 * trace is built when the key changes, from whatever the screen knows then,
 * so it reads the demo's state at the moment the agent would have. A run that
 * was retired by a later one in the same lane counts as finished.
 */
export function useAgentRun(
  key: string | null,
  build: () => Trace & { title?: string },
): boolean {
  const lane: Lane = useLocalNav() === null ? "main" : "aside";
  const done = useSyncExternalStore(
    subscribe,
    () => key === null || isDone(key),
    () => key === null,
  );
  const gen = useSyncExternalStore(
    subscribe,
    () => generation,
    () => 0,
  );
  useEffect(() => {
    if (key !== null) start(key, lane, build());
    // The trace is a function of the key; rebuilding it on every render would
    // restart nothing (start() ignores a repeated key) but is wasted work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lane, gen]);
  return done;
}

/** The in-app face of a run in progress: the wing beats, the label says what for. */
export function Thinking({ label, header }: { label: string; header?: React.ReactNode }) {
  return (
    <AppShell header={header}>
      <div role="status" className="flex flex-col items-center gap-7 pt-24 pb-10">
        <ThinkingAvatar />
        <p className="text-center text-[17px] leading-6 font-semibold">{label}</p>
      </div>
    </AppShell>
  );
}
