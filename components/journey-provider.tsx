"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { DraftKey, TripDraft } from "@/lib/assistant/draft";

/**
 * What the passenger has done so far in this demo, carried across screens.
 *
 * Kept in session storage rather than the URL: a trip is a dozen fields with
 * provenance on each, which is more than a query string should carry, and a
 * presenter refreshing the page mid-demo should land where they were. Every
 * screen still works cold, by falling back to Jess's week.
 */
export type JourneyState = {
  prompt: string | null;
  draft: TripDraft | null;
  /** The last change said in a sentence, and which fields it moved. */
  edit: { said: string; changed: DraftKey[] } | null;
  /** Where the trip came from: the nudge she said yes to, or a sentence she typed. */
  origin: "nudge" | "sentence" | null;
  /** Jess has paid. */
  booked: boolean;
  /** "Did we get your trip right?" */
  thumbs: "up" | "down" | null;
  /** Who the trip was sent to, by name: the squad, with seats beside Jess. */
  invited: string[];
  /** Anyone else Jess found in her contacts: the same link, no seat held. */
  shared: string[];
  /** The invites have gone out. */
  sent: boolean;
  /** Invitees who have paid, with the seat they took. */
  inviteesBooked: Record<string, string | null>;
  /** Jess took the one group offer: breakfast for the three of them. */
  breakfast: boolean;
  /** The hostel for the balloon nights: booked for three, or declined for this trip. */
  hostel: "booked" | "declined" | null;
  /** Dad was sent the flight: a new user, and told if it moves. */
  dadTold: boolean;
  /** Invitees who took the remembered meal off their booking, by name. */
  mealsDropped: string[];
  /** The companion's opening nudge, and what Jess said to it. */
  nudge: {
    /** "Not this time": quiet until the next free week it finds. */
    declined: boolean;
    /** "Don't suggest trips": quiet for good. */
    never: boolean;
    /** How many times it has spoken unasked. */
    spoken: number;
  };
  /**
   * The second phone, when the story is on someone else's device: whose it
   * is and which screen it shows. Null when the main phone is the only one.
   */
  aside: { who: "archie" | "will" | "dad"; route: string } | null;
};

const INITIAL: JourneyState = {
  prompt: null,
  draft: null,
  edit: null,
  origin: null,
  booked: false,
  thumbs: null,
  invited: [],
  shared: [],
  sent: false,
  inviteesBooked: {},
  breakfast: false,
  hostel: null,
  dadTold: false,
  mealsDropped: [],
  nudge: { declined: false, never: false, spoken: 0 },
  aside: null,
};

const KEY = "pegasus-companion-journey-v5";

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
      loaded = { ...INITIAL, ...parsed, nudge: { ...INITIAL.nudge, ...parsed.nudge } };
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
