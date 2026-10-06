import type { ReactNode } from "react";
import { StatusBar } from "./app-shell";

/**
 * A lock screen: navy wallpaper, the date and a big Archivo clock, and
 * whatever notification or Live Activity the scene puts on it.
 *
 * This is where the companion does most of its talking in Part 3. The app is
 * not open. That is the point: a companion that only exists inside the app is
 * a feature; one that reaches you on the lock screen with a reason is a
 * colleague.
 */
export function LockScreen({
  date,
  time,
  children,
  dim = false,
  bottom = 116,
  onTap,
}: {
  date: string;
  time: string;
  children: ReactNode;
  /** Dimmed clock and status, for when a card is expanded over them. */
  dim?: boolean;
  /** Distance from the bottom edge to the card. */
  bottom?: number;
  /** Tapping the wallpaper. */
  onTap?: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-pg-navy text-pg-navy">
      <span
        aria-hidden
        className="absolute rounded-full bg-white/[0.045]"
        style={{ left: -140, top: 300, width: 560, height: 560 }}
      />
      <span
        aria-hidden
        className="absolute rounded-full bg-pg-yellow/[0.08]"
        style={{ left: 130, top: 520, width: 460, height: 460 }}
      />
      <StatusBar tone="light" dim={dim} />
      <button
        type="button"
        onClick={onTap}
        aria-label={onTap === undefined ? undefined : "Open the phone"}
        className={`relative flex cursor-default flex-col items-center pt-3.5 text-white ${
          dim ? "opacity-30" : ""
        }`}
      >
        <svg width="18" height="22" viewBox="0 0 18 22" fill="#FFFFFF" aria-hidden>
          <rect x="2" y="9" width="14" height="12" rx="3" />
          <path
            d="M5 9V6.5a4 4 0 0 1 8 0V9"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
        <span className="mt-2.5 text-[20px] leading-[26px] font-semibold">{date}</span>
        <span
          className="display font-extrabold tracking-[-0.02em]"
          style={{ fontSize: dim ? 64 : 88, lineHeight: dim ? "66px" : "90px" }}
        >
          {time}
        </span>
      </button>
      <div className="absolute inset-x-2.5" style={{ bottom }}>
        {children}
      </div>
      <div
        aria-hidden
        className="absolute inset-x-[46px] bottom-11 flex justify-between"
        style={{ opacity: dim ? 0 : 1 }}
      >
        <span className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-white/[0.14]">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3h8v3l-2 3v11a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V9L8 6V3Z" />
            <path d="M12 12v2.5" />
          </svg>
        </span>
        <span className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-white/[0.14]">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
      </div>
      <span
        aria-hidden
        className="absolute bottom-2 left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-[3px] bg-white"
      />
    </div>
  );
}

/** The white card a notification or a Live Activity sits in. */
export function LockCard({
  children,
  label,
  radius = 28,
  className = "",
}: {
  children: ReactNode;
  label: string;
  radius?: number;
  className?: string;
}) {
  return (
    <section
      aria-label={label}
      className={`spring-up flex flex-col bg-white p-4 text-pg-navy ${className}`}
      style={{ borderRadius: radius, boxShadow: "var(--shadow-float)" }}
    >
      {children}
    </section>
  );
}
