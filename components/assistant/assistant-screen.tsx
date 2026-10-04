"use client";

import { useMemo, useState } from "react";
import { ChatBox } from "./chat-box";
import { Suggestions } from "./suggestions";
import { TripCard } from "./trip-card";
import { DestinationPhoto } from "./destination-photo";
import { Checkout } from "./checkout";
import { PROFILES, type Profile } from "@/lib/assistant/profiles";
import { buildDraft, extract } from "@/lib/assistant/understand";
import { suggest, type Suggestion } from "@/lib/assistant/discover";
import type { TripDraft } from "@/lib/assistant/draft";
import { BAGGAGE_PRICES } from "@/lib/journey/baggage";
import { FARE_RULES, inventory } from "@/lib/journey/flights";

/**
 * The whole assistant surface.
 *
 * One screen, three states, in the order a passenger actually moves through
 * them: greeting, then either discovery or a built trip, then checkout. There
 * is no funnel to walk, and nothing is hidden behind a step the passenger has
 * not reached yet.
 *
 * The thinking delay is deliberate and is the only piece of theatre here. An
 * answer that appears instantly reads as a lookup; a short pause reads as work.
 * Everything behind it is deterministic, so a rehearsal and the live run give
 * the same answer.
 */

const EXAMPLES: { code: string; title: string; prompt: string }[] = [
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

type Phase = "idle" | "thinking" | "discovery" | "trip" | "checkout";

export function AssistantScreen() {
  const [profile, setProfile] = useState<Profile>(PROFILES[2] ?? PROFILES[0]!);
  const [phase, setPhase] = useState<Phase>("idle");
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<TripDraft | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const total = useMemo(() => (draft === null ? 0 : priceOf(draft)), [draft]);

  function run(text: string): void {
    setPrompt(text);
    setPhase("thinking");

    // Short pause so the assembly reads as work rather than a lookup.
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
        setDraft(null);
        setPhase("discovery");
        return;
      }
      setDraft(buildDraft(text, profile));
      setSuggestions([]);
      setPhase("trip");
    }, 650);
  }

  /** Picking a destination from discovery turns it into a full trip. */
  function choose(code: string): void {
    const text = `${prompt} to ${code}`;
    setDraft(buildDraft(text, profile));
    setSuggestions([]);
    setPhase("trip");
  }

  function reset(): void {
    setPhase("idle");
    setDraft(null);
    setSuggestions([]);
    setPrompt("");
  }

  const travellers = profile.travellers.filter((t) => t.kind !== "infant").length;

  if (phase === "checkout" && draft !== null) {
    return (
      <div className="assistant-bg min-h-full">
        <Checkout draft={draft} total={total} onBack={() => setPhase("trip")} />
      </div>
    );
  }

  return (
    <div className="assistant-bg min-h-full px-4 pt-6 pb-40">
      <header className="flex items-center justify-between">
        <span className="wordmark text-[20px] text-pg-navy">PEGASUS</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pg-navy text-[13px] font-bold text-white">
          JF
        </span>
      </header>

      {phase === "idle" ? (
        <div className="pt-12 pb-6 text-center">
          <p className="serif text-[34px] leading-tight font-normal text-pg-navy">
            {greeting()}, Jack
          </p>
          <p className="mt-2 text-[15px] leading-snug text-pg-ink">
            Tell me where you want to go, or everything about the trip at once.
          </p>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3 pt-6 pb-4">
          <p className="min-w-0 flex-1 text-[15px] leading-snug text-pg-navy/80">
            <span className="text-pg-ink">You said: </span>
            {prompt}
          </p>
          <button
            type="button"
            onClick={reset}
            className="shrink-0 text-[13px] font-semibold text-pg-orange"
          >
            Start over
          </button>
        </div>
      )}

      <ChatBox
        profile={profile}
        onProfileChange={(next) => {
          setProfile(next);
          // A different party changes the answer, so rebuild rather than leaving
          // a trip on screen that no longer matches the context it was built in.
          if (draft !== null && prompt !== "") setDraft(buildDraft(prompt, next));
        }}
        onSubmit={run}
        busy={phase === "thinking"}
      />

      {phase === "idle" && (
        <p className="mt-6 text-center text-[11px] text-pg-ink">
          <a href="/credits" className="underline">
            Photography credits
          </a>
        </p>
      )}

      {phase === "idle" && (
        <div className="mt-7">
          <p className="px-1 text-[11px] font-bold tracking-wider text-pg-ink uppercase">
            Try
          </p>
          <div className="mt-2.5 space-y-3">
            {EXAMPLES.map((example) => (
              <button
                key={example.prompt}
                type="button"
                onClick={() => run(example.prompt)}
                className="pg-card relative block h-28 w-full overflow-hidden text-left"
              >
                <DestinationPhoto
                  code={example.code}
                  className="absolute inset-0 h-full w-full"
                />
                <span className="relative flex h-full flex-col justify-end p-4">
                  <span className="text-[19px] leading-tight font-bold text-white drop-shadow">
                    {example.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-white/90">
                    {example.prompt}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "thinking" && (
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-2xl bg-white"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
          <p className="text-center text-[13px] text-pg-ink">
            Filling in what you did not say…
          </p>
        </div>
      )}

      {phase === "discovery" && (
        <div className="mt-8">
          <Suggestions suggestions={suggestions} travellers={travellers} onChoose={choose} />
        </div>
      )}

      {phase === "trip" && draft !== null && (
        <div className="mt-8">
          <TripCard draft={draft} onChange={setDraft} total={total} />
        </div>
      )}

      {phase === "trip" && draft !== null && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-pg-line bg-white/95 px-4 pt-3 pb-5 backdrop-blur">
          <div className="mx-auto flex max-w-[358px] items-center gap-3">
            <span className="flex-1">
              <span className="block text-[12px] text-pg-ink">Total for {travellers}</span>
              <span className="block text-[20px] font-bold">{total.toFixed(2)} GBP</span>
            </span>
            <button
              type="button"
              onClick={() => setPhase("checkout")}
              className="rounded-full bg-pg-yellow px-7 py-3.5 text-[16px] font-bold text-pg-navy"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Price the draft.
 *
 * Fares come from the same deterministic inventory the rest of the mock uses,
 * so the number on this screen matches what the old funnel would have charged.
 */
function priceOf(draft: TripDraft): number {
  const flights = inventory(
    draft.origin.value,
    draft.destination.value,
    draft.departDate.value,
  );
  const flight = flights[0];
  if (flight === undefined) return 0;

  const people = draft.party.value.adults + draft.party.value.children;
  const base = flight.fares[draft.package.value] ?? 0;
  const includedKg = FARE_RULES[draft.package.value].inclusions.some((i) =>
    /25 Kg/.test(i.text),
  )
    ? 25
    : FARE_RULES[draft.package.value].inclusions.some((i) => /30 Kg/.test(i.text))
      ? 30
      : 0;

  let sum = base * people;
  // Only charge for baggage the fare does not already include.
  if (draft.checkedKg.value > includedKg) {
    sum +=
      (draft.checkedKg.value <= 12 ? BAGGAGE_PRICES.checked12 : BAGGAGE_PRICES.checked20) *
      people;
  }
  if (draft.cabinBag.value && draft.package.value === "light") {
    sum += BAGGAGE_PRICES.cabin * people;
  }
  if (draft.flexibility.value !== "none" && draft.package.value === "light") sum += 6 * people;

  const outbound = draft.returnDate.value === null ? 1 : 2;
  return Math.round(sum * outbound * 100) / 100;
}

/** Morning, afternoon or evening, from the clock. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
