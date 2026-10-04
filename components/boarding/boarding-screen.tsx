"use client";

import { useMemo, useState } from "react";
import { BoardingPass } from "./boarding-pass";
import { ChatBox } from "@/components/assistant/chat-box";
import { Suggestions } from "@/components/assistant/suggestions";
import { Checkout } from "@/components/assistant/checkout";
import { DestinationPhoto } from "@/components/assistant/destination-photo";
import { PROFILES, type Profile } from "@/lib/assistant/profiles";
import { buildDraft, extract } from "@/lib/assistant/understand";
import { suggest, type Suggestion } from "@/lib/assistant/discover";
import type { TripDraft } from "@/lib/assistant/draft";
import { priceOf } from "@/lib/assistant/price";

/**
 * Direction B.
 *
 * Same brain as A, different claim about what a booking is. Here the output is
 * an object you hold rather than a record you review: the pass prints, and the
 * parts the assistant worked out are marked on the pass itself.
 *
 * The idle screen is deliberately quieter than A's. The pass is the hero, so
 * nothing above it competes: a line, a box, three places.
 */

const EXAMPLES = [
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

type Phase = "idle" | "thinking" | "discovery" | "pass" | "checkout";

export function BoardingScreen() {
  const [profile, setProfile] = useState<Profile>(PROFILES[2] ?? PROFILES[0]!);
  const [phase, setPhase] = useState<Phase>("idle");
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<TripDraft | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const total = useMemo(() => (draft === null ? 0 : priceOf(draft)), [draft]);
  const travellers = profile.travellers.filter((t) => t.kind !== "infant").length;

  function run(text: string): void {
    setPrompt(text);
    setPhase("thinking");
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
      setPhase("pass");
    }, 650);
  }

  if (phase === "checkout" && draft !== null) {
    return (
      <div className="assistant-bg min-h-full">
        <Checkout draft={draft} total={total} onBack={() => setPhase("pass")} />
      </div>
    );
  }

  return (
    <div className="assistant-bg min-h-full px-4 pt-6 pb-28">
      <header className="flex items-center justify-between">
        <span className="wordmark text-[20px] text-pg-navy">PEGASUS</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pg-navy text-[13px] font-bold text-white">
          JF
        </span>
      </header>

      {phase === "idle" && (
        <div className="pt-10 pb-5">
          <p className="text-[13px] font-bold tracking-widest text-pg-ink uppercase">
            {greeting()}, Jack
          </p>
          <h1 className="mt-2 text-[30px] leading-[1.1] font-bold tracking-tight">
            Say it once.
            <br />
            We will print the pass.
          </h1>
        </div>
      )}

      {phase !== "idle" && (
        <div className="flex items-start justify-between gap-3 pt-5 pb-4">
          <p className="min-w-0 flex-1 text-[14px] leading-snug text-pg-navy/80">
            <span className="text-pg-ink">You said: </span>
            {prompt}
          </p>
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setDraft(null);
              setSuggestions([]);
              setPrompt("");
            }}
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
          if (draft !== null && prompt !== "") setDraft(buildDraft(prompt, next));
        }}
        onSubmit={run}
        busy={phase === "thinking"}
      />

      {phase === "idle" && (
        <div className="mt-7">
          <p className="px-1 text-[11px] font-bold tracking-wider text-pg-ink uppercase">
            Or start from one of these
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example.prompt}
                type="button"
                onClick={() => run(example.prompt)}
                className="relative h-28 overflow-hidden rounded-2xl text-left"
              >
                <DestinationPhoto
                  code={example.code}
                  className="absolute inset-0 h-full w-full"
                />
                <span className="relative flex h-full items-end p-2.5">
                  <span className="text-[13px] leading-tight font-bold text-white drop-shadow">
                    {example.title}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-5 text-center text-[11px] text-pg-ink">
            <a href="/credits" className="underline">
              Photography credits
            </a>
          </p>
        </div>
      )}

      {phase === "thinking" && (
        <div className="mt-8">
          <div className="h-[420px] animate-pulse rounded-[1.5rem] bg-white/80" />
          <p className="mt-3 text-center text-[13px] text-pg-ink">Printing your pass…</p>
        </div>
      )}

      {phase === "discovery" && (
        <div className="mt-8">
          <Suggestions
            suggestions={suggestions}
            travellers={travellers}
            onChoose={(code) => {
              setDraft(buildDraft(`${prompt} to ${code}`, profile));
              setSuggestions([]);
              setPhase("pass");
            }}
          />
        </div>
      )}

      {phase === "pass" && draft !== null && (
        <div className="mt-8">
          <BoardingPass
            draft={draft}
            onChange={setDraft}
            total={total}
            onCheckout={() => setPhase("checkout")}
          />
        </div>
      )}
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
