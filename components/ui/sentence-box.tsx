"use client";

import { useRef, useState, useSyncExternalStore } from "react";
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
  // Jamie version: real speech-to-text where the browser has it (Chrome,
  // Safari), and no mic button at all where it does not.
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const rec = useRef<SpeechRec | null>(null);
  const voice = useSyncExternalStore(
    () => () => {},
    () => (speechCtor() === null ? "no" : "yes"),
    () => "unknown",
  );

  function toggleVoice(): void {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = speechCtor();
    if (Ctor === null) return;
    const r = new Ctor();
    r.lang = "en-GB";
    r.interimResults = true;
    r.continuous = false;
    let heard = "";
    r.onresult = (e) => {
      heard = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ");
      setText(heard);
    };
    r.onerror = (e) => {
      setVoiceNote(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Microphone blocked here. Type it instead."
          : "Didn't catch that. Try again or type it.",
      );
    };
    r.onend = () => {
      setListening(false);
      const trimmed = heard.trim();
      if (trimmed !== "" && !busy) {
        onSubmit(trimmed);
        setText("");
      }
    };
    rec.current = r;
    setVoiceNote(null);
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setVoiceNote("Microphone blocked here. Type it instead.");
    }
  }

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
          {voice !== "no" && (
            <button
              type="button"
              aria-label={listening ? "Stop listening" : "Speak your trip"}
              aria-pressed={listening}
              onClick={toggleVoice}
              className={`-ml-1.5 flex h-12 w-12 items-center justify-center rounded-full transition ${
                listening ? "bg-pg-orange text-white" : "bg-pg-surface text-pg-navy"
              }`}
            >
              <MicIcon />
            </button>
          )}
          {voiceNote !== null && !listening && (
            <span className="text-[12px] leading-4 font-semibold text-pg-ink">
              {voiceNote}
            </span>
          )}
          {listening && (
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

/* The browser's speech recogniser, typed just enough for this box. */
type SpeechRecEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
