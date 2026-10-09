"use client";

import { Thinking, useAgentRun } from "@/components/agent-provider";
import { useJourney } from "@/components/journey-provider";
import { traceFor } from "@/lib/agent/trace";
import { AppHeader, AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import {
  ClockIcon,
  Initials,
  PrimaryButton,
  TextButton,
  Tick,
} from "@/components/ui/primitives";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { formatFare } from "@/lib/journey/flights";
import {
  BREAKFAST,
  firstName,
  friendByName,
  FRIENDS,
  groupMembers,
  INVITE,
  listNames,
} from "@/lib/group/group";
import { WILL, willDraft } from "@/lib/demo/personas";
import { cityOf } from "./ticket";

/**
 * The organiser's side of a group booking.
 *
 * Will has booked and sent the trip on. From then on the squad lives in My
 * Flights as a card that fills in as people book, and the companion nudges the
 * last straggler once, in Will's name, when the flight is filling up.
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
  const early = itinerary.out?.flight.departs ?? "06:10";
  const ready = useAgentRun(`group:status:${booked}:${state.sent}`, () =>
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
              : `Sent ${INVITE.sentAt} · ${members.length - booked} to go`}
          </span>
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
        {state.shared.length > 0 && (
          <p className="border-t border-pg-line px-5 py-3 text-[13px] leading-[18px] text-pg-ink">
            The link went to {listNames(state.shared)} too. No seat held; they book anywhere,
            or don&rsquo;t.
          </p>
        )}
        {!complete && waiting !== undefined && (
          <div className="mx-3 mt-1.5 mb-3 flex items-start gap-3 rounded-[14px] bg-pg-surface p-3.5">
            <Avatar size={36} />
            <div className="flex flex-1 flex-col items-start gap-2.5">
              <p className="text-[15px] leading-[22px]" style={{ textWrap: "pretty" }}>
                {firstName(waiting.name)} hasn&rsquo;t booked, and the 06:10 is down to{" "}
                {itinerary.out?.flight.seatsLeft ?? 9} seats. Want me to nudge{" "}
                {friendByName(waiting.name)?.pronoun.object ?? "them"} in your name?
              </p>
              <PrimaryButton
                size="sm"
                onClick={() =>
                  update({ aside: { who: "jess", route: "/invite/jess/stalls" } })
                }
              >
                Nudge {firstName(waiting.name)} to claim voucher
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
                  Breakfast for the group?
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
            {state.breakfast ? (
              <p className="text-[14px] font-bold">
                Added for all {members.length}. See you at {early}.
              </p>
            ) : (
              <PrimaryButton size="sm" onClick={() => update({ breakfast: true })}>
                Add for all {members.length} · {formatFare(BREAKFAST.each * members.length)}{" "}
                GBP
              </PrimaryButton>
            )}
          </div>
        )}
      </section>
      {!state.sent && (
        <p className="mt-4 px-1 text-[13px] leading-[18px] text-pg-ink">
          Not sent yet.{" "}
          <TextButton href="/confirmation" className="min-h-0 text-[13px]">
            Send it to your friends to claim a voucher
          </TextButton>
        </p>
      )}
      <p className="mt-4 px-1 text-[12px] leading-[18px] text-pg-ink">
        {draft.stops.value.length} stops · {itinerary.legs.length} flights each.
      </p>
    </AppShell>
  );
}
