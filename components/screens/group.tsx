"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useJourney } from "@/components/journey-provider";
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
import { PROFILES } from "@/lib/assistant/profiles";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { AIRPORTS } from "@/lib/journey/flights";
import { heroDraft } from "@/lib/demo/hero";
import {
  FRIENDS,
  HOLD,
  firstName,
  friendByName,
  groupMembers,
  seatOffer,
} from "@/lib/group/group";

/**
 * The organiser's side of a group booking.
 *
 * Jack has booked. The companion offers to hold the same flights for the
 * people he usually travels with and to build each of them their own booking.
 * He picks who, reviews what each will receive, and sends. From then on the
 * group lives in My Flights as a card that fills in as people book.
 *
 * Privacy is in the layout: the organiser's screens carry names, status and
 * seat only. No fare of anyone else's appears on his side.
 */
function useOrganiser() {
  const { state, update } = useJourney();
  const draft = state.draft ?? heroDraft();
  const profile = PROFILES.find((p) => p.id === state.profileId) ?? PROFILES[0]!;
  const names = profile.travellers.filter((t) => t.kind !== "infant").map((t) => t.name);
  const city =
    AIRPORTS[draft.destination.value as keyof typeof AIRPORTS]?.city ??
    draft.destination.value;
  const groupName = `${city} half term`;
  return { state, update, draft, names, city, groupName };
}

export function AddPeopleScreen() {
  const router = useRouter();
  const { state, update, groupName } = useOrganiser();
  const [picked, setPicked] = useState<string[]>(
    state.invited.length > 0 ? state.invited : FRIENDS.map((f) => f.name),
  );
  const [query, setQuery] = useState("");

  const flownWith = FRIENDS.filter((f) => f.flewWith > 0);
  const added = FRIENDS.filter((f) => picked.includes(f.name));
  const matches = FRIENDS.filter(
    (f) =>
      query.trim() !== "" &&
      f.flewWith === 0 &&
      f.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      !picked.includes(f.name),
  );

  function toggle(name: string): void {
    setPicked((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

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
          className="mt-3 flex h-[34px] items-center gap-2 self-start rounded-full bg-white pr-3.5 pl-3 shadow-[0_1px_2px_rgba(31,42,55,0.06)]"
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

        <h2 className="caps mt-6 mb-2 px-1">People you&rsquo;ve flown with</h2>
        <div className="pg-card flex flex-col py-1 pr-3.5 pl-4">
          {flownWith.map((friend, i) => {
            const on = picked.includes(friend.name);
            return (
              <div key={friend.name}>
                {i > 0 && <div className="h-px bg-pg-line" />}
                <div className="flex items-center gap-3 py-2.5">
                  <Initials name={friend.name} tone="surface" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[16px] leading-[22px] font-bold">{friend.name}</span>
                    <span className="text-[13px] leading-[18px] text-pg-ink">
                      {friend.flewWith === 1 ? "1×" : `flew with you ${friend.flewWith}×`}
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-[52px] w-full rounded-2xl bg-white pr-4 pl-[46px] text-[16px] font-medium shadow-[0_1px_2px_rgba(31,42,55,0.05)] outline-none"
          />
          {matches.length > 0 && (
            <div className="pg-card mt-2 flex flex-col px-4 py-1">
              {matches.map((friend) => (
                <button
                  key={friend.name}
                  type="button"
                  onClick={() => {
                    toggle(friend.name);
                    setQuery("");
                  }}
                  className="flex items-center gap-3 py-2.5 text-left"
                >
                  <Initials name={friend.name} tone="surface" />
                  <span className="text-[16px] font-bold">{friend.name}</span>
                  <span className="ml-auto text-[14px] font-bold text-pg-orange">Add</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {added.length > 0 && (
          <>
            <h2 className="caps mt-6 mb-2 px-1">Added</h2>
            <div className="pg-card flex flex-col px-4 py-1">
              {added.map((friend, i) => (
                <div key={friend.name}>
                  {i > 0 && <div className="h-px bg-pg-line" />}
                  <div className="flex items-center gap-3 py-2.5">
                    <Initials name={friend.name} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[16px] leading-[22px] font-bold">
                        {friend.name}
                      </span>
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
                          {friend.account ? "Pegasus account" : "No account"} ·{" "}
                          <span className="font-semibold text-pg-navy">
                            {friend.account
                              ? `I'll build ${friend.pronoun.possessive} booking`
                              : `${friend.pronoun.subject}'ll get an email link`}
                          </span>
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${friend.name}`}
                      onClick={() => toggle(friend.name)}
                      className="flex h-11 w-11 items-center justify-center text-pg-ink"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        aria-hidden
                      >
                        <path d="M6 6l12 12" />
                        <path d="M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <Says className="mt-5 mb-6">
          {added.length === 0
            ? "Pick anyone. I'll hold a seat beside yours for each of them and build each their own booking."
            : `${words(added.length)} ${added.length === 1 ? "person" : "people"}. I'll hold ${words(added.length).toLowerCase()} seat${added.length === 1 ? "" : "s"} on both legs beside yours until ${HOLD.untilShort}, and let each person know.`}
        </Says>
      </main>
      <div className="shrink-0 px-5 pt-3 pb-3.5">
        <PrimaryButton
          size="lg"
          disabled={added.length === 0}
          onClick={() => {
            update({ invited: added.map((f) => f.name), invitesSent: false });
            router.push("/group/review");
          }}
        >
          Hold seats and invite
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
  const router = useRouter();
  const { state, update, draft, names } = useOrganiser();
  const invited = state.invited.length > 0 ? state.invited : FRIENDS.map((f) => f.name);
  const offer = seatOffer(draft, names);

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
          Held until {HOLD.until}
        </p>

        <div className="pg-card mt-5 flex flex-col px-5 py-1">
          {invited.map((name, i) => {
            const friend = friendByName(name);
            const first = firstName(name);
            const possessive = friend?.pronoun.possessive ?? "their";
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
                          {first} gets: your flights, {possessive} own fare built from{" "}
                          {possessive} past bookings
                          {offer !== null && i === 0
                            ? `, and the offer of ${offer.seat} beside you.`
                            : "."}
                        </>
                      ) : (
                        <>
                          {first} gets: an email with your flights and a booking already built,
                          {possessive === "his" ? " his" : ` ${possessive}`} own fare, nothing
                          to type.
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
            update({ invited, invitesSent: true });
            router.push("/group");
          }}
        >
          Send invites
        </PrimaryButton>
        <SecondaryButton href="/group/people" className="w-full">
          Edit people
        </SecondaryButton>
      </div>
      <BottomNav />
    </div>
  );
}

export function GroupStatusScreen() {
  const { state, draft, names, groupName } = useOrganiser();
  const invited = state.invited.length > 0 ? state.invited : FRIENDS.map((f) => f.name);
  const offer = seatOffer(draft, names);
  const inviteeBooked =
    state.invitee.booked && invited[0] !== undefined
      ? {
          name: invited[0],
          seat: state.invitee.seatTaken && offer !== null ? offer.seat : null,
        }
      : null;
  const members = groupMembers(names[0] ?? "Jack Field", invited, inviteeBooked);
  const booked = members.filter((m) => m.status === "booked").length;
  const nudge = members.find((m) => m.status === "opened");
  const itinerary = itineraryFor(draft);

  return (
    <AppShell header={<AppHeader />} active="My Flights" bodyClassName="pt-4 pb-6">
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
                  className={`h-2 rounded ${i < booked ? "bg-pg-navy" : "bg-pg-line"}`}
                />
              ))}
            </div>
            <span className="text-[14px] leading-[18px] font-bold">
              {booked} of {members.length} booked
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 bg-pg-navy px-5 py-3 text-white">
          <span className="flex items-center gap-2 text-[14px] font-semibold">
            <span className="text-pg-yellow">
              <ClockIcon />
            </span>
            Held until {HOLD.until}
          </span>
          <span className="display text-[16px] font-extrabold whitespace-nowrap">
            {HOLD.remaining}
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
                    {m.organiser &&
                      itinerary.out !== null &&
                      itinerary.out.seats.length > 0 && (
                        <span className="sr-only">{itinerary.out.seats.join(" ")}</span>
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
        {nudge !== undefined && (
          <div className="mx-3 mb-3 mt-1.5 flex items-start gap-3 rounded-[14px] bg-pg-surface p-3.5">
            <Avatar size={36} />
            <div className="flex flex-1 flex-col items-start gap-2.5">
              <p className="text-[15px] leading-[22px]" style={{ textWrap: "pretty" }}>
                {firstName(nudge.name)}&rsquo;s fare goes up Thursday. Want me to tell{" "}
                {friendByName(nudge.name)?.pronoun.object ?? "them"}?
              </p>
              <PrimaryButton size="sm">Nudge {firstName(nudge.name)}</PrimaryButton>
            </div>
          </div>
        )}
      </section>
      {!state.invitesSent && (
        <p className="mt-4 px-1 text-[13px] leading-[18px] text-pg-ink">
          Invites not sent yet.{" "}
          <TextButton href="/group/review" className="min-h-0 text-[13px]">
            Review and send
          </TextButton>
        </p>
      )}
    </AppShell>
  );
}
