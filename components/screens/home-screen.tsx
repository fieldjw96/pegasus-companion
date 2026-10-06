"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AppHeader, AppShell, TotalFooter } from "@/components/ui/app-shell";
import { Avatar, Mark, Says, ThinkingAvatar } from "@/components/ui/avatar";
import { DestinationPhoto } from "@/components/ui/destination-photo";
import { PrimaryButton, Sparkle, TextButton } from "@/components/ui/primitives";
import { SentenceBox } from "@/components/ui/sentence-box";
import { useJourney } from "@/components/journey-provider";
import { Ticket } from "./ticket";
import { Suggestions } from "./suggestions";
import { PROFILES, type Profile } from "@/lib/assistant/profiles";
import { buildDraft, extract } from "@/lib/assistant/understand";
import { suggest, type Suggestion } from "@/lib/assistant/discover";
import { countBySource, type TripDraft } from "@/lib/assistant/draft";
import { nights } from "@/lib/assistant/itinerary";
import { breakdown, naivePath } from "@/lib/assistant/price";
import { formatFare } from "@/lib/journey/flights";

/**
 * Home: the greeting, the thinking beat, and the ticket.
 *
 * One screen, in the order a passenger moves through it. There is no funnel to
 * walk. A passenger says what they want and the trip assembles underneath,
 * rather than being walked through nine screens of questions the app could
 * mostly have answered itself.
 *
 * The thinking delay is the only piece of theatre here. An answer that appears
 * instantly reads as a lookup; a short pause reads as work. Everything behind
 * it is deterministic, so a rehearsal and the live run give the same answer.
 */

const TRY: { code: string; title: string; prompt: string }[] = [
  {
    code: "ADB",
    title: "Izmir",
    prompt: "Stansted to Izmir on 19 October, back on the 25th, checking a bag",
  },
  {
    code: "AYT",
    title: "Somewhere warm",
    prompt: "Somewhere warm in October, under £600, nothing too long",
  },
  {
    code: "BER",
    title: "Berlin",
    prompt: "Two nights in Berlin next month, hand luggage only",
  },
];

type Phase = "idle" | "thinking" | "discovery" | "trip";

export function HomeScreen({ fromWatch = false }: { fromWatch?: boolean }) {
  const router = useRouter();
  const { state, update } = useJourney();
  const profile = PROFILES.find((p) => p.id === state.profileId) ?? PROFILES[0]!;
  // Whether a trip is on screen lives in the store, so it survives a refresh
  // and a round trip through the checkout. Only the two transient beats
  // (thinking, discovery) are local.
  const [beat, setBeat] = useState<"thinking" | "discovery" | null>(null);
  const phase: Phase = beat ?? (state.draft === null ? "idle" : "trip");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const greeting = useSyncExternalStore(
    () => () => {},
    () => {
      const hour = new Date().getHours();
      return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    },
    () => "Good morning",
  );

  function run(text: string): void {
    update({ prompt: text });
    setBeat("thinking");
    window.setTimeout(() => {
      const said = extract(text);
      if (said.discovery) {
        const when =
          said.departDate ??
          (() => {
            const d = new Date();
            d.setDate(d.getDate() + 21);
            return d.toISOString().slice(0, 10);
          })();
        setSuggestions(suggest(said, profile, when));
        update({ draft: null });
        setBeat("discovery");
        return;
      }
      update({ draft: buildDraft(text, profile), booked: false });
      setSuggestions([]);
      setBeat(null);
    }, 900);
  }

  function choose(code: string): void {
    update({ draft: buildDraft(`${state.prompt ?? ""} to ${code}`, profile), booked: false });
    setSuggestions([]);
    setBeat(null);
  }

  function reset(): void {
    update({ draft: null, prompt: null, booked: false });
    setSuggestions([]);
    setBeat(null);
  }

  function setProfile(next: Profile): void {
    update((prev) => ({
      profileId: next.id,
      draft:
        prev.draft !== null && prev.prompt !== null ? buildDraft(prev.prompt, next) : null,
    }));
  }

  const draft = state.draft;
  const names = profile.travellers.filter((t) => t.kind !== "infant").map((t) => t.name);

  if (phase === "idle") {
    return (
      <AppShell bodyClassName="pt-2 pb-8">
        <div className="flex flex-col items-center gap-3">
          <Avatar size={120} className="drop-shadow-[0_10px_18px_rgba(229,167,12,0.28)]" />
          <span className="flex h-[26px] items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-bold tracking-[0.08em] shadow-[0_1px_2px_rgba(31,42,55,0.06)]">
            <Sparkle />
            YOUR AI COMPANION
          </span>
          <h1 className="mt-1 text-center text-[28px] leading-[34px] font-extrabold tracking-[-0.02em]">
            {greeting}, {names[0]?.split(" ")[0] ?? "Jack"}
          </h1>
        </div>

        <div className="mt-5">
          <SentenceBox
            placeholder="Where are we going? Or tell me the whole trip at once."
            action="Plan it"
            onSubmit={run}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <div className="relative flex h-[60px] flex-col justify-center rounded-2xl bg-white px-5 shadow-[0_1px_2px_rgba(31,42,55,0.05)]">
            <label htmlFor="trip-kind" className="caps">
              Trip
            </label>
            <select
              id="trip-kind"
              value={profile.id}
              onChange={(e) => {
                const next = PROFILES.find((p) => p.id === e.target.value);
                if (next !== undefined) setProfile(next);
              }}
              className="w-full appearance-none bg-transparent text-[17px] leading-6 font-bold outline-none"
            >
              {PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="pointer-events-none absolute top-5 right-[18px]"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <p className="px-1 text-[13px] leading-[18px] text-pg-ink">
            {names.map((n) => n.split(" ")[0]).join(", ")} · remembered from your past{" "}
            {profile.label.toLowerCase()} bookings
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-3">
          <h2 className="caps px-1">Try</h2>
          {TRY.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => run(item.prompt)}
              className="pg-card relative block h-28 w-full overflow-hidden text-left"
            >
              <DestinationPhoto code={item.code} className="absolute inset-0" scrim={false} />
              <span
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(31,42,55,0.05) 0%, rgba(31,42,55,0.78) 100%)",
                }}
              />
              <span className="absolute inset-x-[18px] bottom-3.5 flex flex-col gap-0.5 text-white">
                <span className="text-[20px] leading-6 font-extrabold tracking-[-0.01em]">
                  {item.title}
                </span>
                <span className="text-[13px] leading-[18px] font-medium">{item.prompt}</span>
              </span>
            </button>
          ))}
        </div>
      </AppShell>
    );
  }

  const youSaid = (
    <div className="pg-card mt-4 flex flex-col px-5 pt-1.5 pb-[18px]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-pg-ink">You said:</span>
        <TextButton onClick={reset} className="pl-4">
          Start over
        </TextButton>
      </div>
      <p className="text-[17px] leading-[25px] font-semibold" style={{ textWrap: "pretty" }}>
        {state.prompt}
      </p>
    </div>
  );

  if (phase === "thinking") {
    return (
      <AppShell header={<AppHeader withAvatar />}>
        {youSaid}
        <div role="status" className="flex flex-col items-center gap-7 pt-24 pb-10">
          <ThinkingAvatar />
          <p className="text-center text-[17px] leading-6 font-semibold">
            Filling in what you did not say…
          </p>
        </div>
      </AppShell>
    );
  }

  if (phase === "discovery" || draft === null) {
    return (
      <AppShell header={<AppHeader withAvatar />} bodyClassName="pb-8">
        {youSaid}
        <div className="mt-5">
          <Says>
            You did not name anywhere, so here is what I would pick for a{" "}
            {profile.label.toLowerCase()} — priced for {names.length} and already carrying
            everything you usually book.
          </Says>
        </div>
        <div className="mt-4">
          <Suggestions suggestions={suggestions} travellers={names.length} onChoose={choose} />
        </div>
        <SentenceSection onSubmit={run} />
      </AppShell>
    );
  }

  const price = breakdown(draft);
  const away = nights(draft);
  const people = draft.party.value.adults + draft.party.value.children;

  return (
    <AppShell
      header={<AppHeader withAvatar />}
      bodyClassName="pt-4 pb-7"
      footer={
        <TotalFooter
          line={`${people} travelling${away === null ? "" : `, ${away} nights`}`}
          total={`${formatFare(price.total)} GBP`}
        >
          <PrimaryButton onClick={() => router.push("/checkout")}>Checkout</PrimaryButton>
        </TotalFooter>
      }
    >
      <Intro draft={draft} fromWatch={fromWatch} />
      <Ticket draft={draft} onChange={(next) => update({ draft: next })} names={names} />
      <SentenceSection onSubmit={run} />
    </AppShell>
  );
}

/** What the companion says over the ticket. */
function Intro({ draft, fromWatch }: { draft: TripDraft; fromWatch: boolean }) {
  const counts = countBySource(draft);
  const inferred = counts.profile + counts.predicted;
  const saving = naivePath(draft);
  if (fromWatch) {
    return (
      <Says>
        I built this from your watch. {counts.said} things from what you told me in September,{" "}
        {counts.profile} remembered, {counts.predicted} I worked out —{" "}
        <span className="mine font-semibold">the dotted ones</span>. Tap any to change it
        before you approve.
      </Says>
    );
  }
  return (
    <Says>
      {inferred === 0 ? (
        <>Here is your ticket. Everything on it came from you.</>
      ) : (
        <>
          Here is your ticket. You told me {counts.said}{" "}
          {counts.said === 1 ? "thing" : "things"}; the {inferred} with a{" "}
          <span className="mine font-semibold">dotted line underneath</span> are mine. Tap one
          to see why.
        </>
      )}
      {saving !== null && (
        <>
          {" "}
          <Mark>Buying it this way is {formatFare(saving.saved)} GBP cheaper</Mark> than taking
          the cheapest fare and adding the same bag later.
        </>
      )}
    </Says>
  );
}

/** The input under a ticket. The ask is no longer "where", it is "what else". */
export function SentenceSection({ onSubmit }: { onSubmit: (text: string) => void }) {
  return (
    <div className="mt-7 flex flex-col gap-3">
      <h2 className="caps px-1">Change it in a sentence</h2>
      <SentenceBox
        label="Change the trip in a sentence"
        placeholder="Make it the 20th instead. Or add a bag. Or start again somewhere else."
        action="Redo it"
        onSubmit={onSubmit}
      />
    </div>
  );
}
