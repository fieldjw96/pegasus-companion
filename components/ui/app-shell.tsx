"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { Wordmark } from "./primitives";
import { useLocalNav } from "@/components/phone-nav";

/**
 * The chrome every in-app screen shares: status bar, header, scrolling body,
 * an optional sticky footer, and the five-tab bar.
 *
 * The status bar is static on purpose. A live clock changes every screenshot,
 * and the canvas's 9:41 is the one every phone mockup uses.
 */
export function StatusBar({
  tone = "dark",
  dim = false,
}: {
  tone?: "dark" | "light";
  dim?: boolean;
}) {
  const color = tone === "dark" ? "text-pg-navy" : "text-white";
  return (
    <div
      aria-hidden
      className={`pointer-events-none flex h-11 shrink-0 items-center justify-between px-7 pt-3 text-[15px] font-semibold ${color} ${dim ? "opacity-30" : ""}`}
    >
      <span className="tabular">9:41</span>
      <span className="flex items-center gap-1.5">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg
          width="17"
          height="12"
          viewBox="0 0 17 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M1.5 4.2a10 10 0 0 1 14 0" />
          <path d="M4.2 7a6 6 0 0 1 8.6 0" />
          <circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect
            x="0.7"
            y="0.7"
            width="22.6"
            height="11.6"
            rx="3.6"
            stroke="currentColor"
            strokeOpacity="0.5"
            strokeWidth="1.2"
          />
          <rect x="2.4" y="2.4" width="16" height="8.2" rx="2" fill="currentColor" />
          <rect
            x="24.6"
            y="4.2"
            width="2"
            height="4.6"
            rx="1"
            fill="currentColor"
            fillOpacity="0.5"
          />
        </svg>
      </span>
    </div>
  );
}

/** Wordmark on the left, account on the right. The avatar joins once the companion is at work. */
export function AppHeader({
  user = "Jack Field",
  withAvatar = false,
}: {
  user?: string;
  withAvatar?: boolean;
}) {
  const initials = user
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2);
  return (
    <header className="flex h-11 shrink-0 items-center justify-between px-5">
      <Link href="/" className="flex items-center gap-2.5">
        {withAvatar && <Avatar size={32} />}
        <Wordmark size={22} className="text-pg-navy" />
      </Link>
      <button
        type="button"
        aria-label={`Account, ${user}`}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-pg-navy text-[14px] font-bold tracking-wide text-white"
      >
        {initials}
      </button>
    </header>
  );
}

const TABS = [
  { label: "Home", href: "/", icon: HomeIcon },
  { label: "My Flights", href: "/flights", icon: FlightsIcon },
  { label: "Check-in", href: "/", icon: CheckInIcon },
  { label: "Special Offers", href: "/", icon: OffersIcon },
  { label: "More", href: "/", icon: MoreIcon },
] as const;

/**
 * The five-tab bar. Only Home and My Flights route anywhere in this mock, and
 * only on the main phone: on the second phone the tabs are drawn, not wired,
 * because that phone has one story to tell.
 */
export function BottomNav({ active }: { active?: string }) {
  const pathname = usePathname();
  const local = useLocalNav();
  const current =
    active ??
    (pathname.startsWith("/flights") || pathname.startsWith("/group") ? "My Flights" : "Home");
  if (local !== null) {
    return (
      <nav
        aria-label="Main"
        className="flex shrink-0 border-t border-pg-line bg-white px-1 pb-[22px]"
      >
        {TABS.map((tab) => {
          const on = tab.label === current;
          const Icon = tab.icon;
          return (
            <span
              key={tab.label}
              className={`flex min-h-[60px] flex-1 flex-col items-center gap-[5px] ${
                on ? "text-pg-navy" : "text-pg-ink"
              }`}
            >
              <span
                className={`mb-[3px] h-[3px] w-7 rounded-b-[3px] ${on ? "bg-pg-orange" : ""}`}
              />
              <Icon />
              <span className={`text-[11px] ${on ? "font-bold" : "font-semibold"}`}>
                {tab.label}
              </span>
            </span>
          );
        })}
      </nav>
    );
  }
  return (
    <nav
      aria-label="Main"
      className="flex shrink-0 border-t border-pg-line bg-white px-1 pb-[22px]"
    >
      {TABS.map((tab) => {
        const on = tab.label === current;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-[60px] flex-1 flex-col items-center gap-[5px] ${
              on ? "text-pg-navy" : "text-pg-ink"
            }`}
          >
            <span
              className={`mb-[3px] h-[3px] w-7 rounded-b-[3px] ${on ? "bg-pg-orange" : ""}`}
            />
            <Icon />
            <span className={`text-[11px] ${on ? "font-bold" : "font-semibold"}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Status bar, header, body, optional footer, nav. The body scrolls; everything
 * else stays put, which is what makes it read as an app rather than a page.
 */
export function AppShell({
  children,
  footer,
  header = <AppHeader />,
  nav = true,
  active,
  bodyClassName = "",
  overlay,
}: {
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode | null;
  nav?: boolean;
  active?: string;
  bodyClassName?: string;
  /** A sheet or scrim drawn over the whole screen. */
  overlay?: ReactNode;
}) {
  return (
    <div className="relative flex h-full flex-col bg-pg-surface text-pg-navy">
      <StatusBar />
      {header}
      <main className={`no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 ${bodyClassName}`}>
        {children}
      </main>
      {footer}
      {nav && <BottomNav active={active} />}
      {overlay}
    </div>
  );
}

/** The sticky bar with the running total and the one primary action. */
export function TotalFooter({
  line,
  total,
  children,
}: {
  line: string;
  total: string;
  children: ReactNode;
}) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-between gap-4 border-t border-pg-line bg-white px-5 py-3"
      style={{ boxShadow: "0 -10px 28px rgba(31,42,55,0.08)" }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] leading-[18px] text-pg-ink">{line}</span>
        <span className="tabular text-[18px] leading-6 font-extrabold">{total}</span>
      </div>
      {children}
    </div>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5h12V10" />
    </svg>
  );
}
function FlightsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M3 12.5 20.5 5l-5 15-3.5-6.5L3 12.5Z" />
      <path d="M12 13.5 20.5 5" />
    </svg>
  );
}
function CheckInIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M15 6v12" strokeDasharray="2 2.4" />
      <path d="M7 10.5h4" />
      <path d="M7 13.5h3" />
    </svg>
  );
}
function OffersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M12.5 3.5h8v8l-9 9-8-8 9-9Z" />
      <circle cx="16.5" cy="7.5" r="1.2" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5.5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="18.5" cy="12" r="1.8" />
    </svg>
  );
}
