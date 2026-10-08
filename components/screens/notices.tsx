"use client";

import { useEffect } from "react";
import { useNav } from "@/components/phone-nav";
import { useAgentRun } from "@/components/agent-provider";
import { useJourney } from "@/components/journey-provider";
import { LockCard, LockScreen } from "@/components/ui/lock-screen";
import { Avatar } from "@/components/ui/avatar";
import { AppIcon, Initials, PrimaryButton } from "@/components/ui/primitives";
import { Notice } from "./invitee";
import { traceFor } from "@/lib/agent/trace";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { formatFare, inventory } from "@/lib/journey/flights";
import { HOSTEL, SQUAD } from "@/lib/journey/script";
import { FRIENDS, INVITE, firstName, listNames } from "@/lib/group/group";
import { fareDrop } from "@/lib/group/next-trip";
import { stayFor } from "@/lib/group/stay";
import type { TripDraft } from "@/lib/assistant/draft";
import { WILL, dayMonth, longDate, shift, willDraft } from "@/lib/demo/personas";
import { cityOf } from "./ticket";

/**
 * The Moments agent's lock screens: the companion picking the moment and the
 * channel. None of these is a feature in the app; each is a message that
 * arrives when it matters and says the one thing worth saying.
 */

/** The waiting window: who's booked, and an extra for the ones who have. */
export function WaitingWindowScreen() {
  const { state } = useJourney();
  const draft = state.draft ?? willDraft();
  const me = WILL.travellers[0]?.name ?? "Will";
  const invited = state.invited.length > 0 ? state.invited : FRIENDS.map((f) => f.name);
  const everyone = [me, ...invited];
  const booked = everyone.filter(
    (n) => n === me || n in state.inviteesBooked || n === FRIENDS[0]?.name,
  );
  const city = cityOf(draft.destination.value);
  const last = draft.stops.value[draft.stops.value.length - 1];
  const ready = useAgentRun(`squad:waiting:${booked.length}`, () =>
    traceFor("/squad/waiting", state),
  );
  return (
    <LockScreen date="Wednesday 4 March" time="20:14" bottom={120}>
      {ready && (
        <div className="flex flex-col gap-2.5">
          <LockCard label="Pegasus Live Activity">
            <div className="flex items-center gap-2">
              <AppIcon />
              <span className="text-[12px] leading-4 font-extrabold tracking-[0.06em]">
                PEGASUS · LIVE
              </span>
            </div>
            <p className="mt-3 text-[17px] leading-[22px] font-extrabold">
              {city} squad: {booked.length} of {everyone.length} booked
            </p>
            <div className="mt-2.5 h-2 overflow-hidden rounded bg-pg-line">
              <span
                className="block h-full rounded bg-pg-yellow"
                style={{ width: `${(booked.length / everyone.length) * 100}%` }}
              />
            </div>
            <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] leading-5 font-semibold">
              {everyone.map((n) => (
                <span key={n} className="flex items-center gap-1">
                  {firstName(n)} {booked.includes(n) ? "✓" : "…"}
                </span>
              ))}
            </p>
          </LockCard>
          <Notice
            lead={`${firstName(FRIENDS[0]?.name ?? "Archie")}, bringing souvenirs home?`}
            rest={` Add 10 kg to the ${last === undefined ? "last" : cityOf(last.code)} leg now, cheaper than at the airport.`}
            when="12m ago"
          />
        </div>
      )}
    </LockScreen>
  );
}

/** Just before check-in opens: the last chance to sit together, then everyone checked in. */
export function CheckInScreen() {
  const { state } = useJourney();
  const draft = state.draft ?? willDraft();
  const jess = FRIENDS[1]?.name ?? "Jess Carter";
  const seat = "14C";
  // Whether Jess took the seat next to Will when she booked. If not, this is the
  // last chance to put him there before check-in seats him at random.
  const jessSeated = (state.inviteesBooked[jess] ?? null) !== null;
  const ready = useAgentRun(`squad:check-in:${jessSeated}`, () =>
    traceFor("/squad/check-in", state),
  );
  return (
    <LockScreen date={longDate(shift(draft.departDate.value, -2))} time="05:30" bottom={120}>
      {ready && (
        <div className="flex flex-col gap-2.5">
          <Notice
            lead="Check-in opens tomorrow."
            rest={
              jessSeated
                ? " You're sat together: 14A, 14B and 14C. I'll check all three of you in the moment it opens."
                : ` ${firstName(jess)} hasn't got a seat yet, so ${FRIENDS[1]?.pronoun.subject ?? "she"}'ll be placed randomly. Move ${FRIENDS[1]?.pronoun.object ?? "her"} to ${seat} next to you?`
            }
          />
          <Notice
            lead="You're all checked in ✓"
            rest=" Boarding passes are in the app."
            when="Tomorrow, 05:31"
          />
        </div>
      )}
    </LockScreen>
  );
}

/** The 06:10 is cancelled. The whole squad is rebooked together before anyone queues. */
/**
 * The evening after the squad is complete: three flights, three people and no
 * bed. One hostel for the balloon nights, priced for three from the nights on
 * the ticket. Booked for all of them in one tap, or declined for this trip and
 * never mentioned again.
 */
export function HostelScreen() {
  const { state, update } = useJourney();
  const draft = state.draft ?? willDraft();
  const stay = stayFor(draft);
  const mates = FRIENDS.map((f) => firstName(f.name));
  const ready = useAgentRun(`squad:hostel:${state.hostel ?? "offered"}`, () =>
    traceFor("/squad/hostel", state),
  );
  return (
    <LockScreen date="Friday 6 March" time="19:40" bottom={150}>
      {ready && (
        <LockCard label="Notification from Pegasus" radius={24} className="bg-white/95 !p-3.5">
          <div className="flex items-start gap-3">
            <Avatar size={38} mood={state.hostel === "booked" ? "wink" : "idle"} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] leading-[18px] font-extrabold tracking-[0.04em]">
                  PEGASUS
                </span>
                <span className="text-[13px] leading-[18px] text-pg-ink">now</span>
              </span>
              {state.hostel === "booked" ? (
                <span className="text-[15px] leading-5" style={{ textWrap: "pretty" }}>
                  <strong className="font-extrabold">Booked for the three of you.</strong>{" "}
                  {stay.name}, {stay.nights} nights from {dayMonth(stopStart(draft))}.{" "}
                  {mates.join(" and ")} have the details.
                </span>
              ) : state.hostel === "declined" ? (
                <span className="text-[15px] leading-5" style={{ textWrap: "pretty" }}>
                  <strong className="font-extrabold">Not this trip.</strong> No stay mentioned
                  again.
                </span>
              ) : (
                <>
                  <span className="text-[15px] leading-5" style={{ textWrap: "pretty" }}>
                    <strong className="font-extrabold">Looking to book a hostel?</strong>{" "}
                    Nothing&rsquo;s booked for the {stay.nights} nights in {stay.town}.
                  </span>
                  <span className="mt-2 flex flex-col gap-0.5 rounded-[12px] bg-pg-surface px-3 py-2.5">
                    <span className="text-[15px] leading-5 font-extrabold">{stay.name}</span>
                    <span className="text-[13px] leading-[18px] text-pg-ink">
                      {stay.room} · {stay.town}, by the balloon pick-up
                    </span>
                    <span className="tabular mt-1 text-[14px] leading-5">
                      <strong className="font-extrabold">
                        {formatFare(stay.perNight)} a night
                      </strong>{" "}
                      each · {formatFare(stay.each)} for {stay.nights} nights
                    </span>
                  </span>
                  <PrimaryButton
                    size="sm"
                    className="mt-2.5 w-full"
                    onClick={() => update({ hostel: "booked" })}
                  >
                    Book for three · {formatFare(stay.total)} GBP
                  </PrimaryButton>
                  <button
                    type="button"
                    onClick={() => update({ hostel: "declined" })}
                    className="mt-1.5 self-start text-[13px] font-bold text-pg-orange"
                  >
                    Not this trip
                  </button>
                </>
              )}
            </span>
          </div>
        </LockCard>
      )}
    </LockScreen>
  );
}

/** The date the balloons stop begins: the outbound date plus the nights before it. */
function stopStart(draft: TripDraft): string {
  let days = 0;
  for (const stop of draft.stops.value) {
    if (stop.code === HOSTEL.stop) break;
    days += stop.nights;
  }
  return shift(draft.departDate.value, days);
}

export function SquadCancelledScreen() {
  const { state, update } = useJourney();
  const draft = state.draft ?? willDraft();
  const itinerary = itineraryFor(draft, WILL.travellers[0]?.name);
  const first = itinerary.out;
  const ready = useAgentRun("squad:cancelled", () => traceFor("/squad/cancelled", state));
  // Mum is told the same second, if Will asked for that: her phone appears beside his.
  const mumTold = state.mumTold;
  useEffect(() => {
    if (ready && mumTold) update({ aside: { who: "mum", route: "/follow/mum/cancelled" } });
  }, [ready, mumTold, update]);
  return (
    <LockScreen date={longDate(draft.departDate.value)} time="04:50" bottom={150}>
      {ready && (
        <Notice
          mood="sad"
          lead={`${first?.flight.departs ?? "06:10"} cancelled.`}
          rest={` All 3 of you are on the 13:30, seats 21A–C together. Archie and Jess have been told the same second${state.mumTold ? ", and Mum" : ""}.`}
        />
      )}
    </LockScreen>
  );
}

/** After the week: fares to somewhere else in Turkey drop, and the squad hears first. */
export function NextTripScreen() {
  const router = useNav();
  const { state } = useJourney();
  const draft = state.draft ?? willDraft();
  const mates = FRIENDS.map((f) => firstName(f.name));
  const drop = fareDrop(draft, 1 + FRIENDS.length);
  const ready = useAgentRun("squad:next-trip", () => traceFor("/squad/next-trip", state));
  return (
    <LockScreen date={longDate(drop.when)} time="19:20" bottom={150}>
      {ready && (
        <LockCard label="For the squad">
          <div className="flex items-center gap-2">
            <Avatar size={22} />
            <span className="text-[12px] leading-4 font-extrabold tracking-[0.06em]">
              PEGASUS · FOR THE THREE OF YOU
            </span>
          </div>
          <p className="mt-3 text-[13px] font-bold tracking-[0.04em] text-pg-ink">
            FARES DOWN {drop.dropPercent}% · {drop.city.toUpperCase()}
          </p>
          <p className="mt-1 text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
            Same three, {drop.city} in {monthName(drop.out)}?
          </p>
          <p className="mt-2 text-[14px] leading-5" style={{ textWrap: "pretty" }}>
            {dayMonth(drop.out)} to {dayMonth(drop.back)}, {drop.nights} nights.{" "}
            <strong className="tabular font-extrabold">{formatFare(drop.nowEach)} each</strong>{" "}
            return, down from {formatFare(drop.wasEach)} last week:{" "}
            <strong className="tabular font-extrabold">
              {formatFare(drop.savingSquad)} GBP
            </strong>{" "}
            less for the three of you.
          </p>
          <div className="mt-3 flex items-center">
            {[WILL.travellers[0]?.name ?? "Will", ...FRIENDS.map((f) => f.name)].map(
              (n, i) => (
                <Initials
                  key={n}
                  name={n}
                  size={30}
                  className={`ring-2 ring-white ${i > 0 ? "-ml-2" : ""}`}
                />
              ),
            )}
          </div>
          <PrimaryButton className="mt-3.5 w-full" onClick={() => router.push("/group")}>
            Ask {mates.join(" and ")}
          </PrimaryButton>
        </LockCard>
      )}
    </LockScreen>
  );
}

function monthName(iso: string): string {
  const names = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return names[Number(iso.slice(5, 7)) - 1] ?? "";
}

/**
 * Mum's phone. Will said keep her posted, so she gets the flight and the
 * landing time, a follow link and STOP in the same message. If the flight
 * moves she hears the same second Will does.
 */
export function MumFollowsScreen({ cancelled = false }: { cancelled?: boolean }) {
  const router = useNav();
  const { state } = useJourney();
  const draft = state.draft ?? willDraft();
  const me = WILL.travellers[0]?.name ?? "Will Parker";
  const itinerary = itineraryFor(draft, me);
  const first = itinerary.out;
  const later = inventory(SQUAD.origin, first?.to ?? "SAW", draft.departDate.value)[1];
  const mates = listNames(FRIENDS.map((f) => f.name));
  const ready = useAgentRun(`mum:${cancelled ? "cancelled" : "follows"}`, () =>
    traceFor(cancelled ? "/follow/mum/cancelled" : "/follow/mum", state),
  );
  return (
    <LockScreen
      date={cancelled ? longDate(draft.departDate.value) : INVITE.sentLong}
      time={cancelled ? "04:51" : "18:33"}
      bottom={150}
    >
      {ready && (
        <LockCard label="Message from Pegasus" radius={24} className="bg-white/95 !p-3.5">
          <div className="flex items-start gap-3">
            {cancelled ? <Avatar size={38} mood="sad" /> : <AppIcon size={38} />}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] leading-[18px] font-extrabold tracking-[0.04em]">
                  MESSAGES · PEGASUS
                </span>
                <span className="text-[13px] leading-[18px] text-pg-ink">now</span>
              </span>
              <span className="text-[15px] leading-5" style={{ textWrap: "pretty" }}>
                <strong className="font-extrabold">
                  {cancelled
                    ? `${firstName(me)}'s ${first?.flight.departs ?? "06:10"} is cancelled. All three are on the ${later?.departs ?? "13:30"}, landing ${cityOf(first?.to ?? "SAW")} ${later?.arrives ?? "19:25"}.`
                    : `${firstName(me)}'s booked ${cityOf(draft.destination.value)} with ${mates}, ${dayMonth(draft.departDate.value)} to ${dayMonth(draft.returnDate.value ?? draft.departDate.value)}.`}
                </strong>{" "}
                {cancelled
                  ? "He knows; nothing to do."
                  : `Lands ${cityOf(first?.to ?? "SAW")} ${first?.flight.arrives ?? "12:05"} on ${dayMonth(draft.departDate.value)}.`}
              </span>
              <span className="mt-1 text-[14px] font-extrabold text-pg-orange">
                Follow the trip
              </span>
              <span className="text-[12px] leading-4 text-pg-ink">
                Live updates in the app; one tap to install. Reply STOP any time.
              </span>
              <button
                type="button"
                onClick={() => router.push("/follow/mum/stop")}
                className="mt-2 self-start rounded-full bg-pg-surface px-3 py-1 text-[12px] font-bold"
              >
                Reply STOP
              </button>
            </span>
          </div>
        </LockCard>
      )}
    </LockScreen>
  );
}

/** Mum wants out. She replies STOP and only ever gets flight status. */
export function MumStopScreen() {
  const { state } = useJourney();
  const draft = state.draft ?? willDraft();
  const me = WILL.travellers[0]?.name ?? "Will Parker";
  const first = itineraryFor(draft, me).out;
  useAgentRun("mum:stop", () => traceFor("/follow/mum/stop", state));
  return (
    <div className="flex h-full flex-col bg-white text-pg-navy">
      <div className="flex shrink-0 flex-col items-center gap-1 border-b border-pg-line px-4 pt-12 pb-3">
        <AppIcon size={44} />
        <span className="text-[13px] font-bold">Pegasus</span>
      </div>
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-5">
        <p className="text-center text-[12px] font-semibold text-pg-ink">{INVITE.sentLong}</p>
        <Bubble side="left">
          {firstName(me)}&rsquo;s booked {cityOf(draft.destination.value)},{" "}
          {dayMonth(draft.departDate.value)} to{" "}
          {dayMonth(draft.returnDate.value ?? draft.departDate.value)}. Lands{" "}
          {cityOf(first?.to ?? "SAW")} {first?.flight.arrives ?? "12:05"}. Follow the trip:
          pegasus.app/follow
        </Bubble>
        <Bubble side="right">STOP</Bubble>
        <Bubble side="left">
          Done. You&rsquo;ll only hear from us if {firstName(me)}&rsquo;s flights change, never
          offers.
        </Bubble>
        <p className="mt-3 text-center text-[12px] leading-[18px] text-pg-ink">
          Messages she never asked for would cost the family&rsquo;s trust. Status only, for
          good.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 px-3 pt-2 pb-8">
        <span className="h-10 flex-1 rounded-full bg-pg-surface px-4 text-[15px] leading-10 text-pg-ink">
          iMessage
        </span>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return (
    <p
      className={`max-w-[270px] rounded-[18px] px-3.5 py-2 text-[15px] leading-5 ${
        side === "left" ? "self-start bg-pg-surface" : "self-end bg-[#2E8FE0] text-white"
      }`}
      style={{ textWrap: "pretty" }}
    >
      {children}
    </p>
  );
}
