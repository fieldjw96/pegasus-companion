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
  WillSignUpScreen,
  WillStallsScreen,
  WillWhatsAppScreen,
} from "./screens/invitee";
import { DadFollowsScreen, DadStopScreen } from "./screens/notices";

/**
 * The second phone.
 *
 * The companion's best moments happen on someone else's device: Archie's push,
 * Will's WhatsApp, Dad's message. A single phone cannot show them, so when the
 * story moves there a second phone appears to the left of Jess's,
 * is used like any other, and goes away when that person's part is done.
 *
 * It is not a route. Its taps change which screen it shows, through the nav
 * context, so the screens inside it are the same components the main phone
 * renders and do not know the difference.
 */
export type Aside = NonNullable<JourneyState["aside"]>;

const LABEL: Record<Aside["who"], string> = {
  archie: "Archie's phone",
  will: "Will's phone",
  dad: "Dad's phone",
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
    case "/invite/will":
      return <WillWhatsAppScreen />;
    case "/invite/will/signup":
      return <WillSignUpScreen />;
    case "/invite/will/ticket":
      return <InviteeTicketScreen id="will" />;
    case "/invite/will/checkout":
      return <InviteeCheckout id="will" />;
    case "/invite/will/confirmation":
      return <InviteeConfirmation id="will" />;
    case "/invite/will/stalls":
      return <WillStallsScreen />;
    case "/follow/dad":
      return <DadFollowsScreen />;
    case "/follow/dad/cancelled":
      return <DadFollowsScreen cancelled />;
    case "/follow/dad/stop":
      return <DadStopScreen />;
    default:
      return null;
  }
}

/** The routes that belong on the second phone, and whose it is. */
export function asideFor(route: string): Aside | null {
  if (route.startsWith("/invite/archie")) return { who: "archie", route };
  if (route.startsWith("/invite/will")) return { who: "will", route };
  if (route.startsWith("/follow/dad")) return { who: "dad", route };
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
  const willInvited = state.invited.length === 0 || state.invited.includes("Will Parker");
  return (
    <div className="rise flex shrink-0 flex-col items-center gap-3">
      {/* The label sits under the phone, so the phone itself lines up with the main one. */}
      <Device>
        <NavProvider nav={nav}>{screenFor(aside.route)}</NavProvider>
      </Device>
      <div className="flex w-[410px] items-center justify-between px-2 text-[12px] font-semibold text-pg-ink">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-2 w-2 rounded-full bg-pg-yellow" />
          {LABEL[aside.who]}
        </span>
        <span className="flex items-center gap-4">
          {aside.who === "archie" && archieBooked && willInvited && (
            <button
              type="button"
              onClick={() => update({ aside: { who: "will", route: "/invite/will" } })}
              className="text-pg-orange hover:underline"
            >
              Next: Will&rsquo;s phone →
            </button>
          )}
          <button
            type="button"
            onClick={() => update({ aside: null })}
            className="hover:text-pg-navy"
            aria-label={`Put ${LABEL[aside.who]} away`}
          >
            Put away ×
          </button>
        </span>
      </div>
    </div>
  );
}
