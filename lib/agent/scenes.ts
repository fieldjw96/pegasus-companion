import type { AgentName } from "./trace";

/**
 * Every beat of both journeys, in order, with the route that shows it.
 *
 * Data, not a component, so the presenter's panel can list it and a test can
 * walk every route and assert the agents have something to say on each.
 */
export type Scene = { href: string; title: string; note?: string; agent?: AgentName };
export type Act = { part: string; journey: string; scenes: Scene[] };

export const ACTS: Act[] = [
  {
    part: "Journey 1 · The lads go to Cappadocia",
    journey: "Will, 26, London. Cold start: no history, no profile.",
    scenes: [
      {
        href: "/",
        title: "A wish becomes a week",
        note: "Say it, or tap Cappadocia under Try",
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
        title: "Send it to your friends?",
        note: "Two suggested from contacts",
        agent: "Group",
      },
      {
        href: "/invite/archie",
        title: "Archie has the app",
        note: "A nudge in Will's name: 14B is free",
        agent: "Group",
      },
      { href: "/invite/archie/ticket", title: "Archie's booking, pre-filled" },
      {
        href: "/invite/tom",
        title: "Tom doesn't",
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
        href: "/invite/tom/stalls",
        title: "Tom stalls",
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
      { href: "/squad/cancelled", title: "Unhappy path: flight cancelled" },
      {
        href: "/squad/next-trip",
        title: "The next trip",
        note: "Fares down 10%, same lads",
        agent: "Moments",
      },
    ],
  },
  {
    part: "Journey 2 · Home for Mum's birthday",
    journey: "Emre, 34, Istanbul. Warm start: he's flown it before.",
    scenes: [
      {
        href: "/moment/nudge",
        title: "Two months out",
        note: "14 April, a push, Why I spoke",
        agent: "Moments",
      },
      {
        href: "/emre",
        title: "One tap, his usual",
        note: "Return date options, thumbs, room for presents",
        agent: "Trip",
      },
      { href: "/emre/checkout", title: "The passport, before payment", agent: "Trip" },
      { href: "/emre/confirmation", title: "Dad's in on the surprise", agent: "Moments" },
      { href: "/moment/dad", title: "Dad's phone", note: "Follow the flight, or STOP" },
      {
        href: "/moment/cancelled",
        title: "Unhappy path: the flight is cancelled",
        note: "Rebooked first, Dad told the same second",
      },
      { href: "/moment/not-this-year", title: "Not this year / never", note: "Opt-outs" },
      {
        href: "/moment/next-year",
        title: "Next year",
        note: "Same again; what he left is not offered",
      },
      { href: "/moment/stop", title: "Dad wants out" },
    ],
  },
];

/** Routes that are a screen in a journey but not a beat of their own. */
const ALIASES: Record<string, string> = {
  "/invite/archie/checkout": "/invite/archie/ticket",
  "/invite/archie/confirmation": "/invite/archie/ticket",
  "/invite/tom/signup": "/invite/tom",
  "/invite/tom/ticket": "/invite/tom",
  "/invite/tom/checkout": "/invite/tom",
  "/invite/tom/confirmation": "/invite/tom",
  "/moment/dad/cancelled": "/moment/cancelled",
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
