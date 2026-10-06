import Link from "next/link";
import type { ReactNode } from "react";
import type { Source } from "@/lib/assistant/draft";

/** PEGASUS, in Archivo black, slanted. */
export function Wordmark({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`wordmark ${className}`} style={{ fontSize: size, lineHeight: 1 }}>
      PEGASUS
    </span>
  );
}

/** The square yellow "P" app icon used on notifications and Live Activities. */
export function AppIcon({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center bg-pg-yellow"
      style={{ width: size, height: size, borderRadius: size * 0.27 }}
    >
      <span
        className="wordmark text-pg-navy"
        style={{ fontSize: size * 0.64, lineHeight: 1, transform: "skewX(12deg)" }}
      >
        P
      </span>
    </span>
  );
}

/** A four-point sparkle, the mark of the companion. */
export function Sparkle({ size = 12, color = "#1F2A37" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <path
        d="M10 0.5 C11 7 13 9 19.5 10 C13 11 11 13 10 19.5 C9 13 7 11 0.5 10 C7 9 9 7 10 0.5 Z"
        fill={color}
      />
    </svg>
  );
}

/** A tick in a yellow disc. */
export function Tick({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <circle cx="10" cy="10" r="10" fill="#FDB913" />
      <path
        d="M5.8 10.3l2.8 2.8 5.6-6"
        fill="none"
        stroke="#1F2A37"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Initials in a disc. Navy for someone who has booked or is you; surface for the rest. */
export function Initials({
  name,
  size = 40,
  tone = "navy",
  className = "",
}: {
  name: string;
  size?: number;
  tone?: "navy" | "surface";
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold tracking-wide ${
        tone === "navy" ? "bg-pg-navy text-white" : "bg-pg-surface text-pg-navy"
      } ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.33) }}
    >
      {initials}
    </span>
  );
}

/**
 * Provenance tag. Four sources, four looks, so they can be told apart at 11px:
 * you said (navy fill), remembered (surface, hairline), predicted (dotted),
 * and from an organiser (white, with their initials, the only tag with a face).
 */
export function Tag({ source, from }: { source: Source; from?: string }) {
  if (source === "shared") {
    return (
      <span className="tag tag-shared">
        <Initials name={from ?? "?"} size={16} />
        from {(from ?? "").split(" ")[0]}
      </span>
    );
  }
  const label = { said: "you said", profile: "remembered", predicted: "predicted" }[source];
  return <span className={`tag tag-${source}`}>{label}</span>;
}

export function LookTag() {
  return <span className="tag tag-look">worth a look</span>;
}

/** Orange text link, the only place orange is used as a colour on text. */
export function TextButton({
  children,
  onClick,
  href,
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const cls = `inline-flex min-h-11 items-center text-[14px] font-bold text-pg-orange ${className}`;
  if (href !== undefined) {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  href,
  size = "md",
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}) {
  const sizing = {
    sm: "h-11 px-5 text-[15px]",
    md: "h-[52px] px-8 text-[17px]",
    lg: "pg-primary-lg h-[58px] w-full text-[18px]",
  }[size];
  const cls = `pg-primary inline-flex items-center justify-center gap-2 tabular ${sizing} ${className}`;
  if (href !== undefined && !disabled) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  href,
  className = "",
  outline = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  outline?: boolean;
}) {
  const cls = `${outline ? "pg-outline" : "pg-secondary"} inline-flex h-12 items-center justify-center px-5 text-[16px] tabular ${className}`;
  if (href !== undefined) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/** A labelled field row inside a card: caps label, provenance tag, value, reason. */
export function FieldRow({
  label,
  tags,
  children,
  reason,
  action,
  first = false,
}: {
  label: string;
  tags?: ReactNode;
  children: ReactNode;
  reason?: ReactNode;
  action?: ReactNode;
  first?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 py-3.5 ${first ? "" : "border-t border-pg-line"}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="caps leading-5" style={{ fontSize: 10.5 }}>
            {label}
          </span>
          {tags}
        </div>
        <div className="text-[16px] leading-[22px] font-bold">{children}</div>
        {reason !== undefined && (
          <div
            className="text-[13px] leading-[18px] text-pg-ink"
            style={{ textWrap: "pretty" }}
          >
            {reason}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

/** Icons used in more than one place. Everything else is drawn inline. */
export function ChevronDown({ up = false, size = 16 }: { up?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
    </svg>
  );
}

export function ArrowRight({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function BackArrow({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </svg>
  );
}

export function ClockIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function PlusIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function CloseIcon({
  size = 20,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </svg>
  );
}

export function PlaneIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 12c0-.8-.7-1.5-1.5-1.5H15L10.5 3.5h-2l2.3 7H6.5L5 8.5H3.5l1 3.5-1 3.5H5l1.5-2h4.3l-2.3 7h2L15 13.5h4.5c.8 0 1.5-.7 1.5-1.5Z" />
    </svg>
  );
}

export function PassIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M15 6v12" strokeDasharray="2 2.4" />
    </svg>
  );
}

export function FaceIdIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M9 9.5V11" />
      <path d="M15 9.5V11" />
      <path d="M12 9.5v4h-1" />
      <path d="M9 15.5c1.8 1.4 4.2 1.4 6 0" />
    </svg>
  );
}

export function MailIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}
