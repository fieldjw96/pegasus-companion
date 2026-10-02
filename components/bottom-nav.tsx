import Link from "next/link";

/**
 * The five-tab bar, pinned to the bottom of every screen in the real app.
 *
 * Only Home routes anywhere in this mock. The other four exist because their
 * absence is the first thing that reads as "this is a web page, not the app".
 */
const TABS = [
  { label: "Home", href: "/", icon: HomeIcon },
  { label: "My Flights", href: "/", icon: PlaneIcon },
  { label: "Check-in", href: "/", icon: PinIcon },
  { label: "Special Offers", href: "/", icon: MegaphoneIcon },
  { label: "More", href: "/", icon: MoreIcon },
] as const;

export function BottomNav({ active = "Home" }: { active?: string }) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-around border-t border-pg-line bg-white/95 px-1 pt-2 pb-5 backdrop-blur">
      {TABS.map((tab) => {
        const on = tab.label === active;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <Icon className={on ? "text-pg-yellow" : "text-pg-ink"} />
            <span
              className={`truncate text-[10px] ${on ? "font-bold text-pg-yellow" : "text-pg-ink"}`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

type IconProps = { className?: string };

function HomeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={`h-6 w-6 ${className ?? ""}`}
    >
      <path d="M3 10.5 12 4l9 6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9h14v-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 19v-5h6v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlaneIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={`h-6 w-6 ${className ?? ""}`}
    >
      <path
        d="M21 15.5 3 9.8l2-1.6 5.6 1.3 4.1-3.3a2 2 0 1 1 2.5 2.5l-3.3 4.1 1.3 5.6-1.6 2z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={`h-6 w-6 ${className ?? ""}`}
    >
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function MegaphoneIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={`h-6 w-6 ${className ?? ""}`}
    >
      <path d="M4 10v4a1 1 0 0 0 1 1h3l6 4V5L8 9H5a1 1 0 0 0-1 1z" strokeLinejoin="round" />
      <path d="M17.5 9a4 4 0 0 1 0 6" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`h-6 w-6 ${className ?? ""}`}
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
