"use client";

import { useState } from "react";
import { ArrowRight, MicIcon } from "./primitives";

/**
 * The one input in the app: a sentence, typed or spoken.
 *
 * It is the same card on the greeting ("Plan it") and under a ticket ("Redo
 * it"). There is no transcript and no reply bubble; the companion answers with
 * a ticket, not with text, which is what keeps this from being a chatbot.
 */
export function SentenceBox({
  placeholder,
  action,
  onSubmit,
  busy = false,
  label = "Describe your trip",
}: {
  placeholder: string;
  action: string;
  onSubmit: (sentence: string) => void;
  busy?: boolean;
  label?: string;
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
    <div className="pg-card flex flex-col gap-3 py-[18px] pr-4 pb-3.5 pl-5">
      <textarea
        rows={2}
        aria-label={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={placeholder}
        className="h-[52px] w-full resize-none bg-transparent text-[17px] leading-[26px] font-medium outline-none"
      />
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3">
          <button
            type="button"
            aria-label={listening ? "Stop listening" : "Speak your trip"}
            aria-pressed={listening}
            onClick={() => setListening((v) => !v)}
            className={`-ml-1.5 flex h-12 w-12 items-center justify-center rounded-full transition ${
              listening ? "bg-pg-orange text-white" : "bg-pg-surface text-pg-navy"
            }`}
          >
            <MicIcon />
          </button>
          {listening && (
            /* Mock only. A real build wires the Web Speech API here; the button
               exists because voice is a first-class way in, not an afterthought. */
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-pg-orange">
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
        </span>
        <button
          type="button"
          onClick={send}
          disabled={text.trim() === "" || busy}
          className="pg-primary flex h-12 items-center gap-2 pr-5 pl-6 text-[16px]"
        >
          <span>{busy ? "Thinking" : action}</span>
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}
