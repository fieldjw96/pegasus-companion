"use client";

import { useState } from "react";
import { useNav } from "@/components/phone-nav";
import { Thinking, useAgentRun } from "@/components/agent-provider";
import { useJourney } from "@/components/journey-provider";
import { traceFor } from "@/lib/agent/trace";
import { AppHeader, AppShell, BottomNav, StatusBar } from "@/components/ui/app-shell";
import { Avatar, Says } from "@/components/ui/avatar";
import {
  BackArrow,
  ClockIcon,
  Initials,
  MailIcon,
  PrimaryButton,
  SecondaryButton,
  Sparkle,
  TextButton,
  Tick,
} from "@/components/ui/primitives";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { formatFare } from "@/lib/journey/flights";
import {
  BREAKFAST,
  FREEZE,
  FRIENDS,
  firstName,
  friendByName,
  groupMembers,
  seatBeside,
} from "@/lib/group/group";
import { WILL, willDraft } from "@/lib/demo/personas";
import { cityOf } from "./ticket";

/**
 * The organiser's side of a group booking.
 *
 * Will has booked. The companion freezes today's fare for the mates he picks
 * and builds each of them their own booking in his name. From then on the
 * squad lives in My Flights as a card that fills in as people book, with the
 * frozen fare's clock on it: a bit of friendly pressure.
 *
 * Privacy is in the layout: the organiser's screens carry names, status and
 * seat only. No fare of anyone else's appears on his side.
 */
function useOrganiser() {
  const { state, update } = useJourney();
  const draft = state.draft ?? willDraft();
  const names = WILL.travellers.map((t) => t.name);
  const me = names[0] ?? "Will Parker";
  const groupName = `${cityOf(draft.destination.value)} squad`;
  const itinerary = itineraryFor(draft, me);
  return { state, update, draft, names, me, groupName, itinerary };
}

export function AddPeopleScreen() {
  const router = useNav();
  const { state, update, groupName, draft, me } = useOrganiser();
  const [picked, setPicked] = useState<string[]>(
    state.invited.length > 0 ? state.invited : FRIENDS.map((f) => f.name),
  );
  const added = FRIENDS.filter((f) => picked.includes(f.name));
  const seats = added
    .map((f) => seatBeside(draft, f, me))
    .filter((s): s is string => s !== null);
  const ready = useAgentRun("group:people", () => traceFor("/group/people", state));

  function toggle(name: string): void {
    setPicked((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  if (!ready) return <Thinking label="Checking who Pegasus knows…" header={null} />;

  return (
    <div className="relative flex h-full flex-col bg-pg-surface text-pg-navy">
      <StatusBar />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pt-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="-ml-2.5 flex h-11 w-11 items-center justify-center"
        >
          <BackArrow size={22} />
        </button>
        <h1 className="mt-1 text-[28px] leading-[34px] font-extrabold tracking-[-0.02em]">
          Who&rsquo;s coming?
        </h1>
        <div
          className="mt-3 flex h-[34px] items-center gap-2 rounded-full bg-white pr-3.5 pl-3 shadow-[0_1px_2px_rgba(31,42,55,0.06)]"
          style={{ width: "fit-content" }}
        >
          <Sparkle />
          <button
            type="button"
            aria-label={`Group name: ${groupName}, chosen by your companion. Change`}
            className="mine text-[14px] leading-[18px] font-bold"
          >
            {groupName}
          </button>
        </div>

        <h2 className="caps mt-6 mb-2 px-1">From your contacts</h2>
        <div className="pg-card flex flex-col py-1 pr-3.5 pl-4">
          {FRIENDS.map((friend, i) => {
            const on = picked.includes(friend.name);
            return (
              <div key={friend.name}>
                {i > 0 && <div className="h-px bg-pg-line" />}
                <div className="flex items-center gap-3 py-2.5">
                  <Initials name={friend.name} tone={on ? "navy" : "surface"} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[16px] leading-[22px] font-bold">{friend.name}</span>
                    <span className="flex items-start gap-1.5 text-[13px] leading-[18px] text-pg-ink">
                      {friend.account ? (
                        <span
                          aria-hidden
                          className="display mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[4px] bg-pg-yellow text-center text-[10px] leading-[14px] font-black text-pg-navy"
                        >
                          P
                        </span>
                      ) : (
                        <span className="mt-0.5 text-pg-ink">
                          <MailIcon />
                        </span>
                      )}
                      <span>
                        {friend.account ? "Has the app" : "No app"} ·{" "}
                        <span className="font-semibold text-pg-navy">
                          {friend.account
                            ? `I'll build ${friend.pronoun.possessive} booking`
                            : `${friend.pronoun.subject}'ll get a WhatsApp link`}
                        </span>
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`${friend.name}, ${on ? "added. Tap to remove" : "not added. Tap to add"}`}
                    onClick={() => toggle(friend.name)}
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${
                      on ? "pg-primary" : "bg-pg-surface"
                    }`}
                  >
                    {on ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                        <path
                          d="M4.5 10.5l3.5 3.5 7.5-8"
                          fill="none"
                          stroke="#1F2A37"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        aria-hidden
                      >
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative mt-3">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B7684"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden
            className="absolute top-4 left-4"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
          <input
            type="search"
            aria-label="Search your contacts"
            placeholder="Search contacts"
            className="h-[52px] w-full rounded-2xl bg-white pr-4 pl-[46px] text-[16px] font-medium shadow-[0_1px_2px_rgba(31,42,55,0.05)] outline-none"
          />
        </div>

        <Says className="mt-5 mb-6">
          {added.length === 0
            ? "Pick anyone. I'll freeze today's fare for each of them, hold a seat beside yours, and build each their own booking."
            : `${words(added.length)} ${added.length === 1 ? "person" : "people"}. I'll freeze today's fare for ${added.length === 1 ? "them" : "both"} and hold ${seats.join(" and ")} beside you until ${FREEZE.untilShort}. Each gets their own booking, in your name.`}
        </Says>
      </main>
      <div className="shrink-0 px-5 pt-3 pb-3.5">
        <PrimaryButton
          size="lg"
          disabled={added.length === 0}
          onClick={() => {
            update({ invited: added.map((f) => f.name), frozen: false });
            router.push("/group/review");
          }}
        >
          Freeze and invite · {formatFare(FREEZE.feePerFriend * added.length)} GBP
        </PrimaryButton>
      </div>
      <BottomNav />
    </div>
  );
}

function words(n: number): string {
  return ["Zero", "One", "Two", "Three", "Four", "Five", "Six"][n] ?? String(n);
}

export function ReviewSendScreen() {
  const router = useNav();
  const { state, update, draft, me } = useOrganiser();
  const invited = state.invited.length > 0 ? state.invited : FRIENDS.map((f) => f.name);
  const ready = useAgentRun(`group:review:${invited.join(",")}`, () =>
    traceFor("/group/review", state),
  );

  if (!ready) return <Thinking label="Building their bookings…" header={null} />;

  return (
    <div className="relative flex h-full flex-col bg-pg-surface text-pg-navy">
      <StatusBar />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pt-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.push("/group/people")}
          className="-ml-2.5 flex h-11 w-11 items-center justify-center"
        >
          <BackArrow size={22} />
        </button>
        <h1 className="mt-1 text-[28px] leading-[34px] font-extrabold tracking-[-0.02em]">
          Review and send
        </h1>
        <p className="mt-2 flex items-center gap-2 text-[15px] font-semibold">
          <ClockIcon size={18} />
          Fare frozen until {FREEZE.until}
        </p>

        <div className="pg-card mt-5 flex flex-col px-5 py-1">
          {invited.map((name, i) => {
            const friend = friendByName(name);
            const first = firstName(name);
            const seat = friend === null ? null : seatBeside(draft, friend, me);
            return (
              <div key={name}>
                {i > 0 && <div className="h-px bg-pg-line" />}
                <div className="flex items-start gap-3 py-3.5">
                  <Initials name={name} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[16px] leading-[22px] font-bold">{name}</span>
                    <span
                      className="text-[14px] leading-5 text-pg-ink"
                      style={{ textWrap: "pretty" }}
                    >
                      {friend?.account ? (
                        <>
                          {first} gets: a push in your name. Your flights,{" "}
                          {friend.pronoun.possessive} own fare, {seat ?? "a seat"} next to you,
                          and{" "}
                          {friend.remembered?.meal
                            ? "the hot meal he always has"
                            : "nothing else"}{" "}
                          already in.{" "}
                          {friend.pronoun.subject.replace(/^\w/, (c) => c.toUpperCase())}{" "}
                          checks and pays.
                        </>
                      ) : (
                        <>
                          {first} gets: a WhatsApp from you. The same booking, built on the
                          web, with {seat ?? "a seat"} saved next to you. It opens the app, or
                          the web if {friend?.pronoun.subject ?? "they"} hasn&rsquo;t got it.
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Says className="mt-5 mb-6">
          Each of them sees your flights, dates and the seat beside you. None of them sees what
          you paid, and you won&rsquo;t see what they pay.
        </Says>
      </main>
      <div className="flex shrink-0 flex-col gap-2 px-5 pt-3 pb-3.5">
        <PrimaryButton
          size="lg"
          onClick={() => {
            // The invites land on the friends' phones: the first one appears beside this one.
            const first = friendByName(invited[0] ?? "");
            update({
              invited,
              frozen: true,
              aside:
                first === null
                  ? null
                  : first.account
                    ? { who: "archie", route: "/invite/archie" }
                    : { who: "tom", route: "/invite/tom" },
            });
            router.push("/group");
          }}
        >
          Send invites
        </PrimaryButton>
        <SecondaryButton onClick={() => router.push("/group/people")} className="w-full">
          Edit people
        </SecondaryButton>
      </div>
      <BottomNav />
    </div>
  );
}

export function GroupStatusScreen() {
  const { state, update, groupName, me, itinerary, draft } = useOrganiser();
  const invited = state.invited.length > 0 ? state.invited : FRIENDS.map((f) => f.name);
  const members = groupMembers(
    me,
    itinerary.out?.seats[0] ?? null,
    invited,
    state.inviteesBooked,
  );
  const booked = members.filter((m) => m.status === "booked").length;
  const complete = booked === members.length;
  // One nudge, to the last straggler, once everyone else is in. Not a chase.
  const waiting =
    booked === members.length - 1 ? members.find((m) => m.status !== "booked") : undefined;
  const [breakfast, setBreakfast] = useState(false);
  const early = itinerary.out?.flight.departs ?? "06:10";
  const ready = useAgentRun(`group:status:${booked}:${state.frozen}`, () =>
    traceFor("/group", state),
  );

  if (!ready) {
    return (
      <Thinking
        label={complete ? "Everyone's in. One thing for all three…" : "Counting the squad…"}
        header={<AppHeader user={me} />}
      />
    );
  }

  return (
    <AppShell header={<AppHeader user={me} />} active="My Flights" bodyClassName="pt-4 pb-6">
      <h1 className="text-[28px] leading-[34px] font-extrabold tracking-[-0.02em]">
        My Flights
      </h1>
      <section
        aria-label="Group status"
        className="pg-hero-card mt-4 flex flex-col overflow-hidden"
      >
        <div className="flex flex-col gap-3.5 px-5 pt-5 pb-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
              {groupName}
            </h2>
            <span className="text-[14px] font-semibold whitespace-nowrap text-pg-ink">
              {members.length} travelling
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div
              role="img"
              aria-label={`${booked} of ${members.length} booked`}
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${members.length}, minmax(0, 1fr))` }}
            >
              {members.map((m, i) => (
                <span
                  key={m.name}
                  className={`h-2 rounded ${i < booked ? (complete ? "bg-pg-yellow" : "bg-pg-navy") : "bg-pg-line"}`}
                />
              ))}
            </div>
            <span className="text-[14px] leading-[18px] font-bold">
              {complete
                ? `All ${members.length} booked 🎉`
                : `${booked} of ${members.length} booked`}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 bg-pg-navy px-5 py-3 text-white">
          <span className="flex items-center gap-2 text-[14px] font-semibold">
            <span className="text-pg-yellow">
              <ClockIcon />
            </span>
            {complete
              ? `Together in ${members
                  .map((m) => m.seat)
                  .filter(Boolean)
                  .join(" · ")}`
              : `Fare frozen until ${FREEZE.until}`}
          </span>
          {!complete && (
            <span className="display text-[16px] font-extrabold whitespace-nowrap">
              {FREEZE.remaining}
            </span>
          )}
        </div>
        <div className="flex flex-col px-5 py-1.5">
          {members.map((m, i) => (
            <div key={m.name}>
              {i > 0 && <div className="h-px bg-pg-line" />}
              <div className="flex min-h-14 items-center gap-3">
                <Initials name={m.name} tone={m.status === "booked" ? "navy" : "surface"} />
                <span className="flex-1 text-[16px] leading-[22px] font-bold">
                  {firstName(m.name)}
                </span>
                {m.status === "booked" ? (
                  <span className="flex items-center gap-1.5 text-[14px] font-bold">
                    Booked <Tick />
                    {m.seat !== null && (
                      <span className="display ml-0.5 h-[22px] rounded-md px-[7px] text-[12px] leading-[22px] font-extrabold shadow-[inset_0_0_0_1.5px_#1F2A37]">
                        {m.seat}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[14px] font-semibold text-pg-ink">
                    {m.status === "opened" ? "Opened, not booked" : "Not yet opened"}
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      aria-hidden
                      className="shrink-0"
                    >
                      <circle
                        cx="10"
                        cy="10"
                        r="8.5"
                        fill="none"
                        stroke={m.status === "opened" ? "#6B7684" : "#C3CCD8"}
                        strokeWidth="2"
                      />
                      {m.status === "opened" && (
                        <path d="M10 1.5a8.5 8.5 0 0 1 0 17Z" fill="#6B7684" />
                      )}
                    </svg>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {!complete && waiting !== undefined && (
          <div className="mx-3 mt-1.5 mb-3 flex items-start gap-3 rounded-[14px] bg-pg-surface p-3.5">
            <Avatar size={36} />
            <div className="flex flex-1 flex-col items-start gap-2.5">
              <p className="text-[15px] leading-[22px]" style={{ textWrap: "pretty" }}>
                {firstName(waiting.name)} hasn&rsquo;t booked and the frozen fare ends{" "}
                {FREEZE.untilShort}. Want me to nudge{" "}
                {friendByName(waiting.name)?.pronoun.object ?? "them"} in your name?
              </p>
              <PrimaryButton
                size="sm"
                onClick={() => update({ aside: { who: "tom", route: "/invite/tom/stalls" } })}
              >
                Nudge {firstName(waiting.name)}
              </PrimaryButton>
            </div>
          </div>
        )}
        {complete && (
          <div className="mx-3 mt-1.5 mb-3 flex flex-col gap-2.5 rounded-[14px] bg-pg-surface p-3.5">
            <div className="flex items-start gap-3">
              <Avatar size={36} />
              <div className="flex flex-col gap-0.5">
                <p className="text-[16px] leading-[22px] font-extrabold">
                  Breakfast for the squad?
                </p>
                <p
                  className="text-[14px] leading-5 text-pg-ink"
                  style={{ textWrap: "pretty" }}
                >
                  {members.length} hot breakfasts from Pegasus Café for the {early}. One offer
                  for three, because I now know you&rsquo;re travelling together.
                </p>
              </div>
            </div>
            {breakfast ? (
              <p className="text-[14px] font-bold">
                Added for all {members.length}. See you at {early}.
              </p>
            ) : (
              <PrimaryButton size="sm" onClick={() => setBreakfast(true)}>
                Add for all {members.length} · {formatFare(BREAKFAST.each * members.length)}{" "}
                GBP
              </PrimaryButton>
            )}
          </div>
        )}
      </section>
      {!state.frozen && (
        <p className="mt-4 px-1 text-[13px] leading-[18px] text-pg-ink">
          Invites not sent yet.{" "}
          <TextButton href="/group/review" className="min-h-0 text-[13px]">
            Review and send
          </TextButton>
        </p>
      )}
      <p className="mt-4 px-1 text-[12px] leading-[18px] text-pg-ink">
        {draft.stops.value.length} stops · {itinerary.legs.length} flights each.
      </p>
    </AppShell>
  );
}
