import type { ReactNode } from "react";

/**
 * The companion's face: a cartoon Pegasus in flight, drawn on the design canvas
 * and ported here as inline SVG so it can beat its wings.
 *
 * It is the same face everywhere, at 32px in the header and at 120px over the
 * greeting. Something that fills in six fields on your behalf needs an author
 * those six fields can be attributed to, or they read as the app's defaults
 * rather than as somebody's suggestion you are allowed to argue with.
 *
 * The sparkle badge is the tell that this is the AI companion rather than
 * mascot art. Nothing here is the Pegasus Airlines trademark.
 */
export type AvatarState = "idle" | "thinking";

const NAVY = "#1F2A37";

export function Avatar({
  size = 36,
  state = "idle",
  className = "",
  label = "Your AI companion",
}: {
  size?: number;
  state?: AvatarState;
  className?: string;
  label?: string;
}) {
  const thinking = state === "thinking";
  const wing = thinking ? "wing" : "";
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={thinking ? `${label}, wings beating` : label}
      className={`${thinking ? "bob" : ""} ${className}`}
      style={{ overflow: "visible", display: "block", flexShrink: 0 }}
    >
      <circle cx="60" cy="60" r="58" fill="#FFE9A6" />
      <circle
        cx="60"
        cy="60"
        r="58"
        fill="none"
        stroke="#FDB913"
        strokeWidth="2"
        opacity="0.55"
      />
      <g className={wing} style={{ animationDelay: "0.08s" }}>
        <path
          d="M67 55 C70 41 68 27 60 13 C58 20 58 26 59 31 C54 29 51 30 49 32 C53 40 57 48 60 56 Z"
          fill="#E5A70C"
          stroke={NAVY}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
      </g>
      <g stroke={NAVY} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
        <path
          d="M38 63 C27 56 16 60 11 73 C18 69 23 72 21 82 C31 80 38 74 41 68 Z"
          fill="#FF5C00"
        />
        <path d="M47 73 Q43 86 31 92" fill="none" strokeWidth="10.5" />
        <path d="M67 72 Q73 86 86 89" fill="none" strokeWidth="10.5" />
      </g>
      <path
        d="M47 73 Q43 86 33.5 90.8"
        fill="none"
        stroke="#E6ECF3"
        strokeWidth="5.6"
        strokeLinecap="round"
      />
      <path
        d="M67 72 Q73 86 83.5 88.4"
        fill="none"
        stroke="#E6ECF3"
        strokeWidth="5.6"
        strokeLinecap="round"
      />
      <g stroke={NAVY} strokeLinejoin="round" strokeLinecap="round" fill="none">
        <path d="M42 71 Q34 81 22 85" strokeWidth="10.5" />
        <path d="M72 70 Q82 80 95 76" strokeWidth="10.5" />
      </g>
      <path
        d="M36 62 C36 54 46 50 56 51 C62 51 66 50 69 46 C73 39 78 33 84 30 L85 24 L89.5 28.5 C96 30 102 35 105 41 C107 45 105 49.5 100.5 49.5 C96.5 49.5 93 47.5 90 47.5 C88 54 86 60 82 66 C79 73 72 78 62 78 C50 78 36 74 36 62 Z"
        fill="#FFFFFF"
        stroke={NAVY}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M42 71 Q34 81 24.5 84.2"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5.6"
        strokeLinecap="round"
      />
      <path
        d="M72 70 Q82 80 92.5 76.8"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5.6"
        strokeLinecap="round"
      />
      <g stroke={NAVY} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
        <path
          d="M84 30 C78 27 73 31 74 36 C69 36 66 41 68 46 C63 47 62 52 65 56 C69 51 74 42 84 30 Z"
          fill="#FF5C00"
        />
        <path d="M85.5 27 C91 26 95 29 96 34 C92 31.5 89 31 85.5 31.5 Z" fill="#FF5C00" />
      </g>
      <g
        className={wing}
        stroke={NAVY}
        strokeWidth="2.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path
          d="M65 59 C61 45 52 28 35 13 C35 21 37 27 40 32 C33 29 28 29 25 31 C29 36 34 40 39 43 C33 43 29 45 27 48 C35 53 45 57 56 61 Z"
          fill="#FDB913"
        />
        <path d="M58 54 C54 44 49 35 43 28" fill="none" stroke="#E5A70C" strokeWidth="2" />
        <path d="M52 54 C48 49 44 46 39 43" fill="none" stroke="#E5A70C" strokeWidth="2" />
      </g>
      <circle cx="95.5" cy="38.5" r="2" fill={NAVY} />
      <path
        d="M99 45.5 Q101 47 103 45.5"
        fill="none"
        stroke={NAVY}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="97" cy="97" r="15" fill={NAVY} stroke="#FFFFFF" strokeWidth="3" />
      <path
        d="M97 87.5 C98 94 100 96 106.5 97 C100 98 98 100 97 106.5 C96 100 94 98 87.5 97 C94 96 96 94 97 87.5 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** The avatar inside its pulsing halo, for the thinking beat. */
export function ThinkingAvatar({ size = 88 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <span className="halo absolute inset-0 rounded-full border-2 border-pg-yellow" />
      <span
        className="halo absolute inset-0 rounded-full border-2 border-pg-yellow"
        style={{ animationDelay: "1.04s" }}
      />
      <Avatar size={size} state="thinking" className="relative" />
    </div>
  );
}

/**
 * The avatar with a line of speech beside it. Used wherever the companion says
 * something in its own voice, so that voice always arrives attached to a face.
 */
export function Says({
  children,
  size = 36,
  className = "",
  big = false,
}: {
  children: ReactNode;
  size?: number;
  className?: string;
  /** The 16/24 weight-500 version used on the confirmation. */
  big?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <Avatar size={size} />
      <p
        className={`m-0 min-w-0 flex-1 pt-0.5 text-pg-navy ${
          big ? "text-[16px] leading-6 font-medium" : "text-[15px] leading-[22px]"
        }`}
        style={{ textWrap: "pretty" }}
      >
        {children}
      </p>
    </div>
  );
}

/** A highlighted phrase inside a line of speech. */
export function Mark({ children }: { children: ReactNode }) {
  return (
    <strong className="font-extrabold" style={{ boxShadow: "inset 0 -9px 0 #FFE9A6" }}>
      {children}
    </strong>
  );
}
