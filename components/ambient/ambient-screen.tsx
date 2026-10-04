"use client";

import { useMemo, useState } from "react";
import { ChatBox } from "@/components/assistant/chat-box";
import { Checkout } from "@/components/assistant/checkout";
import { Suggestions } from "@/components/assistant/suggestions";
import { TripCard } from "@/components/assistant/trip-card";
import { DestinationPhoto } from "@/components/assistant/destination-photo";
import { PROFILES, type Profile } from "@/lib/assistant/profiles";
import { propose, type Proposal } from "@/lib/assistant/propose";
import { buildDraft, extract } from "@/lib/assistant/understand";
import { suggest, type Suggestion } from "@/lib/assistant/discover";
import { priceOf } from "@/lib/assistant/price";
import type { TripDraft } from "@/lib/assistant/draft";
import { AIRPORTS, formatFare } from "@/lib/journey/flights";

/**
 * Direction C: it has already decided.
 *
 * The other two open on an empty box and wait to be told something. This one
 * opens on a finished trip and waits to be corrected. That is a far bigger
 * claim, and it only survives contact with a sceptic if the proposal can
 * justify itself -- so the reasons are on the first screen, above the price,
 * and so is the thing most likely to make it wrong.
 *
 * Three ways out, in the order people actually use them: accept, adjust,
 * or start again. The chat box is present but demoted, because asking for it
 * is the exception here rather than the entry point.
 */

type Phase = "proposal" | "adjusting" | "thinking" | "discovery" | "trip" | "checkout";

export function AmbientScreen() {
  const [profile, setProfile] = useState<Profile>(PROFILES[2] ?? PROFILES[0]!);
  const initial = useState(() => propose(PROFILES[2] ?? PROFILES[0]!))[0];
  const [proposal, setProposal] = useState<Proposal>(initial);
  const [draft, setDraft] = useState<TripDraft>(initial.draft);
  const [phase, setPhase] = useState<Phase>("proposal");
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  /**
   * Switching trip type produces a different proposal, not a filtered one.
   *
   * Done here rather than in an effect: it is an event, and syncing it through
   * state would cascade a render for no reason. See "You Might Not Need an
   * Effect".
   */
  function chooseProfile(next: Profile): void {
    const fresh = propose(next);
    setProfile(next);
    setProposal(fresh);
    setDraft(fresh.draft);
    setPrompt("");
    setSuggestions([]);
    setPhase("proposal");
  }

  const total = useMemo(() => priceOf(draft), [draft]);
  const travellers = profile.travellers.filter((t) => t.kind !== "infant").length;
  const city =
    AIRPORTS[draft.destination.value as keyof typeof AIRPORTS]?.city ??
    draft.destination.value;

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
        setPhase("discovery");
        return;
      }
      setDraft(buildDraft(text, profile));
      setSuggestions([]);
      setPhase("trip");
    }, 600);
  }

  if (phase === "checkout") {
    return (
      <div className="assistant-bg min-h-full">
        <Checkout draft={draft} total={total} onBack={() => setPhase("proposal")} />
      </div>
    );
  }

  return (
    <div className="assistant-bg min-h-full pb-28">
      {phase === "proposal" && (
        <>
          <div className="relative h-[340px]">
            <DestinationPhoto
              code={draft.destination.value}
              className="absolute inset-0 h-full w-full"
              priority
            />
            <div className="relative flex h-full flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <span className="wordmark text-[18px] text-white">PEGASUS</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-[13px] font-bold text-white backdrop-blur">
                  JF
                </span>
              </div>
              <div>
                <p className="text-[12px] font-bold tracking-widest text-white/85 uppercase">
                  {greeting()}, Jack — I have one ready
                </p>
                <h1 className="mt-1.5 text-[30px] leading-[1.08] font-bold text-white drop-shadow">
                  {proposal.headline}
                </h1>
                <p className="mt-2 text-[15px] text-white/90">
                  {formatFare(total)} GBP for {travellers} · tap to see how I got there
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 pt-5">
            <section className="pg-card p-5">
              <p className="text-[11px] font-bold tracking-widest text-pg-ink uppercase">
                Why this
              </p>
              <ul className="mt-2.5 space-y-2">
                {proposal.because.map((reason) => (
                  <li key={reason} className="flex gap-2.5 text-[14px] leading-snug">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pg-yellow" />
                    {reason}
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-pg-line pt-3 text-[13px] leading-snug text-pg-ink">
                {proposal.caveat}
              </p>
            </section>

            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={() => setPhase("checkout")}
                className="w-full rounded-full bg-pg-yellow py-4 text-[17px] font-bold text-pg-navy"
              >
                That is right — {formatFare(total)} GBP
              </button>
              <button
                type="button"
                onClick={() => setPhase("adjusting")}
                className="w-full rounded-full bg-white py-3.5 text-[15px] font-bold text-pg-navy ring-1 ring-pg-line"
              >
                Close, but change something
              </button>
              <button
                type="button"
                onClick={() => setPhase("adjusting")}
                className="w-full py-2 text-[14px] font-semibold text-pg-orange"
              >
                Somewhere else entirely
              </button>
            </div>

            <p className="mt-5 text-center text-[11px] text-pg-ink">
              <a href="/credits" className="underline">
                Photography credits
              </a>
            </p>
          </div>
        </>
      )}

      {phase !== "proposal" && (
        <div className="px-4 pt-6">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-[15px] leading-snug">
              {prompt === "" ? (
                <span className="text-pg-ink">Change anything, or tell me something new.</span>
              ) : (
                <>
                  <span className="text-pg-ink">You said: </span>
                  {prompt}
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setDraft(proposal.draft);
                setPrompt("");
                setSuggestions([]);
                setPhase("proposal");
              }}
              className="shrink-0 text-[13px] font-semibold text-pg-orange"
            >
              Back
            </button>
          </div>

          <div className="mt-4">
            <ChatBox
              profile={profile}
              onProfileChange={chooseProfile}
              onSubmit={run}
              busy={phase === "thinking"}
            />
          </div>

          {phase === "thinking" && (
            <div className="mt-7 space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-2xl bg-white"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          )}

          {phase === "discovery" && (
            <div className="mt-7">
              <Suggestions
                suggestions={suggestions}
                travellers={travellers}
                onChoose={(code) => {
                  setDraft(buildDraft(`${prompt} to ${code}`, profile));
                  setSuggestions([]);
                  setPhase("trip");
                }}
              />
            </div>
          )}

          {(phase === "adjusting" || phase === "trip") && (
            <div className="mt-7">
              <TripCard draft={draft} onChange={setDraft} total={total} />
              <button
                type="button"
                onClick={() => setPhase("checkout")}
                className="mt-4 w-full rounded-full bg-pg-yellow py-4 text-[17px] font-bold text-pg-navy"
              >
                Book {city} — {formatFare(total)} GBP
              </button>
            </div>
          )}
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
