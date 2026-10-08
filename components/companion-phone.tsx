"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useAgents } from "./agent-provider";
import { useJourney, type JourneyState } from "./journey-provider";
import { Device } from "./phone-frame";
import { NavProvider, type Nav } from "./phone-nav";
import {
  ArchiePushScreen,
  InviteeCheckout,
  InviteeConfirmation,
  InviteeTicketScreen,
  JessSignUpScreen,
  JessStallsScreen,
  JessWhatsAppScreen,
} from "./screens/invitee";
import { MumFollowsScreen, MumStopScreen } from "./screens/notices";

/**
 * The second phone.
 *
 * The companion's best moments happen on someone else's device: Archie's push,
 * Jess's WhatsApp, Mum's message. A single phone cannot show them, so when the
 * story moves there a second phone appears to the left of Will's,
 * is used like any other, and goes away when that person's part is done.
 *
 * It is not a route. Its taps change which screen it shows, through the nav
 * context, so the screens inside it are the same components the main phone
 * renders and do not know the difference.
 */
export type Aside = NonNullable<JourneyState["aside"]>;

const LABEL: Record<Aside["who"], string> = {
  archie: "Archie's phone",
  jess: "Jess's phone",
  mum: "Mum's phone",
};

function screenFor(route: string): ReactNode {
  switch (route) {
    case "/invite/archie":
      return <ArchiePushScreen />;
    case "/invite/archie/ticket":
      return <InviteeTicketScreen id="archie" />;
    case "/invite/archie/checkout":
      return <InviteeCheckout id="archie" />;
    case "/invite/archie/confirmation":
      return <InviteeConfirmation id="archie" />;
    case "/invite/jess":
      return <JessWhatsAppScreen />;
    case "/invite/jess/signup":
      return <JessSignUpScreen />;
    case "/invite/jess/ticket":
      return <InviteeTicketScreen id="jess" />;
    case "/invite/jess/checkout":
      return <InviteeCheckout id="jess" />;
    case "/invite/jess/confirmation":
      return <InviteeConfirmation id="jess" />;
    case "/invite/jess/stalls":
      return <JessStallsScreen />;
    case "/follow/mum":
      return <MumFollowsScreen />;
    case "/follow/mum/cancelled":
      return <MumFollowsScreen cancelled />;
    case "/follow/mum/stop":
      return <MumStopScreen />;
    default:
      return null;
  }
}

/** The routes that belong on the second phone, and whose it is. */
export function asideFor(route: string): Aside | null {
  if (route.startsWith("/invite/archie")) return { who: "archie", route };
  if (route.startsWith("/invite/jess")) return { who: "jess", route };
  if (route.startsWith("/follow/mum")) return { who: "mum", route };
  return null;
}

export function CompanionPhone() {
  const { state, update } = useJourney();
  const { retireLane } = useAgents();
  const aside = state.aside;
  const open = aside !== null;
  // When the phone goes away, so does its place on the panel.
  useEffect(() => {
    if (!open) retireLane("aside");
  }, [open, retireLane]);
  const nav = useMemo<Nav>(
    () => ({
      push: (href) => update({ aside: asideFor(href) }),
      replace: (href) => update({ aside: asideFor(href) }),
      back: () => update({ aside: null }),
    }),
    [update],
  );
  if (aside === null) return null;
  const archieBooked = "Archie Bell" in state.inviteesBooked;
  const jessInvited = state.invited.length === 0 || state.invited.includes("Jess Carter");
  return (
    <div className="rise flex shrink-0 flex-col items-center gap-3">
      {/* The label sits under the phone, like the time strip under the main one, so the two phones line up. */}
      <Device>
        <NavProvider nav={nav}>{screenFor(aside.route)}</NavProvider>
      </Device>
      <div className="flex w-[410px] items-center justify-between px-2 text-[12px] font-semibold text-white/60">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-2 w-2 rounded-full bg-pg-yellow" />
          {LABEL[aside.who]}
        </span>
        <span className="flex items-center gap-4">
          {aside.who === "archie" && archieBooked && jessInvited && (
            <button
              type="button"
              onClick={() => update({ aside: { who: "jess", route: "/invite/jess" } })}
              className="text-pg-yellow hover:underline"
            >
              Next: Jess&rsquo;s phone →
            </button>
          )}
          <button
            type="button"
            onClick={() => update({ aside: null })}
            className="hover:text-white"
            aria-label={`Put ${LABEL[aside.who]} away`}
          >
            Put away ×
          </button>
        </span>
      </div>
    </div>
  );
}
