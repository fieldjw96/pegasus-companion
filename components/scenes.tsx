"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useJourney } from "./journey-provider";

/**
 * The presenter's panel beside the phone.
 *
 * The companion speaks on the lock screen, on different mornings, to different
 * people. A phone cannot show "two days later" on its own, so the panel lists
 * every scene in both journeys and jumps straight to it. It is for the person
 * giving the demo, not the passenger, and it sits outside the device for that
 * reason.
 */
type Scene = { href: string; title: string; note?: string };
type Act = { part: string; journey: string; scenes: Scene[] };

const ACTS: Act[] = [
  {
    part: "Part 1 · Booking",
    journey: "Journey 1, cold start: speak the trip, get a ticket",
    scenes: [
      { href: "/", title: "Greeting", note: "Say the trip, or tap Izmir under Try" },
      { href: "/checkout", title: "Checkout" },
      { href: "/confirmation", title: "Confirmation", note: "The group card appears here" },
    ],
  },
  {
    part: "Part 2 · Group booking",
    journey: "Journey 1, continued: hold seats for the squad",
    scenes: [
      { href: "/group/people", title: "Who's coming?", note: "Organiser: Jack" },
      { href: "/group/review", title: "Review and send" },
      { href: "/invite", title: "Sam's lock screen", note: "Invitee: Sam" },
      { href: "/invite/ticket", title: "Sam's ticket", note: "The seat offer, 19C" },
      { href: "/invite/checkout", title: "Sam's checkout" },
      { href: "/invite/confirmation", title: "Sam's confirmation" },
      { href: "/invite/email", title: "Tom's email", note: "No account" },
      { href: "/group", title: "Group status", note: "Back on Jack's phone" },
    ],
  },
  {
    part: "Part 3 · The companion moves first",
    journey: "Journey 2, warm start: the moment is spotted",
    scenes: [
      { href: "/flights", title: "Trips I'm watching", note: "Tap a trip to set the intent" },
      { href: "/flights/watch", title: "The intent sheet" },
      {
        href: "/companion/quiet",
        title: "A morning where nothing happened",
        note: "Restraint",
      },
      { href: "/companion/morning", title: "22 Sep: the fare drops", note: "Live Activity" },
      { href: "/companion/look", title: "Look: the ticket from the watch" },
      { href: "/companion/deadline", title: "28 Sep: the deadline rule fires" },
    ],
  },
];

export function Scenes() {
  const pathname = usePathname();
  const { reset } = useJourney();
  return (
    <aside
      aria-label="Demo scenes"
      className="w-full max-w-[390px] shrink-0 text-white/80 lg:w-[300px] lg:pt-2"
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
          <ul className="mt-2 flex flex-col gap-0.5">
            {act.scenes.map((scene) => {
              const on = pathname === scene.href;
              return (
                <li key={scene.href}>
                  <Link
                    href={scene.href}
                    aria-current={on ? "page" : undefined}
                    className={`block rounded-lg px-2.5 py-1.5 text-[13px] leading-[18px] ${
                      on ? "bg-white/10 text-white" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="font-semibold">{scene.title}</span>
                    {scene.note !== undefined && (
                      <span className="block text-[11px] text-white/45">{scene.note}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="mt-6 text-[11px] leading-4 text-white/35">
        A mock for the Pegasus × Berkeley Haas AI Travel Companion Hackathon. Nothing here
        books anything. Not affiliated with Pegasus Airlines.
      </p>
    </aside>
  );
}
