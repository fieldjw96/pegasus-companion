"use client";

import { useState, type ReactNode } from "react";
import { useNav } from "@/components/phone-nav";
import { Thinking, useAgentRun } from "@/components/agent-provider";
import { useJourney } from "@/components/journey-provider";
import { traceFor } from "@/lib/agent/trace";
import { AppHeader, AppShell, StatusBar, TotalFooter } from "@/components/ui/app-shell";
import { Avatar, type AvatarMood } from "@/components/ui/avatar";
import { LockCard, LockScreen } from "@/components/ui/lock-screen";
import {
  AppIcon,
  Initials,
  PrimaryButton,
  SecondaryButton,
  Wordmark,
} from "@/components/ui/primitives";
import { CheckoutScreen } from "./checkout-screen";
import { ConfirmationScreen } from "./confirmation-screen";
import { SeatSheet } from "./seat-sheet";
import { Ticket, cityOf } from "./ticket";
import type { ExtraRow } from "./change-panel";
import { countBySource, type TripDraft } from "@/lib/assistant/draft";
import { itineraryFor, nights } from "@/lib/assistant/itinerary";
import { breakdown, withLines } from "@/lib/assistant/price";
import { formatFare } from "@/lib/journey/flights";
import { SQUAD } from "@/lib/journey/script";
import { dateSpan, shortDate, WILL, willDraft } from "@/lib/demo/personas";
import {
  INVITE,
  FRIENDS,
  buildInviteeDraft,
  firstName,
  friendByName,
  inviteeExtras,
  seatBeside,
  type Friend,
} from "@/lib/group/group";

/**
 * The invitee's side: Archie's phone, then Jess's.
 *
 * Neither said anything. Archie has the app, so a push in Will's name opens a
 * booking already built: the flights from Will, the fare and seat predicted,
 * the passport, payment and his usual hot meal remembered. He checks and pays.
 * Jess has no app, so a WhatsApp from Will opens the same booking on the web
 * and brings her into the app. When she stalls, the companion finishes the
 * booking up to the pay button and nudges her in Will's name.
 */
export type FriendId = "archie" | "jess";

function useInvitee(id: FriendId) {
  const { state, update } = useJourney();
  const organiser = state.draft ?? willDraft();
  const me = WILL.travellers[0]?.name ?? "Will Parker";
  const friend: Friend =
    friendByName(id === "archie" ? "Archie Bell" : "Jess Carter") ?? FRIENDS[0]!;
  const draft = buildInviteeDraft(organiser, friend, me);
  const seat = seatBeside(organiser, friend, me);
  const extras = inviteeExtras(organiser, friend, me);
  const booked = friend.name in state.inviteesBooked;
  const city = cityOf(organiser.destination.value);
  const itinerary = itineraryFor(organiser, me);
  return {
    state,
    update,
    organiser,
    me,
    friend,
    draft,
    seat,
    extras,
    booked,
    city,
    itinerary,
  };
}

/** An invitee pays: the seat is taken, and the invite list is settled if it wasn't. */
function bookInvitee(
  update: ReturnType<typeof useJourney>["update"],
  friend: Friend,
  seat: string | null,
): void {
  update((prev) => ({
    inviteesBooked: { ...prev.inviteesBooked, [friend.name]: seat },
    invited: prev.invited.length > 0 ? prev.invited : FRIENDS.map((f) => f.name),
  }));
}

function noticeText(me: string, city: string, organiser: TripDraft, seat: string | null) {
  return {
    lead: `${firstName(me)}'s booked ${city}.`,
    rest: ` ${seat ?? "A seat"} next to ${firstName(me) === "Will" ? "him" : "them"} is free. Your booking's ready.`,
    span: dateSpan(organiser.departDate.value, organiser.returnDate.value),
  };
}

/** Archie's lock screen: a push in Will's name. */
export function ArchiePushScreen() {
  const router = useNav();
  const { me, city, organiser, seat, state } = useInvitee("archie");
  const notice = noticeText(me, city, organiser, seat);
  const ready = useAgentRun("invite:archie:arrive", () => traceFor("/invite/archie", state));
  return (
    <LockScreen
      date={INVITE.sentLong}
      time="18:42"
      bottom={150}
      onTap={() => router.push("/invite/archie/ticket")}
    >
      {ready && (
        <button
          type="button"
          onClick={() => router.push("/invite/archie/ticket")}
          className="w-full text-left"
          aria-label="Open the notification"
        >
          <LockCard
            label="Notification from Pegasus"
            radius={24}
            className="!flex-row items-start gap-3 bg-white/95 !p-3.5"
          >
            <AppIcon size={38} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] leading-[18px] font-extrabold tracking-[0.04em]">
                  PEGASUS
                </span>
                <span className="text-[13px] leading-[18px] text-pg-ink">now</span>
              </span>
              <span className="text-[15px] leading-5" style={{ textWrap: "pretty" }}>
                <strong className="font-extrabold">{notice.lead}</strong>
                {notice.rest}
              </span>
              <span className="mt-2 text-[14px] font-extrabold text-pg-orange">
                Book in one tap
              </span>
            </span>
          </LockCard>
        </button>
      )}
    </LockScreen>
  );
}

/** Jess's WhatsApp: an invite from Will that opens the trip, pre-filled. */
export function JessWhatsAppScreen() {
  const router = useNav();
  const { me, city, organiser, seat, state } = useInvitee("jess");
  const span = dateSpan(organiser.departDate.value, organiser.returnDate.value);
  const ready = useAgentRun("invite:jess:arrive", () => traceFor("/invite/jess", state));
  return (
    <WhatsAppChat me={me}>
      <DayDivider>{INVITE.sentLong}</DayDivider>
      {ready && (
        <InviteBubble
          me={me}
          city={city}
          span={span}
          seat={seat}
          onTap={() => router.push("/invite/jess/signup")}
        />
      )}
      <p className="mt-6 px-1 text-center text-[12px] leading-[18px] text-pg-ink">
        Opens the app on a sign-up with nothing to type, then the booking. A new direct
        customer Pegasus didn&rsquo;t have.
      </p>
    </WhatsAppChat>
  );
}

/**
 * Jess's first screen in the app: a sign-up with nothing to type. The invite
 * link carries who she is, so the account is one tap and the form is skipped.
 * The booking, already built from Will's, is the reason to join; it is the
 * next screen, not a reward after a form.
 */
export function JessSignUpScreen() {
  const router = useNav();
  const { me, friend, city, state } = useInvitee("jess");
  const ready = useAgentRun("invite:jess:signup", () =>
    traceFor("/invite/jess/signup", state),
  );
  if (!ready) return <Thinking label="Opening your invite…" header={null} />;
  const join = () => router.push("/invite/jess/ticket");
  return (
    <div className="flex h-full flex-col bg-pg-surface text-pg-navy">
      <StatusBar />
      <main className="flex min-h-0 flex-1 flex-col items-center px-6 pt-5 pb-6 text-center">
        <Wordmark size={24} />
        <Avatar size={96} className="mt-9" />
        <h1
          className="mt-5 text-[26px] leading-8 font-extrabold tracking-[-0.02em]"
          style={{ textWrap: "balance" }}
        >
          {firstName(me)} saved you a seat
        </h1>
        <p
          className="mt-2 text-[15px] leading-[22px] text-pg-ink"
          style={{ textWrap: "pretty" }}
        >
          Join Pegasus to see your booking for {city}. Nothing to type: the invite knows who
          you are.
        </p>
        <div className="pg-card mt-6 flex w-full items-center gap-3 p-4 text-left">
          <Initials name={friend.name} size={40} />
          <span className="flex min-w-0 flex-col">
            <span className="caps">Joining as</span>
            <span className="text-[16px] leading-5 font-extrabold">{friend.name}</span>
            <span className="text-[13px] leading-[18px] text-pg-ink">
              From {firstName(me)}&rsquo;s invite · the number he messaged
            </span>
          </span>
        </div>
        <div className="mt-auto flex w-full flex-col gap-2.5 pt-6">
          <PrimaryButton size="lg" onClick={join}>
            Continue with Apple
          </PrimaryButton>
          <SecondaryButton onClick={join}>Use my email instead</SecondaryButton>
          <p className="mt-1 text-[12px] leading-[18px] text-pg-ink">
            One tap makes the account. Passport at check-in, card when you pay.
          </p>
        </div>
      </main>
    </div>
  );
}

/** The WhatsApp chrome: Will's chat, as Jess sees it. */
function WhatsAppChat({ me, children }: { me: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-[#EFE7DD] text-pg-navy">
      <div className="flex shrink-0 items-center gap-3 bg-[#075E54] px-4 pt-12 pb-3 text-white">
        <span className="text-[22px]" aria-hidden>
          ‹
        </span>
        <Initials name={me} size={36} tone="surface" />
        <span className="flex flex-col">
          <span className="text-[16px] leading-5 font-bold">{firstName(me)}</span>
          <span className="text-[12px] leading-4 opacity-80">online</span>
        </span>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-6">{children}</div>
      <div className="flex shrink-0 items-center gap-2 px-3 pt-2 pb-8">
        <span className="h-10 flex-1 rounded-full bg-white px-4 text-[15px] leading-10 text-pg-ink">
          Message
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#075E54] text-white">
          🎙
        </span>
      </div>
    </div>
  );
}

function DayDivider({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto mb-4 w-fit rounded-md bg-white/70 px-3 py-1 text-[12px] font-semibold text-pg-ink">
      {children}
    </div>
  );
}

/** A message from Will with a Pegasus card in it: the card is the link. */
function CardBubble({
  title,
  detail,
  cta,
  text,
  time,
  onTap,
}: {
  title: string;
  detail: string;
  cta: string;
  text: ReactNode;
  time: string;
  onTap: () => void;
}) {
  return (
    <div className="rise max-w-[300px] rounded-2xl rounded-tl-sm bg-white p-1.5 shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
      <button
        type="button"
        onClick={onTap}
        className="block w-full overflow-hidden rounded-xl bg-pg-surface text-left"
      >
        <span className="flex items-center gap-2 bg-pg-yellow px-3 py-2">
          <AppIcon size={22} />
          <span className="text-[12px] font-extrabold tracking-[0.06em]">PEGASUS</span>
        </span>
        <span className="flex flex-col gap-0.5 px-3 py-2.5">
          <span className="text-[15px] leading-5 font-extrabold">{title}</span>
          <span className="text-[13px] leading-[18px] text-pg-ink">{detail}</span>
          <span className="mt-1 text-[13px] font-extrabold text-pg-orange">{cta}</span>
        </span>
      </button>
      <p className="px-2 pt-2 pb-1 text-[15px] leading-5">{text}</p>
      <span className="block pr-2 pb-1 text-right text-[11px] text-pg-ink">{time}</span>
    </div>
  );
}

function InviteBubble({
  me,
  city,
  span,
  seat,
  onTap,
}: {
  me: string;
  city: string;
  span: string;
  seat: string | null;
  onTap: () => void;
}) {
  const him = firstName(me) === "Will" ? "him" : "them";
  return (
    <CardBubble
      title={`${firstName(me)} invited you to ${city} ✈︎`}
      detail={`${span} · seat ${seat} saved next to ${him}`}
      cta={`Join ${firstName(me)}'s trip on Pegasus`}
      text={<>Booked it! Seat next to mine&rsquo;s free if you&rsquo;re quick 🎈</>}
      time="18:51"
      onTap={onTap}
    />
  );
}

export function InviteeTicketScreen({ id }: { id: FriendId }) {
  const router = useNav();
  const { me, friend, draft, seat, extras, itinerary, state, update } = useInvitee(id);
  const [local, setLocal] = useState<TripDraft | null>(null);
  const [sheet, setSheet] = useState(false);
  const shown = local ?? draft;
  const counts = countBySource(shown);
  counts.profile += extraRowsFor(friend).length;
  const price = withLines(breakdown(shown), extras);
  const away = nights(shown);
  const first = firstName(me);
  const ready = useAgentRun(`invite:${id}:ticket`, () =>
    traceFor(`/invite/${id}/ticket`, state),
  );

  if (!ready) {
    return (
      <Thinking
        label={`Building your booking from ${first}'s…`}
        header={<AppHeader user={friend.name} withAvatar />}
      />
    );
  }

  return (
    <AppShell
      header={<AppHeader user={friend.name} withAvatar />}
      bodyClassName="pt-4 pb-7"
      footer={
        <TotalFooter
          line={`1 travelling${away === null ? "" : `, ${away} nights`}`}
          total={`${formatFare(price.total)} GBP`}
        >
          <PrimaryButton
            onClick={() => {
              // Jess has nothing on file to check, so the tap is the booking.
              // Archie's checkout is the receipt of what was remembered for him.
              if (id === "jess") {
                bookInvitee(update, friend, seat);
                router.push(`/invite/${id}/confirmation`);
              } else {
                router.push(`/invite/${id}/checkout`);
              }
            }}
          >
            {id === "jess"
              ? `Book and pay · ${formatFare(price.total)} GBP`
              : "Book in one tap"}
          </PrimaryButton>
        </TotalFooter>
      }
      overlay={
        sheet && seat !== null ? (
          <SeatSheet
            title={`Sit next to ${first}?`}
            row={SQUAD.row}
            seats={[
              { letter: "A", name: me },
              {
                letter: "B",
                name: id === "archie" ? friend.name : (FRIENDS[0]?.name ?? null),
                held: id !== "archie",
              },
              {
                letter: "C",
                name: id === "jess" ? friend.name : (FRIENDS[1]?.name ?? null),
                held: id !== "jess",
              },
              { letter: "D", name: null },
              { letter: "E", name: null },
              { letter: "F", name: null },
            ]}
            you={seat.slice(-1)}
            perLeg={SQUAD.seatPricePerLeg}
            legs={itinerary.legs.length}
            included={shown.seating.value !== "none"}
            says={`${first} is in ${itinerary.out?.seats[0] ?? "14A"}. ${seat} is free on every leg; it's the one time it's worth paying for a seat.`}
            cta={
              shown.seating.value === "none"
                ? `Take ${seat} · +${formatFare(SQUAD.seatPricePerLeg * itinerary.legs.length)} GBP`
                : `Keep ${seat}`
            }
            onTake={() => {
              setLocal({
                ...shown,
                seating: { value: "window", source: "said", why: `You took ${seat}.` },
              });
              setSheet(false);
            }}
            onAnywhere={() => {
              setLocal({
                ...shown,
                seating: { value: "none", source: "said", why: "You'll sit anywhere." },
              });
              setSheet(false);
            }}
            onClose={() => setSheet(false)}
          />
        ) : undefined
      }
    >
      <Ticket
        draft={shown}
        onChange={setLocal}
        names={[friend.name]}
        owner={friend.name}
        pending
        seatLabel={shown.seating.value === "none" ? "At check-in" : (seat ?? undefined)}
        seatDotted={shown.seating.source !== "said"}
        onSeat={() => setSheet(true)}
        extraLines={extras}
        extraRows={extraRowsFor(friend)}
        compact
      />
    </AppShell>
  );
}

function extraRowsFor(friend: Friend): ExtraRow[] {
  if (friend.remembered === null) return [];
  return [
    { label: "Passport", source: "profile", value: friend.remembered.passport },
    { label: "Payment", source: "profile", value: friend.remembered.payment },
    ...(friend.remembered.meal
      ? [
          {
            label: "Meal",
            source: "profile" as const,
            value: friend.remembered.meal,
            reason: "Already in the basket, as on your last bookings.",
          },
        ]
      : []),
  ];
}

export function InviteeCheckout({ id }: { id: FriendId }) {
  const { update, draft, seat, extras, friend, state } = useInvitee(id);
  return (
    <CheckoutScreen
      thinking={{
        key: `invite:${id}:checkout`,
        trace: () => traceFor(`/invite/${id}/checkout`, state),
        label:
          friend.remembered === null
            ? "Nothing on file. Keeping the seat…"
            : "Filling the form…",
      }}
      draft={draft}
      names={[friend.name]}
      owner={friend.name}
      seat={seat}
      extraLines={extras}
      onFile={
        friend.remembered === null
          ? {
              passport: "Add at check-in",
              from: "Nothing on file",
              payment: "Card ending 3309",
            }
          : {
              passport: friend.remembered.passport,
              from: "From your profile",
              payment: friend.remembered.payment,
            }
      }
      backHref={`/invite/${id}/ticket`}
      nextHref={`/invite/${id}/confirmation`}
      cta="Book"
      onPay={() => bookInvitee(update, friend, seat)}
    />
  );
}

export function InviteeConfirmation({ id }: { id: FriendId }) {
  const { state, draft, seat, extras, friend, me, itinerary } = useInvitee(id);
  const invited = state.invited.length > 0 ? state.invited : FRIENDS.map((f) => f.name);
  const bookedNames = [
    me,
    ...invited.filter((n) => n in state.inviteesBooked || n === friend.name),
  ];
  const total = invited.length + 1;
  const position = bookedNames.length;
  const complete = position === total;
  const everyone = [me, ...invited];

  return (
    <ConfirmationScreen
      draft={draft}
      owner={friend.name}
      extraLines={extras}
      thinking={{
        key: `invite:${id}:confirmation:${position}`,
        trace: () => traceFor(`/invite/${id}/confirmation`, state),
        label: "Booking, and telling the squad…",
      }}
      says={
        <>
          {firstName(me)}&rsquo;s flights, your fare, your seat. You said nothing and changed
          nothing.
        </>
      }
    >
      <div className="pg-card mt-5 flex flex-col gap-3 p-5">
        <div className="flex items-center">
          {everyone.map((n, i) => (
            <Initials
              key={n}
              name={n}
              size={36}
              tone={bookedNames.includes(n) ? "navy" : "surface"}
              className={`ring-[3px] ring-white ${i > 0 ? "-ml-2.5" : ""}`}
            />
          ))}
        </div>
        {complete ? (
          <>
            <p className="text-[16px] leading-[22px] font-extrabold">All {total} booked 🎉</p>
            <p className="text-[15px] leading-[22px]" style={{ textWrap: "pretty" }}>
              {everyone
                .map(
                  (n) =>
                    state.inviteesBooked[n] ??
                    (n === friend.name ? seat : itinerary.out?.seats[0]),
                )
                .filter(Boolean)
                .join(" · ")}
              , together.
            </p>
            <p className="text-[14px] leading-5 text-pg-ink">
              {firstName(me)} gets one offer for the three of you. Nothing more lands here.
            </p>
          </>
        ) : (
          <p className="text-[15px] leading-[22px]" style={{ textWrap: "pretty" }}>
            You&rsquo;re the {ordinal(position)} of {total} booked.{" "}
            {invited
              .filter((n) => !bookedNames.includes(n))
              .map(firstName)
              .join(" and ")}{" "}
            {total - position === 1 ? "hasn't" : "haven't"} yet.
          </p>
        )}
      </div>
      <p className="mt-3 px-1 text-[12px] leading-[18px] text-pg-ink">
        {firstName(me)} sees that you booked and your seat. Not what you paid.{" "}
        {shortDate(draft.departDate.value)}: see you at the gate.
      </p>
    </ConfirmationScreen>
  );
}

function ordinal(n: number): string {
  return ["", "1st", "2nd", "3rd", "4th", "5th"][n] ?? `${n}th`;
}

/** Jess stalls: a second WhatsApp from Will, drafted by the companion. The card opens the app. */
export function JessStallsScreen() {
  const router = useNav();
  const { me, city, organiser, state, itinerary, seat } = useInvitee("jess");
  const archie = firstName(FRIENDS[0]?.name ?? "Archie");
  const span = dateSpan(organiser.departDate.value, organiser.returnDate.value);
  const left = itinerary.out?.flight.seatsLeft ?? 9;
  const departs = itinerary.out?.flight.departs ?? "06:10";
  const ready = useAgentRun("invite:jess:stalls", () =>
    traceFor("/invite/jess/stalls", state),
  );
  // The card is the way in: the app opens on the sign-up, then her ticket.
  const open = () => router.push("/invite/jess/signup");
  return (
    <WhatsAppChat me={me}>
      <DayDivider>{INVITE.sentLong}</DayDivider>
      <InviteBubble me={me} city={city} span={span} seat={seat} onTap={open} />
      <div className="mt-5">
        <DayDivider>Thursday 5 March</DayDivider>
      </div>
      {ready && (
        <CardBubble
          title={`Book the same flight as ${firstName(me)}`}
          detail={`${span} · ${seat ?? "a seat"} still next to ${firstName(me) === "Will" ? "him" : "them"} · ${left} seats left on the ${departs}`}
          cta="Get Pegasus and book the same flight"
          text={
            <>
              {archie}&rsquo;s in. Just you now mate. The {departs}&rsquo;s down to {left}{" "}
              seats, grab {seat ?? "the seat"} before it goes 👀
            </>
          }
          time="09:15"
          onTap={open}
        />
      )}
      {ready && (
        <p className="mt-6 px-1 text-center text-[12px] leading-[18px] text-pg-ink">
          Drafted by the companion, sent from {firstName(me)}&rsquo;s phone with one tap. The
          link installs the app: one tap to join, then her booking, one tap to pay.
        </p>
      )}
    </WhatsAppChat>
  );
}

export function Notice({
  lead,
  rest,
  when = "now",
  onTap,
  from = "PEGASUS",
  mood,
}: {
  lead: string;
  rest: string;
  when?: string;
  onTap?: () => void;
  from?: string;
  /** The companion's face instead of the app icon, when the news is its own. */
  mood?: AvatarMood;
}) {
  const body = (
    <LockCard
      label={`Notification from ${from}`}
      radius={24}
      className="!flex-row items-start gap-3 bg-white/95 !p-3.5"
    >
      {mood === undefined ? <AppIcon size={38} /> : <Avatar size={38} mood={mood} />}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] leading-[18px] font-extrabold tracking-[0.04em]">
            {from}
          </span>
          <span className="text-[13px] leading-[18px] text-pg-ink">{when}</span>
        </span>
        <span className="text-[15px] leading-5" style={{ textWrap: "pretty" }}>
          <strong className="font-extrabold">{lead}</strong>
          {rest}
        </span>
      </span>
    </LockCard>
  );
  if (onTap === undefined) return body;
  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full text-left"
      aria-label="Open the notification"
    >
      {body}
    </button>
  );
}
