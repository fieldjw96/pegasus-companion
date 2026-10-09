import type { AgentName } from "./trace";

/**
 * Every beat of the journey, in order, with the route that shows it.
 *
 * Data, not a component, so the presenter's panel can list it and a test can
 * walk every route and assert the agents have something to say on each.
 */
export type Scene = { href: string; title: string; note?: string; agent?: AgentName };
export type Act = { part: string; journey: string; scenes: Scene[] };

export const ACTS: Act[] = [
  {
    part: "Three mates go to Cappadocia",
    journey: "Will, 26, London, with Archie and Jess. Cold start: no history, no profile.",
    scenes: [
      {
        href: "/nudge",
        title: "The companion speaks first",
        note: "A free week, two searches, a fare low. Why I spoke",
        agent: "Moments",
      },
      {
        href: "/",
        title: "A wish becomes a week",
        note: "The ticket, built from what it knew",
        agent: "Trip",
      },
      {
        href: "/checkout",
        title: "Nothing to type",
        note: "Passport and payment filled, nothing upsold",
        agent: "Offer",
      },
      {
        href: "/confirmation",
        title: "Send it to your friends to claim a voucher?",
        note: "Two suggested, search for more, keep Mum posted",
        agent: "Group",
      },
      { href: "/follow/mum", title: "Mum's phone", note: "The landing time, or STOP" },
      {
        href: "/invite/archie",
        title: "Archie has the app",
        note: "A nudge in Will's name: 14B is free",
        agent: "Group",
      },
      { href: "/invite/archie/ticket", title: "Archie's booking, pre-filled" },
      {
        href: "/invite/jess",
        title: "Jess doesn't",
        note: "A WhatsApp from Will, a sign-up with nothing to type",
        agent: "Group",
      },
      {
        href: "/squad/waiting",
        title: "The waiting window",
        note: "Live tracker, souvenir offer",
        agent: "Group",
      },
      {
        href: "/invite/jess/stalls",
        title: "Jess stalls",
        note: "A second WhatsApp in Will's name",
        agent: "Moments",
      },
      {
        href: "/group",
        title: "Squad complete",
        note: "Breakfast for the squad",
        agent: "Offer",
      },
      {
        href: "/squad/hostel",
        title: "Looking to book a hostel?",
        note: "One place for the balloon nights, priced for three",
        agent: "Trip",
      },
      { href: "/squad/check-in", title: "Checked in for them", agent: "Moments" },
      {
        href: "/squad/cancelled",
        title: "Unhappy path: flight cancelled",
        note: "Rebooked first, told second, Mum too",
      },
      {
        href: "/squad/next-trip",
        title: "The next trip",
        note: "Fares down 10%, same three",
        agent: "Moments",
      },
    ],
  },
];

/** Routes that are a screen in a journey but not a beat of their own. */
const ALIASES: Record<string, string> = {
  "/invite/archie/checkout": "/invite/archie/ticket",
  "/invite/archie/confirmation": "/invite/archie/ticket",
  "/invite/jess/signup": "/invite/jess",
  "/invite/jess/ticket": "/invite/jess",
  "/invite/jess/checkout": "/invite/jess",
  "/invite/jess/confirmation": "/invite/jess",
  "/follow/mum/cancelled": "/squad/cancelled",
  "/follow/mum/stop": "/follow/mum",
};

/** The scene a route belongs to, for the panel's heading. */
export function sceneFor(pathname: string): { act: Act; scene: Scene; index: number } | null {
  const href = ALIASES[pathname] ?? pathname;
  for (const act of ACTS) {
    const index = act.scenes.findIndex((s) => s.href === href);
    const scene = act.scenes[index];
    if (scene !== undefined) return { act, scene, index };
  }
  return null;
}
