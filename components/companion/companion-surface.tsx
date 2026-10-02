"use client";

import Link from "next/link";
import { useCompanion } from "./companion-provider";

/**
 * Where the companion appears.
 *
 * One component renders every channel from the brief's in-scope list, because the
 * channel is the companion's decision, not the screen's. A screen never chooses
 * how it gets interrupted.
 */
export function CompanionSurface() {
  const { intervention, dismiss, source, elapsedMs } = useCompanion();
  if (intervention === null) return null;

  if (intervention.channel === "lock-screen") return <LockScreen />;
  if (intervention.channel === "push") return <PushBanner />;
  return <InlineSheet />;

  function Badge() {
    return (
      <span className="rounded-full bg-pg-orange/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-pg-orange uppercase">
        {source === "jev" ? `Jev · ${elapsedMs ?? 0}ms` : "stub"}
      </span>
    );
  }

  function Action() {
    if (intervention === null || intervention.action === null) return null;
    return (
      <Link
        href={intervention.action.href}
        onClick={dismiss}
        className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-pg-orange px-4 py-3 text-sm font-semibold text-white"
      >
        {intervention.action.label}
      </Link>
    );
  }

  /* A notification sliding in over the app: the passenger is here, but was away. */
  function PushBanner() {
    if (intervention === null) return null;
    return (
      <div className="pointer-events-auto absolute inset-x-3 top-14 z-30 rounded-2xl bg-white/95 p-4 shadow-2xl ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pg-orange text-sm font-bold text-white">
            P
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold">{intervention.headline}</p>
              <Badge />
            </div>
            <p className="mt-1 text-[13px] leading-snug text-pg-ink">{intervention.detail}</p>
            <Action />
            <button
              onClick={dismiss}
              className="mt-2 w-full text-center text-[12px] font-medium text-pg-ink"
            >
              Not now
            </button>
          </div>
        </div>
        <Rationale />
      </div>
    );
  }

  /* An inline card at the bottom of the current screen. The quietest channel. */
  function InlineSheet() {
    if (intervention === null) return null;
    return (
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 rounded-t-3xl bg-white p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-pg-line" />
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-bold">{intervention.headline}</p>
          <Badge />
        </div>
        <p className="mt-1 text-[13px] leading-snug text-pg-ink">{intervention.detail}</p>
        <Action />
        <button onClick={dismiss} className="mt-2 w-full text-[12px] font-medium text-pg-ink">
          Dismiss
        </button>
        <Rationale />
      </div>
    );
  }

  /* The mocked Live Activity. Real ActivityKit is out of reach for a web mock, and
     faking the chrome is honest as long as the judgement underneath is real. */
  function LockScreen() {
    if (intervention === null) return null;
    return (
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-start bg-gradient-to-b from-[#1b2a4a] to-[#0a1020] px-4 pt-20 text-white">
        <p className="text-sm opacity-70">Wednesday 14 October</p>
        <p className="text-6xl font-light tracking-tight">09:41</p>
        <div className="mt-10 w-full rounded-3xl bg-white/12 p-4 backdrop-blur">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase opacity-80">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-pg-orange text-[10px]">
              P
            </span>
            Pegasus
          </div>
          <p className="mt-2 text-[15px] font-bold">{intervention.headline}</p>
          <p className="mt-1 text-[13px] leading-snug opacity-85">{intervention.detail}</p>
        </div>
        <button onClick={dismiss} className="mt-6 text-[12px] opacity-70">
          Tap to open
        </button>
      </div>
    );
  }

  /* Why it spoke. On screen during the demo, because invisible restraint reads as
     no restraint at all. */
  function Rationale() {
    if (intervention === null) return null;
    return (
      <details className="mt-3 rounded-lg bg-pg-surface p-2">
        <summary className="cursor-pointer text-[11px] font-semibold text-pg-ink">
          Why it spoke
        </summary>
        <p className="mt-1 text-[11px] leading-snug text-pg-ink">{intervention.rationale}</p>
      </details>
    );
  }
}
