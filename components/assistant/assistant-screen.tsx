"use client";

import { useMemo, useState } from "react";
import { ChatBox } from "./chat-box";
import { PegasusAvatar, PegasusSays } from "./pegasus-avatar";
import { Suggestions } from "./suggestions";
import { Ticket } from "./ticket";
import { DestinationPhoto } from "./destination-photo";
import { Checkout } from "./checkout";
import { PROFILES, type Profile } from "@/lib/assistant/profiles";
import { buildDraft, extract } from "@/lib/assistant/understand";
import { suggest, type Suggestion } from "@/lib/assistant/discover";
import type { TripDraft } from "@/lib/assistant/draft";
import { priceOf } from "@/lib/assistant/price";

/**
 * The whole assistant surface.
 *
 * One screen, three states, in the order a passenger actually moves through
 * them: greeting, then either discovery or a built trip, then checkout. There
 * is no funnel to walk, and nothing is hidden behind a step the passenger has
 * not reached yet.
 *
 * The assistant has a face, and it is the same face everywhere — over the
 * greeting, beating its wings while it works, and beside every sentence it says
 * in its own voice. That is not decoration. Something that fills in six fields
 * on your behalf needs an author those six fields can be attributed to, or they
 * read as the app's defaults rather than as somebody's suggestion you are
 * allowed to argue with.
 *
 * The thinking delay is the only piece of theatre here. An answer that appears
 * instantly reads as a lookup; a short pause reads as work. Everything behind it
 * is deterministic, so a rehearsal and the live run give the same answer.
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

  const adultsAndChildren = profile.travellers.filter((t) => t.kind !== "infant");
  const travellers = adultsAndChildren.length;
  const travellerNames = adultsAndChildren.map((t) => t.name);

  const chatBox = (
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
      placeholder={
        phase === "idle"
          ? "Where are we going? Or tell me the whole trip at once."
          : "Make it the 20th instead. Or add a bag. Or start again somewhere else."
      }
      action={phase === "idle" ? "Plan it" : "Redo it"}
    />
  );

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
        <span className="flex items-center gap-2">
          {phase !== "idle" && (
            /* Once the conversation has started the assistant stays on screen,
               so everything it suggested keeps an author. */
            <PegasusAvatar size={32} state={phase === "thinking" ? "thinking" : "idle"} />
          )}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pg-navy text-[13px] font-bold text-white">
            JF
          </span>
        </span>
      </header>

      {phase === "idle" ? (
        <div className="pt-6 pb-6 text-center">
          <PegasusAvatar size={120} className="pg-float mx-auto block" />
          {/* The label does the work the badge starts: this is an agent, not
              mascot art. The old sub-line repeated the input's placeholder. */}
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold tracking-wider text-pg-navy uppercase ring-1 ring-pg-line">
            <span className="text-pg-yellow-dark" aria-hidden>
              ✦
            </span>
            Your AI companion
          </p>
          <p className="mt-3 text-[32px] leading-tight font-bold tracking-tight text-pg-navy">
            {greeting()}, Jack
          </p>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3 pt-5 pb-1">
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

      {phase === "idle" && chatBox}

      {/* Photography is credited on /credits, linked from the confirmation
          screen rather than from under the greeting, where it was clutter. */}
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
        <div className="mt-10 flex flex-col items-center">
          <PegasusAvatar size={88} state="thinking" />
          <p className="mt-4 text-[14px] text-pg-ink">Filling in what you did not say…</p>
        </div>
      )}

      {phase === "discovery" && (
        <div className="mt-8">
          <PegasusSays>
            You did not name anywhere, so here is what I would pick for a{" "}
            {profile.label.toLowerCase()} — priced for {travellers} and already carrying
            everything you usually book.
          </PegasusSays>
          <div className="mt-4">
            <Suggestions suggestions={suggestions} travellers={travellers} onChoose={choose} />
          </div>
        </div>
      )}

      {phase === "trip" && draft !== null && (
        <div className="mt-6">
          <Ticket
            draft={draft}
            onChange={setDraft}
            travellerNames={travellerNames}
            onCheckout={() => setPhase("checkout")}
          />
        </div>
      )}

      {(phase === "discovery" || phase === "trip") && (
        /* The input moves below the answer once there is an answer. Keeping it
           at the top cost about 220px, which put the whole ticket under the
           fold on a 390x844 screen — the thing the demo is for was the thing
           you could not see. */
        <div className="mt-8 border-t border-pg-line pt-6">
          <p className="mb-2.5 px-1 text-[11px] font-bold tracking-wider text-pg-ink uppercase">
            Change it in a sentence
          </p>
          {chatBox}
        </div>
      )}
    </div>
  );
}

/** Morning, afternoon or evening, from the clock. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
