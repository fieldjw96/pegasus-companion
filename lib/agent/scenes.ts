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
        note: "A WhatsApp from Will",
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
        note: "Nudge in Will's name, card declined",
        agent: "Moments",
      },
      {
        href: "/group",
        title: "Squad complete",
        note: "Breakfast for the squad",
        agent: "Offer",
      },
      { href: "/squad/check-in", title: "Checked in for them", agent: "Moments" },
      {
        href: "/squad/next-trip",
        title: "The next trip",
        note: "New route, same lads",
        agent: "Moments",
      },
      { href: "/squad/cancelled", title: "Unhappy path: flight cancelled" },
    ],
  },
  {
    part: "Journey 2 · Home for Mum's birthday",
    journey: "Emre, 34, Istanbul. Warm start: he's flown it before.",
    scenes: [
      {
        href: "/flights",
        title: "Trips I'm watching",
        note: "Tap Mum's birthday",
        agent: "Moments",
      },
      { href: "/flights/moment", title: "What I remembered" },
      { href: "/moment/quiet", title: "A morning where nothing happened", note: "Restraint" },
      {
        href: "/moment/nudge",
        title: "Two months out",
        note: "14 April, Why I spoke, Face ID",
        agent: "Moments",
      },
      {
        href: "/moment/look",
        title: "One tap, his usual",
        note: "Thumbs: not quite, return date. Room for presents",
        agent: "Trip",
      },
      { href: "/emre/checkout", title: "The passport, before payment", agent: "Trip" },
      { href: "/emre/confirmation", title: "Dad's in on the surprise" },
      { href: "/moment/dad", title: "Dad's phone" },
      { href: "/moment/cancelled", title: "Unhappy path: the flight is cancelled" },
      {
        href: "/moment/reminder",
        title: "Late May",
        note: "A reminder if unbooked, silence if booked",
      },
      { href: "/moment/not-this-year", title: "Not this year / never", note: "Opt-outs" },
      { href: "/moment/next-year", title: "Next year" },
      { href: "/moment/stop", title: "Dad wants out" },
    ],
  },
];

/** Routes that are a screen in a journey but not a beat of their own. */
const ALIASES: Record<string, string> = {
  "/invite/archie/checkout": "/invite/archie/ticket",
  "/invite/archie/confirmation": "/invite/archie/ticket",
  "/invite/tom/ticket": "/invite/tom",
  "/invite/tom/checkout": "/invite/tom",
  "/invite/tom/confirmation": "/invite/tom",
  "/emre": "/moment/look",
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
