"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useJourney } from "@/components/journey-provider";
import { AppHeader, AppShell, TotalFooter } from "@/components/ui/app-shell";
import { Avatar, Mark, Says } from "@/components/ui/avatar";
import { LockCard, LockScreen } from "@/components/ui/lock-screen";
import { AppIcon, Initials, PrimaryButton, Wordmark } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { SentenceBox } from "@/components/ui/sentence-box";
import { CheckoutScreen } from "./checkout-screen";
import { ConfirmationScreen } from "./confirmation-screen";
import { SentenceSection } from "./home-screen";
import { Ticket } from "./ticket";
import { countBySource, type TripDraft } from "@/lib/assistant/draft";
import { itineraryFor, nights } from "@/lib/assistant/itinerary";
import { breakdown, priceOf } from "@/lib/assistant/price";
import { PROFILES } from "@/lib/assistant/profiles";
import { AIRPORTS, formatFare } from "@/lib/journey/flights";
import { dateSpan, heroDraft, shortDate } from "@/lib/demo/hero";
import {
  FRIENDS,
  HOLD,
  buildInviteeDraft,
  firstName,
  friendByName,
  seatOffer,
  type SeatOffer,
} from "@/lib/group/group";

/**
 * The invitee's side: Sam's phone.
 *
 * Sam said nothing. A notification tells him Jack booked; opening it is a
 * ticket already built from Jack's flights and Sam's own history, with one
 * question the companion could not answer on its own: whether to pay for the
 * seat beside Jack. He pays only for himself and sees nothing of what Jack
 * paid.
 */
const SAM = FRIENDS[0]!;

function useInvitee() {
  const { state, update } = useJourney();
  const organiser = state.draft ?? heroDraft();
  const profile = PROFILES.find((p) => p.id === state.profileId) ?? PROFILES[0]!;
  const organiserNames = profile.travellers
    .filter((t) => t.kind !== "infant")
    .map((t) => t.name);
  const invitee = friendByName(state.invited[0] ?? SAM.name) ?? SAM;
  const base = buildInviteeDraft(organiser, invitee);
  const offer = seatOffer(organiser, organiserNames);
  const taken = state.invitee.seatTaken && offer !== null;
  const draft: TripDraft = taken
    ? {
        ...base,
        seating: { value: "aisle", source: "said", why: "You took the seat beside Jack." },
      }
    : base;
  const city =
    AIRPORTS[organiser.destination.value as keyof typeof AIRPORTS]?.city ??
    organiser.destination.value;
  const organiserFirst = firstName(organiserNames[0] ?? "Jack Field");
  return {
    state,
    update,
    organiser,
    organiserNames,
    organiserFirst,
    invitee,
    draft,
    offer,
    taken,
    city,
  };
}

/** The seat the offer adds, priced on top of the fare the pricer computed. */
function inviteeTotal(draft: TripDraft, offer: SeatOffer | null, taken: boolean): number {
  return (
    Math.round((priceOf(draft) + (taken && offer !== null ? offer.total : 0)) * 100) / 100
  );
}

function noticeText(
  organiserFirst: string,
  city: string,
  organiser: TripDraft,
  fare: number,
): { lead: string; rest: string } {
  const span =
    organiser.returnDate.value === null
      ? shortDate(organiser.departDate.value)
      : `${shortDate(organiser.departDate.value)} to ${shortDate(organiser.returnDate.value)}`;
  return {
    lead: `${organiserFirst} booked ${city} — ${span}.`,
    rest: ` A seat beside ${organiserFirst === "Jack" ? "him" : "them"} is held for you until ${HOLD.untilShort}. Your fare: ${formatFare(fare)} GBP.`,
  };
}

export function InviteeLockScreen() {
  const router = useRouter();
  const { organiser, organiserFirst, draft, city, invitee } = useInvitee();
  const [opened, setOpened] = useState(false);
  const notice = noticeText(organiserFirst, city, organiser, priceOf(draft));

  if (opened) {
    return (
      <AppShell
        bodyClassName="pt-2"
        header={<AppHeader user={invitee.name} />}
        overlay={
          <div className="absolute inset-x-2.5 top-2.5 z-40">
            <button
              type="button"
              onClick={() => router.push("/invite/ticket")}
              className="spring-up flex w-full items-start gap-3 rounded-[24px] bg-white/95 p-3.5 text-left text-pg-navy"
              style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.25)" }}
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
              </span>
              <Avatar size={44} className="mt-5" />
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-3">
          <Avatar size={120} />
          <span className="flex h-[26px] items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-bold tracking-[0.08em] shadow-[0_1px_2px_rgba(31,42,55,0.06)]">
            YOUR AI COMPANION
          </span>
          <h1 className="mt-1 text-[28px] leading-[34px] font-extrabold tracking-[-0.02em]">
            Good afternoon, {firstName(invitee.name)}
          </h1>
        </div>
        <div className="mt-5">
          <SentenceBox
            placeholder="Where are we going? Or tell me the whole trip at once."
            action="Plan it"
            onSubmit={() => router.push("/invite/ticket")}
          />
        </div>
        <p className="mt-4 px-1 text-[13px] leading-[18px] text-pg-ink">
          Just you · remembered from your past weekend away bookings
        </p>
      </AppShell>
    );
  }

  return (
    <LockScreen
      date={HOLD.bookedAt.split(",")[0] === "Mon 5 Oct" ? "Monday 5 October" : HOLD.bookedAt}
      time="14:20"
      bottom={150}
      onTap={() => setOpened(true)}
    >
      <button
        type="button"
        onClick={() => setOpened(true)}
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
          </span>
          <Avatar size={44} className="mt-5" />
        </LockCard>
      </button>
    </LockScreen>
  );
}

export function InviteeTicketScreen() {
  const router = useRouter();
  const { update, draft, offer, taken, organiserFirst, organiserNames, invitee } =
    useInvitee();
  const [sheet, setSheet] = useState(false);
  const counts = countBySource(draft, ["seating"]);
  const total = inviteeTotal(draft, offer, taken);
  const away = nights(draft);
  const [localDraft, setLocalDraft] = useState<TripDraft | null>(null);
  const shown = localDraft ?? draft;

  const offerRow =
    offer !== null && !taken ? (
      <button
        type="button"
        aria-label={`Open the seat offer: sit next to ${organiserFirst}`}
        onClick={() => setSheet(true)}
        className="pg-card mt-3 flex w-full items-center gap-3 py-3.5 pr-4 pl-3.5 text-left"
      >
        <span
          aria-hidden
          className="display flex h-11 w-10 shrink-0 items-center justify-center bg-pg-yellow text-[13px] font-extrabold"
          style={{ borderRadius: "11px 11px 8px 8px", boxShadow: "inset 0 -3px 0 #E5A70C" }}
        >
          {offer.seat}
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-[16px] leading-[22px] font-extrabold">
            Sit next to {organiserFirst}?
          </span>
          <span className="text-[13px] leading-[18px] text-pg-ink">
            {offer.seat} is free on both legs.
          </span>
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    ) : null;

  return (
    <AppShell
      header={<AppHeader user={invitee.name} withAvatar />}
      bodyClassName="pt-4 pb-7"
      footer={
        <TotalFooter
          line={`1 travelling${away === null ? "" : `, ${away} nights`}`}
          total={`${formatFare(total)} GBP`}
        >
          <PrimaryButton onClick={() => router.push("/invite/checkout")}>
            Checkout
          </PrimaryButton>
        </TotalFooter>
      }
      overlay={
        sheet && offer !== null ? (
          <SeatSheet
            offer={offer}
            organiserFirst={organiserFirst}
            names={organiserNames}
            onTake={() => {
              update((prev) => ({ invitee: { ...prev.invitee, seatTaken: true } }));
              setSheet(false);
            }}
            onClose={() => setSheet(false)}
          />
        ) : undefined
      }
    >
      <Says>
        {organiserFirst} booked this and asked me to build yours.{" "}
        <Mark>
          {counts.shared} things come from {organiserFirst === "Jack" ? "his" : "their"}{" "}
          booking, {counts.profile} from your own past trips, {counts.predicted} I worked out.
        </Mark>{" "}
        Tap any <span className="mine font-semibold">dotted value</span> to change it. You pay
        only for yourself.
      </Says>
      <Ticket
        draft={shown}
        onChange={setLocalDraft}
        names={[invitee.name]}
        owner={invitee.name}
        pending
        seatLabel={taken && offer !== null ? offer.seat : "Choose below"}
        seatDotted={!taken}
        onSeat={taken ? undefined : () => setSheet(true)}
        between={offerRow}
        extraLine={
          taken && offer !== null
            ? {
                label: `Seat ${offer.seat}`,
                detail: `${formatFare(offer.perLeg)} × 1 traveller × 2 legs, which you chose`,
                amount: offer.total,
              }
            : null
        }
        extraBreakdownNote={
          offer !== null && !taken ? (
            <p className="mt-3 text-[14px] leading-[21px] font-semibold">
              Becomes {formatFare(priceOf(shown) + offer.total)} if you take the seat.
            </p>
          ) : undefined
        }
      />
      {taken && offer !== null && (
        <SeatTaken seat={offer.seat} organiserFirst={organiserFirst} />
      )}
      <SentenceSection onSubmit={() => undefined} />
    </AppShell>
  );
}

function SeatTaken({ seat, organiserFirst }: { seat: string; organiserFirst: string }) {
  return (
    <p className="mt-3 px-1 text-[13px] leading-[18px] text-pg-ink">
      Seat {seat}, beside {organiserFirst}, is on your ticket. It stays dotted nowhere: you
      chose it.
    </p>
  );
}

/** The seat offer sheet: the row, who is in it, the price, and three honest exits. */
function SeatSheet({
  offer,
  organiserFirst,
  names,
  onTake,
  onClose,
}: {
  offer: SeatOffer;
  organiserFirst: string;
  names: string[];
  onTake: () => void;
  onClose: () => void;
}) {
  const letters = ["A", "B", "C", "D", "E", "F"];
  const byLetter = new Map(offer.neighbours.map((n) => [n.seat.slice(-1), n.name]));
  const you = offer.seat.slice(-1);
  return (
    <Sheet label={`Sit next to ${organiserFirst}?`} onClose={onClose} className="pb-[26px]">
      <h2 className="mt-[18px] text-[28px] leading-[34px] font-extrabold tracking-[-0.02em]">
        Sit next to {organiserFirst}?
      </h2>
      <div className="mt-4 flex flex-col items-center gap-3 rounded-[20px] bg-pg-surface px-3 pt-4 pb-3.5">
        <div className="flex items-start justify-center gap-1.5">
          {letters.map((letter, i) => {
            const name = byLetter.get(letter);
            const isYou = letter === you;
            const seat = (
              <div key={letter} className="flex w-[46px] flex-col items-center gap-1.5">
                <span
                  className={`display text-[12px] leading-[14px] font-extrabold ${
                    name !== undefined || isYou ? "text-pg-navy" : "text-pg-ink"
                  }`}
                >
                  {letter}
                </span>
                <span
                  className={`relative flex h-[54px] w-[46px] items-center justify-center text-[16px] font-extrabold ${
                    isYou
                      ? "bg-pg-yellow text-[14px] text-pg-navy"
                      : name !== undefined
                        ? "bg-pg-navy text-white"
                        : "bg-pg-surface shadow-[inset_0_0_0_1.5px_#E3E8EF]"
                  }`}
                  style={{
                    borderRadius: "13px 13px 9px 9px",
                    boxShadow: isYou ? "inset 0 -4px 0 #E5A70C" : undefined,
                  }}
                >
                  {isYou && (
                    <span
                      aria-hidden
                      className="seatpulse absolute -inset-[5px] border-2 border-pg-yellow"
                      style={{ borderRadius: "17px 17px 13px 13px" }}
                    />
                  )}
                  {isYou ? "You" : (name?.[0] ?? "")}
                </span>
                <span className="text-[12px] leading-4 font-semibold">
                  {name === undefined ? " " : firstName(name)}
                </span>
              </div>
            );
            if (i === 3) {
              return (
                <div key="aisle" className="contents">
                  <div
                    aria-hidden
                    className="flex w-[30px] flex-col items-center gap-0.5 pt-5"
                  >
                    <span className="caps" style={{ fontSize: 9.5 }}>
                      Row
                    </span>
                    <span className="display text-[18px] leading-5 font-extrabold">
                      {offer.row}
                    </span>
                  </div>
                  {seat}
                </div>
              );
            }
            return seat;
          })}
        </div>
        <p className="text-[14px] leading-5 font-semibold">
          {offer.seat} is free on both legs.
        </p>
      </div>
      <p className="tabular mt-4 text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
        {formatFare(offer.perLeg)} GBP per leg · {formatFare(offer.total)} total
      </p>
      <Says className="mt-3.5">
        You&rsquo;ve never paid for a seat and I didn&rsquo;t add this. It&rsquo;s the one time
        it&rsquo;s worth asking.
      </Says>
      <PrimaryButton size="lg" className="mt-[18px]" onClick={onTake}>
        Take {offer.seat} · +{formatFare(offer.total)} GBP
      </PrimaryButton>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 text-center text-[13.5px] leading-[18px] font-bold"
          style={{ textWrap: "balance" }}
        >
          Sit anywhere — free at check-in
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 border-l border-pg-line text-center text-[13.5px] leading-[18px] font-bold"
        >
          Pick a different seat
        </button>
      </div>
      <span className="sr-only">{names.join(", ")}</span>
    </Sheet>
  );
}

export function InviteeCheckout() {
  const { update, draft, offer, taken, invitee } = useInvitee();
  const seat = taken && offer !== null ? offer.seat : null;
  const priced: TripDraft = draft;
  return (
    <CheckoutScreen
      draft={priced}
      names={[invitee.name]}
      owner={invitee.name}
      seat={seat}
      extra={taken && offer !== null ? offer.total : 0}
      card={{ brand: "MASTERCARD", last4: "2210" }}
      backHref="/invite/ticket"
      nextHref="/invite/confirmation"
      onPay={() => update((prev) => ({ invitee: { ...prev.invitee, booked: true } }))}
    />
  );
}

export function InviteeConfirmation() {
  const { state, draft, offer, taken, invitee, organiserFirst } = useInvitee();
  const invited = state.invited.length > 0 ? state.invited : FRIENDS.map((f) => f.name);
  const others = invited.filter((n) => n !== invitee.name);
  const position = 2;
  const total = invited.length + 1;
  const names = ["Jack Field", invitee.name, ...others];
  return (
    <ConfirmationScreen
      draft={draft}
      owner={invitee.name}
      extra={taken && offer !== null ? offer.total : 0}
      says={
        <>
          {organiserFirst}&rsquo;s flight, your fare, your seat. You said nothing and changed{" "}
          {taken ? "one thing" : "nothing"}.
        </>
      }
    >
      {taken && offer !== null && (
        <div className="pg-card mt-5 flex items-center gap-3 px-4 py-3.5">
          <span
            aria-hidden
            className="display flex h-11 w-10 shrink-0 items-center justify-center bg-pg-yellow text-[13px] font-extrabold"
            style={{ borderRadius: "11px 11px 8px 8px", boxShadow: "inset 0 -3px 0 #E5A70C" }}
          >
            {offer.seat}
          </span>
          <span className="text-[15px] leading-[22px] font-bold">
            Seat {offer.seat} beside {organiserFirst}
          </span>
        </div>
      )}
      <div className="pg-card mt-3 flex flex-col gap-3 p-5">
        <div className="flex items-center">
          {names.map((n, i) => (
            <Initials
              key={n}
              name={n}
              size={36}
              tone={i < position ? "navy" : "surface"}
              className={`ring-[3px] ring-white ${i > 0 ? "-ml-2.5" : ""}`}
            />
          ))}
        </div>
        <p className="text-[15px] leading-[22px]" style={{ textWrap: "pretty" }}>
          You&rsquo;re the {ordinal(position)} of {total} booked.{" "}
          {others.length > 0 && (
            <>
              {others.map(firstName).join(" and ")}{" "}
              {others.length === 1 ? "hasn't" : "haven't"} yet — the hold ends{" "}
              {HOLD.untilShort}.
            </>
          )}
        </p>
      </div>
    </ConfirmationScreen>
  );
}

function ordinal(n: number): string {
  return ["", "1st", "2nd", "3rd", "4th", "5th"][n] ?? `${n}th`;
}

export function EmailScreen() {
  const { organiser, organiserFirst, city } = useInvitee();
  const tom = FRIENDS.find((f) => !f.account) ?? FRIENDS[2]!;
  const tomDraft = buildInviteeDraft(organiser, tom);
  const fare = priceOf(tomDraft);
  const itinerary = itineraryFor(organiser);
  const notice = noticeText(organiserFirst, city, organiser, fare);
  const lines = breakdown(tomDraft).lines;
  return (
    <div className="flex h-full flex-col overflow-hidden bg-pg-surface">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pt-[58px] pb-8">
        <div className="pg-card flex flex-col gap-4 p-6">
          <Wordmark size={22} />
          <p className="text-[17px] leading-[26px] font-semibold">Hi {firstName(tom.name)},</p>
          <p className="text-[15px] leading-[22px]" style={{ textWrap: "pretty" }}>
            <strong className="font-extrabold">{notice.lead}</strong>
            {notice.rest}
          </p>
          <div className="flex flex-col gap-3 rounded-[14px] bg-pg-surface p-4">
            {itinerary.out !== null && (
              <LegLine
                label={`Outbound · ${shortDate(itinerary.out.flight.date)}`}
                from={organiser.origin.value}
                to={organiser.destination.value}
                departs={itinerary.out.flight.departs}
                arrives={itinerary.out.flight.arrives}
                flight={itinerary.out.flight.flightNo}
              />
            )}
            {itinerary.back !== null && (
              <LegLine
                label={`Return · ${shortDate(itinerary.back.flight.date)}`}
                from={organiser.destination.value}
                to={organiser.origin.value}
                departs={itinerary.back.flight.departs}
                arrives={itinerary.back.flight.arrives}
                flight={itinerary.back.flight.flightNo}
              />
            )}
          </div>
          <p className="flex items-center gap-2 text-[14px] font-bold">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.5 2" />
            </svg>
            Held until {HOLD.until}
          </p>
          <PrimaryButton href="/invite/ticket" className="w-full">
            See my booking
          </PrimaryButton>
          <p className="text-[13px] leading-[18px] text-pg-ink" style={{ textWrap: "pretty" }}>
            Your booking is already built: {lines.map((l) => l.label.toLowerCase()).join(", ")}
            , {dateSpan(organiser.departDate.value, organiser.returnDate.value)}. You pay only
            for yourself.
          </p>
          <p className="border-t border-pg-line pt-4 text-[12px] leading-[18px] text-pg-ink">
            Nothing is booked and no payment is taken. This is a mock built for the Pegasus ×
            Berkeley Haas AI Travel Companion Hackathon.
          </p>
        </div>
      </div>
    </div>
  );
}

function LegLine({
  label,
  from,
  to,
  departs,
  arrives,
  flight,
}: {
  label: string;
  from: string;
  to: string;
  departs: string;
  arrives: string;
  flight: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="caps">{label}</span>
      <span className="flex items-baseline gap-2 text-[15px] font-bold">
        <span className="display text-[18px] font-extrabold">{from}</span>
        <span className="tabular">{departs}</span>
        <span className="text-pg-ink">{flight}</span>
        <span className="display ml-auto text-[18px] font-extrabold">{to}</span>
        <span className="tabular">{arrives}</span>
      </span>
    </div>
  );
}
