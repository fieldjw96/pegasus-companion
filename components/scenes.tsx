"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useJourney } from "./journey-provider";

/**
 * The presenter's panel beside the phone.
 *
 * The companion speaks on lock screens, on different days, to different
 * people. A phone cannot show "two days later" or "on Archie's phone" on its
 * own, so the panel lists every scene of both journeys and jumps straight to
 * it. It is for the person giving the demo, not the passenger, and it sits
 * outside the device for that reason.
 */
type Scene = { href: string; title: string; note?: string; agent?: string };
type Act = { part: string; journey: string; scenes: Scene[] };

const ACTS: Act[] = [
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
        title: "The bag, sold at booking",
        note: "On the ticket: fare, seat, breakdown",
        agent: "Offer",
      },
      {
        href: "/confirmation",
        title: "Lock the price, invite the lads",
        note: "Freeze and invite, thumbs",
        agent: "Group",
      },
      { href: "/group/people", title: "Who's coming?" },
      { href: "/group/review", title: "Review and send" },
      {
        href: "/invite/archie",
        title: "Archie has the app",
        note: "A push in Will's name",
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
        note: "Thumbs: not quite, return date",
        agent: "Trip",
      },
      { href: "/emre/checkout", title: "Room for presents, passport check", agent: "Offer" },
      { href: "/emre/confirmation", title: "Dad's in on the surprise" },
      { href: "/moment/dad", title: "Dad's phone" },
      { href: "/moment/cancelled", title: "Unhappy path: the flight is cancelled" },
      { href: "/moment/reminder", title: "Late May: still not booked" },
      { href: "/moment/not-this-year", title: "Not this year / never", note: "Opt-outs" },
      { href: "/moment/next-year", title: "Next year" },
      { href: "/moment/stop", title: "Dad wants out" },
    ],
  },
];

export function Scenes() {
  const pathname = usePathname();
  const { reset } = useJourney();
  return (
    <aside
      aria-label="Demo scenes"
      className="w-full max-w-[410px] shrink-0 text-white/80 lg:w-[320px] lg:pt-2"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase">
          Scenes
        </h2>
        <button
          type="button"
          onClick={reset}
          className="text-[12px] font-semibold text-white/50 hover:text-white"
        >
          Reset demo
        </button>
      </div>
      {ACTS.map((act) => (
        <section key={act.part} className="mt-5">
          <h3 className="text-[13px] font-bold text-white">{act.part}</h3>
          <p className="mt-0.5 text-[12px] leading-4 text-white/50">{act.journey}</p>
          <ol className="mt-2 flex flex-col gap-0.5">
            {act.scenes.map((scene, i) => {
              const on = pathname === scene.href;
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
                    {scene.agent !== undefined && (
                      <span className="shrink-0 rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-white/60">
                        {scene.agent}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      <p className="mt-6 text-[11px] leading-4 text-white/35">
        Team Winging It, for the Pegasus × Berkeley Haas AI Travel Companion Hackathon. A
        concept, not a Pegasus product. Nothing here books anything.
      </p>
    </aside>
  );
}
