"use client";

import { useState } from "react";
import { PROFILES, type Profile } from "@/lib/assistant/profiles";

/**
 * The input, the voice button, and the booking-type selector under it.
 *
 * The selector is not a filter: picking "Family holiday" is how the assistant
 * learns that Ayse and Mila are coming and that Mila is four. What it
 * remembered used to be listed as a row of chips underneath, which crowded the
 * screen and said the same thing twice -- the trip card already shows every
 * remembered value, in context, with a reason. One quiet line here is enough.
 */
export function ChatBox({
  profile,
  onProfileChange,
  onSubmit,
  busy,
  placeholder = "Where are we going? Or tell me the whole trip at once.",
  action = "Plan it",
}: {
  profile: Profile;
  onProfileChange: (next: Profile) => void;
  onSubmit: (prompt: string) => void;
  busy: boolean;
  /** Changes once a trip exists: the ask is no longer "where", it is "what else". */
  placeholder?: string;
  action?: string;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);

  function send(): void {
    const trimmed = text.trim();
    if (trimmed === "" || busy) return;
    onSubmit(trimmed);
    setText("");
  }

  const party = profile.travellers.map((t) => t.name.split(" ")[0]).join(", ");

  return (
    <div>
      <div className="pg-card p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent px-2 pt-1 text-[16px] leading-snug outline-none placeholder:text-pg-ink/70"
        />

        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            aria-label={listening ? "Stop listening" : "Speak instead"}
            aria-pressed={listening}
            onClick={() => setListening((v) => !v)}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
              listening ? "bg-pg-orange text-white" : "bg-pg-surface text-pg-navy"
            }`}
          >
            <MicIcon />
          </button>

          {listening && (
            /* Mock only. A real build wires the Web Speech API here; the button
               exists on this screen because voice is a first-class way in, not
               an afterthought bolted to a form. */
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-pg-orange">
              <span className="flex items-end gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="w-0.5 animate-pulse rounded-full bg-pg-orange"
                    style={{
                      height: `${8 + ((i * 7) % 12)}px`,
                      animationDelay: `${i * 120}ms`,
                    }}
                  />
                ))}
              </span>
              Listening
            </span>
          )}

          <button
            type="button"
            onClick={send}
            disabled={text.trim() === "" || busy}
            className="ml-auto flex h-11 items-center rounded-full bg-pg-yellow px-6 text-[15px] font-bold text-pg-navy transition disabled:opacity-30"
          >
            {busy ? "Thinking" : action}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-pg-line">
        <span className="text-[11px] font-bold tracking-wider text-pg-ink uppercase">
          Trip
        </span>
        <select
          aria-label="What kind of trip"
          value={profile.id}
          onChange={(e) => {
            const next = PROFILES.find((p) => p.id === e.target.value);
            if (next !== undefined) onProfileChange(next);
          }}
          className="min-w-0 flex-1 bg-transparent text-[15px] font-bold outline-none"
        >
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1.5 px-1 text-[12px] text-pg-ink">
        {party} · remembered from your past {profile.label.toLowerCase()} bookings
      </p>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" strokeLinecap="round" />
      <path d="M12 18v3" strokeLinecap="round" />
    </svg>
  );
}
