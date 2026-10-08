"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Where a tap goes.
 *
 * The main phone is the browser: a screen there navigates with Next's router
 * and the URL changes. The second phone, the one that appears beside it when
 * the story moves to Archie's or Jess's or Mum's device, is not a route; it is
 * a screen inside a frame, so its taps change which screen that frame shows.
 * Screens call `useNav()` and do not know which phone they are in.
 */
export type Nav = {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
};

const NavContext = createContext<Nav | null>(null);

export function NavProvider({ nav, children }: { nav: Nav; children: ReactNode }) {
  return <NavContext.Provider value={nav}>{children}</NavContext.Provider>;
}

export function useNav(): Nav {
  const router = useRouter();
  const local = useContext(NavContext);
  return local ?? router;
}

/** The local nav when inside the second phone, else null. */
export function useLocalNav(): Nav | null {
  return useContext(NavContext);
}
