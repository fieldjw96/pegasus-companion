"use client";

import { useMemo, type ReactNode } from "react";
import { useJourney, type JourneyState } from "./journey-provider";
import { Device } from "./phone-frame";
import { NavProvider, type Nav } from "./phone-nav";
import {
  ArchiePushScreen,
  InviteeCheckout,
  InviteeConfirmation,
  InviteeTicketScreen,
  TomStallsScreen,
  TomWhatsAppScreen,
} from "./screens/invitee";
import { DadFollowsScreen, DadStopScreen } from "./screens/notices";

/**
 * The second phone.
 *
 * The companion's best moments happen on someone else's device: Archie's push,
 * Tom's WhatsApp, Dad's message. A single phone cannot show them, so when the
 * story moves there a second phone appears to the left of Will's or Emre's,
 * is used like any other, and goes away when that person's part is done.
 *
 * It is not a route. Its taps change which screen it shows, through the nav
 * context, so the screens inside it are the same components the main phone
 * renders and do not know the difference.
 */
export type Aside = NonNullable<JourneyState["aside"]>;

const LABEL: Record<Aside["who"], string> = {
  archie: "Archie's phone",
  tom: "Tom's phone",
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
    case "/invite/tom":
      return <TomWhatsAppScreen />;
    case "/invite/tom/ticket":
      return <InviteeTicketScreen id="tom" />;
    case "/invite/tom/checkout":
      return <InviteeCheckout id="tom" />;
    case "/invite/tom/confirmation":
      return <InviteeConfirmation id="tom" />;
    case "/invite/tom/stalls":
      return <TomStallsScreen />;
    case "/moment/dad":
      return <DadFollowsScreen />;
    case "/moment/stop":
      return <DadStopScreen />;
    default:
      return null;
  }
}

/** The routes that belong on the second phone, and whose it is. */
export function asideFor(route: string): Aside | null {
  if (route.startsWith("/invite/archie")) return { who: "archie", route };
  if (route.startsWith("/invite/tom")) return { who: "tom", route };
  if (route === "/moment/dad" || route === "/moment/stop") return { who: "dad", route };
  return null;
}

export function CompanionPhone() {
  const { state, update } = useJourney();
  const aside = state.aside;
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
  const tomInvited = state.invited.length === 0 || state.invited.includes("Tom Baker");
  return (
    <div className="rise flex shrink-0 flex-col items-center gap-3">
      <div className="flex w-[410px] items-center justify-between px-2 text-[12px] font-semibold text-white/60">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-2 w-2 rounded-full bg-pg-yellow" />
          {LABEL[aside.who]}
        </span>
        <span className="flex items-center gap-4">
          {aside.who === "archie" && archieBooked && tomInvited && (
            <button
              type="button"
              onClick={() => update({ aside: { who: "tom", route: "/invite/tom" } })}
              className="text-pg-yellow hover:underline"
            >
              Next: Tom&rsquo;s phone →
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
      <Device>
        <NavProvider nav={nav}>{screenFor(aside.route)}</NavProvider>
      </Device>
    </div>
  );
}
