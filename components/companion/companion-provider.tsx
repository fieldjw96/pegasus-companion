"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CompanionState, Intervention, Judgement } from "@/lib/companion/types";

type Reportable = Partial<
  Pick<CompanionState, "step" | "route" | "departDate" | "party" | "shortlist">
>;

type CompanionContextValue = {
  state: CompanionState;
  intervention: Intervention | null;
  judgement: Judgement | null;
  source: "jev" | "stub" | null;
  elapsedMs: number | null;
  /** A screen tells the companion where the passenger is. Cheap, call freely. */
  report: (next: Reportable) => void;
  /** Demo: pretend the passenger left and came back, with something changed. */
  simulateReturn: (finding: string, hoursAway: number) => void;
  dismiss: () => void;
  reset: () => void;
};

const INITIAL: CompanionState = {
  step: "search",
  route: "SAW-STN",
  departDate: "",
  party: { adults: 1, children: 0, infants: 0 },
  shortlist: [],
  visits: 1,
  hoursSinceLastVisit: null,
  findings: [],
  interruptionsSoFar: 0,
};

const CompanionContext = createContext<CompanionContextValue | null>(null);

export function CompanionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CompanionState>(INITIAL);
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [judgement, setJudgement] = useState<Judgement | null>(null);
  const [source, setSource] = useState<"jev" | "stub" | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  /*
   * `report` is called from render-adjacent code on several screens, so it must be
   * stable and must not itself trigger a decision when nothing material changed.
   * The ref holds the last state we actually asked about, so a re-render with the
   * same step does not fire another request.
   */
  const lastAsked = useRef<string>("");

  const report = useCallback((next: Reportable) => {
    setState((current) => ({ ...current, ...next }));
  }, []);

  const simulateReturn = useCallback((finding: string, hoursAway: number) => {
    setState((current) => ({
      ...current,
      step: "search",
      visits: current.visits + 1,
      hoursSinceLastVisit: hoursAway,
      findings: [finding, ...current.findings].slice(0, 3),
    }));
  }, []);

  const dismiss = useCallback(() => {
    setIntervention(null);
    setState((current) => ({
      ...current,
      interruptionsSoFar: current.interruptionsSoFar + 1,
    }));
  }, []);

  const reset = useCallback(() => {
    lastAsked.current = "";
    setIntervention(null);
    setJudgement(null);
    setSource(null);
    setElapsedMs(null);
    setState(INITIAL);
  }, []);

  useEffect(() => {
    const key = JSON.stringify([state.step, state.findings, state.party, state.visits]);
    if (key === lastAsked.current) return;
    lastAsked.current = key;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/companion/decide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        if (!response.ok) return;
        const body = (await response.json()) as {
          intervention: Intervention | null;
          judgement: Judgement;
          source: "jev" | "stub";
          elapsedMs: number;
        };
        if (cancelled) return;
        setIntervention(body.intervention);
        setJudgement(body.judgement);
        setSource(body.source);
        setElapsedMs(body.elapsedMs);
      } catch {
        // The journey must work with the companion dead. Silence is the fallback.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state]);

  const value = useMemo<CompanionContextValue>(
    () => ({
      state,
      intervention,
      judgement,
      source,
      elapsedMs,
      report,
      simulateReturn,
      dismiss,
      reset,
    }),
    [
      state,
      intervention,
      judgement,
      source,
      elapsedMs,
      report,
      simulateReturn,
      dismiss,
      reset,
    ],
  );

  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>;
}

export function useCompanion(): CompanionContextValue {
  const value = useContext(CompanionContext);
  if (value === null) throw new Error("useCompanion must be used inside CompanionProvider");
  return value;
}

/**
 * Tell the companion which step this screen is. Separate from `report` so a screen
 * can declare its step in one line without an effect of its own.
 */
export function useReportStep(step: CompanionState["step"], extra?: Reportable): void {
  const { report } = useCompanion();
  useEffect(() => {
    report({ step, ...extra });
    // `extra` is intentionally not a dependency: screens pass a fresh object literal
    // every render, which would loop. Step changes are what matter here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, report]);
}
