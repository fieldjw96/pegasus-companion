"use client";

import { useState } from "react";
import { PROFILES, type Profile } from "@/lib/assistant/profiles";

/**
 * The input, the voice button, and the booking-type selector under it.
 *
 * The selector is the unusual part and the one worth explaining in the pitch:
 * it is not a filter, it is a remembered context. Picking "Family holiday"
 * tells the assistant who is coming, that one of them is four, and what that
 * party has always needed — none of which a passenger should have to retype.
 *
 * The chips under it show what was remembered. A profile that silently changes
 * the booking is indistinguishable from a bug.
 */
export function ChatBox({
  profile,
  onProfileChange,
  onSubmit,
  busy,
}: {
  profile: Profile;
  onProfileChange: (next: Profile) => void;
  onSubmit: (prompt: string) => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);

  function send(): void {
    const trimmed = text.trim();
    if (trimmed === "" || busy) return;
    onSubmit(trimmed);
    setText("");
  }

  return (
    <div>
      <div className="rounded-3xl border border-pg-edge bg-white p-3 shadow-[0_8px_30px_rgba(31,42,55,0.06)]">
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
          placeholder="Where are we going? Or tell me the whole trip at once."
          className="w-full resize-none bg-transparent px-2 pt-1 text-[16px] leading-snug outline-none placeholder:text-pg-soft"
        />

        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            aria-label={listening ? "Stop listening" : "Speak instead"}
            aria-pressed={listening}
            onClick={() => setListening((v) => !v)}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
              listening ? "bg-pg-orange text-white" : "bg-pg-mist text-pg-navy"
            }`}
          >
            <MicIcon />
          </button>

          {listening && (
            /* Mock only. A real build would wire the Web Speech API here; the
               point of the button on this screen is that voice is a first-class
               way in, not an afterthought bolted to a form. */
            <span className="flex items-center gap-1.5 text-[13px] text-pg-orange">
              <span className="flex gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="w-0.5 animate-pulse rounded bg-pg-orange"
                    style={{
                      height: `${8 + ((i * 7) % 12)}px`,
                      animationDelay: `${i * 120}ms`,
                    }}
                  />
                ))}
              </span>
              Listening…
            </span>
          )}

          <button
            type="button"
            onClick={send}
            disabled={text.trim() === "" || busy}
            className="ml-auto flex h-10 items-center gap-2 rounded-full bg-pg-yellow px-5 text-[15px] font-bold text-pg-navy disabled:opacity-35"
          >
            {busy ? "Thinking…" : "Plan it"}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-[12px] font-medium text-pg-soft" htmlFor="booking-type">
          What kind of trip?
        </label>
        <select
          id="booking-type"
          value={profile.id}
          onChange={(e) => {
            const next = PROFILES.find((p) => p.id === e.target.value);
            if (next !== undefined) onProfileChange(next);
          }}
          className="mt-1 w-full rounded-xl border border-pg-edge bg-white px-3 py-2.5 text-[15px] font-semibold outline-none"
        >
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} — {p.blurb}
            </option>
          ))}
        </select>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {profile.remembers.map((item) => (
            <span
              key={item}
              className="rounded-full bg-pg-mist px-2.5 py-1 text-[12px] text-pg-navy/80"
            >
              {item}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-snug text-pg-soft">
          Remembered from your past {profile.label.toLowerCase()} bookings. Anything you say
          overrides it.
        </p>
      </div>
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
