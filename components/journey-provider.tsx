"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { TripDraft } from "@/lib/assistant/draft";
import type { AirportCode } from "@/lib/journey/flights";

/**
 * What the passenger has done so far in this demo, carried across screens.
 *
 * Kept in session storage rather than the URL: the trip is a dozen fields with
 * provenance on each, which is more than a query string should carry, and a
 * presenter refreshing the page mid-demo should land where they were. Every
 * screen still works cold, by falling back to the hero trip.
 */
export type JourneyState = {
  profileId: string;
  prompt: string | null;
  draft: TripDraft | null;
  /** Jack has paid. */
  booked: boolean;
  /** Who was invited, by name, once the group was built. */
  invited: string[];
  invitesSent: boolean;
  /** Sam's side. */
  invitee: { seatTaken: boolean; booked: boolean };
  /** The watch, once set, and what has happened to it since. */
  watch: {
    set: boolean;
    excluded: AirportCode[];
    /** The companion has spoken this many times in this deliberation. */
    spoken: number;
    /** Jack approved from the lock screen. */
    approved: boolean;
    capRaisedTo: number | null;
  };
};

const INITIAL: JourneyState = {
  profileId: "family",
  prompt: null,
  draft: null,
  booked: false,
  invited: [],
  invitesSent: false,
  invitee: { seatTaken: false, booked: false },
  watch: { set: false, excluded: [], spoken: 0, approved: false, capRaisedTo: null },
};

const KEY = "pegasus-companion-journey";

type Journey = {
  state: JourneyState;
  /** True once the browser's copy has been read, so a screen can avoid flashing defaults. */
  ready: boolean;
  update: (
    patch: Partial<JourneyState> | ((prev: JourneyState) => Partial<JourneyState>),
  ) => void;
  reset: () => void;
};

/*
 * A tiny external store rather than useState plus an effect. Session storage
 * is read once, lazily, on the client; the server renders the defaults; React
 * reconciles the two after hydration through useSyncExternalStore, which is
 * exactly the case that hook exists for.
 */
let snapshot: JourneyState | null = null;
const listeners = new Set<() => void>();

function load(): JourneyState {
  if (snapshot !== null) return snapshot;
  let loaded = INITIAL;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw !== null) loaded = { ...INITIAL, ...(JSON.parse(raw) as Partial<JourneyState>) };
  } catch {
    // A corrupt entry is not worth a broken demo: start clean.
  }
  snapshot = loaded;
  return loaded;
}

function write(next: JourneyState): void {
  snapshot = next;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode, quota, or a blocked store. The screen still works.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const JourneyContext = createContext<Journey | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, load, () => INITIAL);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const update = useCallback<Journey["update"]>((patch) => {
    const prev = load();
    write({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) });
  }, []);

  const reset = useCallback(() => write(INITIAL), []);

  const value = useMemo(
    () => ({ state, ready, update, reset }),
    [state, ready, update, reset],
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney(): Journey {
  const journey = useContext(JourneyContext);
  if (journey === null) {
    throw new Error("useJourney must be used inside JourneyProvider");
  }
  return journey;
}
