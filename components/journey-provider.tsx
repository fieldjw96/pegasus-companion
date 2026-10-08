"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { TripDraft } from "@/lib/assistant/draft";

/**
 * What the passenger has done so far in this demo, carried across screens.
 *
 * Kept in session storage rather than the URL: a trip is a dozen fields with
 * provenance on each, which is more than a query string should carry, and a
 * presenter refreshing the page mid-demo should land where they were. Every
 * screen still works cold, by falling back to the persona's starting trip.
 */
export type JourneyState = {
  /** Whose phone this is. */
  persona: "will" | "emre";
  prompt: string | null;
  draft: TripDraft | null;
  /** Will has paid. */
  booked: boolean;
  /** "Did we get your trip right?" */
  thumbs: "up" | "down" | null;
  /** Who the trip was sent to, by name. */
  invited: string[];
  /** The invites have gone out. */
  sent: boolean;
  /** Invitees who have paid, with the seat they took. */
  inviteesBooked: Record<string, string | null>;
  /** Will took the one group offer: breakfast for the three of them. */
  breakfast: boolean;
  /** Emre's side. */
  emre: {
    draft: TripDraft | null;
    booked: boolean;
    /** "Not quite: return date". */
    corrected: string | null;
    gifts: boolean;
    surprise: boolean;
    /** Next year's nudge was taken: the usual is rebuilt a year on. */
    nextYear: boolean;
    /** Whether the presents were taken last year. Left once, they are not offered again. */
    giftsLastYear: boolean;
    /** Dad was sent the flight: a new user. */
    dadTold: boolean;
  };
  moment: {
    set: boolean;
    declined: boolean;
    never: boolean;
    approved: boolean;
    spoken: number;
  };
  /**
   * The second phone, when the story is on someone else's device: whose it
   * is and which screen it shows. Null when the main phone is the only one.
   */
  aside: { who: "archie" | "tom" | "dad"; route: string } | null;
};

const INITIAL: JourneyState = {
  persona: "will",
  prompt: null,
  draft: null,
  booked: false,
  thumbs: null,
  invited: [],
  sent: false,
  inviteesBooked: {},
  breakfast: false,
  emre: {
    draft: null,
    booked: false,
    corrected: null,
    gifts: false,
    surprise: true,
    nextYear: false,
    giftsLastYear: false,
    dadTold: false,
  },
  // The companion learned the moment itself, from last June: it is set from the start.
  moment: { set: true, declined: false, never: false, approved: false, spoken: 0 },
  aside: null,
};

const KEY = "pegasus-companion-journey-v3";

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
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<JourneyState>;
      loaded = {
        ...INITIAL,
        ...parsed,
        emre: { ...INITIAL.emre, ...parsed.emre },
        moment: { ...INITIAL.moment, ...parsed.moment },
      };
    }
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
