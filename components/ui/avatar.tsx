import { useId } from "react";
import type { ReactNode } from "react";

/**
 * The companion's face: a red chibi Pegasus with a flame mane, drawn as
 * inline SVG so it can beat its wings and shrink to a 12px ticket mark
 * without loading an image. Head and shoulders in the yellow disc, because
 * the head is what survives at 32px.
 *
 * It is the same face everywhere, at 32px in the header and at 120px over the
 * greeting. Something that fills in six fields on your behalf needs an author
 * those six fields can be attributed to, or they read as the app's defaults
 * rather than as somebody's suggestion you are allowed to argue with.
 *
 * Four moods: resting (the default), thinking (eyes up, one brow raised, wings
 * beating), pleased (a wink, for "You're going") and sorry (ears down, for a
 * cancelled flight). The navy sparkle badge is the tell that this is the AI
 * companion rather than mascot art; it is dropped under 24px, where it was a
 * smudge. Nothing here is the Pegasus Airlines trademark.
 */
export type AvatarState = "idle" | "thinking";
export type AvatarMood = "idle" | "thinking" | "wink" | "sad";

const RED = "#E3242B";
const RED_DEEP = "#B5161E";
const RED_LIGHT = "#F2494F";
const YELLOW = "#FFC53D";
const ORANGE = "#FF8A1F";
const INK = "#2A1612";
const IRIS = "#5B2A1C";
const NAVY = "#1F2A37";

const FEATHERS: { angle: number; length: number }[] = [
  { angle: -74, length: 36 },
  { angle: -56, length: 42 },
  { angle: -39, length: 44 },
  { angle: -23, length: 40 },
  { angle: -8, length: 32 },
];
const FEATHER_WIDTH = 13;

/** One wing: a fan of rounded feathers, yellow underneath so every tip is edged. */
function Wing({ side, beating }: { side: "left" | "right"; beating: boolean }) {
  const dir = side === "right" ? 1 : -1;
  const px = side === "right" ? 80 : 40;
  const py = 86;
  const w = FEATHER_WIDTH;
  return (
    <g
      className={beating ? (side === "right" ? "wing-r" : "wing-l") : undefined}
      style={{ transformBox: "view-box", transformOrigin: `${px}px ${py}px` }}
    >
      {FEATHERS.map(({ angle, length }) => {
        const t = `rotate(${dir > 0 ? angle : 180 - angle} ${px} ${py})`;
        return (
          <g key={angle} transform={t}>
            <rect
              x={px}
              y={py - w / 2}
              width={length + 5}
              height={w}
              rx={w / 2}
              fill={YELLOW}
            />
            <rect x={px} y={py - w / 2} width={length} height={w} rx={w / 2} fill={RED} />
            <rect
              x={px + 8}
              y={py - w / 2 + 2.5}
              width={length - 16}
              height={w - 5}
              rx={(w - 5) / 2}
              fill={RED_DEEP}
              opacity="0.2"
            />
          </g>
        );
      })}
      <ellipse
        cx={px + dir * 5}
        cy={py - 6}
        rx="12"
        ry="9"
        fill={RED}
        transform={`rotate(${dir > 0 ? -40 : 40} ${px + dir * 5} ${py - 6})`}
      />
    </g>
  );
}

function Eye({ cx, cy, look }: { cx: number; cy: number; look: [number, number] }) {
  return (
    <>
      <ellipse cx={cx} cy={cy} rx="8.5" ry="9.5" fill={INK} />
      <ellipse cx={cx + look[0]} cy={cy + 1 + look[1]} rx="6" ry="7" fill={IRIS} />
      <ellipse cx={cx + look[0]} cy={cy + 2 + look[1]} rx="4" ry="5" fill="#14090A" />
      <circle cx={cx - 3 + look[0] * 0.5} cy={cy - 3.5 + look[1] * 0.5} r="3" fill="#fff" />
      <circle cx={cx + 2.5} cy={cy + 3.5} r="1.3" fill="#fff" opacity="0.85" />
    </>
  );
}

/** The head in 120-space: ears and mane behind, cranium, muzzle, eyes, mouth. */
function Head({ mood }: { mood: AvatarMood }) {
  const sad = mood === "sad";
  const thinking = mood === "thinking";
  const wink = mood === "wink";
  const look: [number, number] = thinking ? [2, -2] : sad ? [0, 1.5] : [0, 0];
  return (
    <>
      <g transform={sad ? "rotate(-50 36 40)" : undefined}>
        <path d="M44 36 C40 22 34 12 28 10 C25 20 26 32 32 42 Z" fill={RED} />
        <path d="M40 36 C37 26 33 18 29 15 C28 23 29 31 33 39 Z" fill={YELLOW} />
      </g>
      <g transform={sad ? "rotate(50 84 40)" : undefined}>
        <path d="M76 36 C80 22 86 12 92 10 C95 20 94 32 88 42 Z" fill={RED} />
        <path d="M80 36 C83 26 87 18 91 15 C92 23 91 31 87 39 Z" fill={YELLOW} />
      </g>
      <path
        d="M48 36 C46 24 50 12 58 6 C60 12 64 10 70 3 C75 14 73 26 71 36 Z"
        fill={ORANGE}
      />
      <path
        d="M54 34 C53 25 56 16 61 11 C63 14 65 12 68 8 C70.5 18 69.5 27 66.5 34 Z"
        fill={YELLOW}
      />
      <ellipse cx="60" cy="56" rx="32" ry="29" fill={RED} />
      <ellipse
        cx="46"
        cy="38"
        rx="9"
        ry="4.5"
        fill="#fff"
        opacity="0.1"
        transform="rotate(-28 46 38)"
      />
      <ellipse cx="60" cy="79" rx="17" ry="12" fill={RED_LIGHT} />
      <circle cx="54" cy="79" r="1.6" fill={RED_DEEP} opacity="0.75" />
      <circle cx="66" cy="79" r="1.6" fill={RED_DEEP} opacity="0.75" />
      <Eye cx={46} cy={58} look={look} />
      {wink ? (
        <path
          d="M66 59 Q74 50 82 59"
          fill="none"
          stroke={INK}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      ) : (
        <Eye cx={74} cy={58} look={look} />
      )}
      {thinking && (
        <path
          d="M38 45 Q45 42.5 52 45 M68 41 Q75 36 82 38"
          fill="none"
          stroke={RED_DEEP}
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {sad && (
        <path
          d="M38 46 L52 42 M68 42 L82 46"
          fill="none"
          stroke={RED_DEEP}
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {wink ? (
        <>
          <path d="M52 85 Q60 93 68 85 Z" fill={INK} />
          <path d="M56 87.5 Q60 91 64 87.5 Z" fill="#F26D73" />
        </>
      ) : (
        <path
          d={sad ? "M55 89.5 Q60 85.5 65 89.5" : "M55 86 Q60 90 65 86"}
          fill="none"
          stroke={INK}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
    </>
  );
}

export function Avatar({
  size = 36,
  state = "idle",
  mood,
  className = "",
  label = "Your AI companion",
}: {
  size?: number;
  /** Thinking beats the wings and bobs; the mood follows unless one is given. */
  state?: AvatarState;
  mood?: AvatarMood;
  className?: string;
  label?: string;
}) {
  const clip = useId();
  const thinking = state === "thinking";
  const face: AvatarMood = mood ?? (thinking ? "thinking" : "idle");
  const badge = size >= 24;
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
      <defs>
        <clipPath id={clip}>
          <circle cx="60" cy="60" r="58" />
        </clipPath>
      </defs>
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
      <g clipPath={`url(#${clip})`}>
        <Wing side="right" beating={thinking} />
        <Wing side="left" beating={thinking} />
        <path
          d="M34 90 C34 80 46 75 60 75 C74 75 86 80 86 90 L86 106 C86 118 74 123 60 123 C46 123 34 118 34 106 Z"
          fill={RED}
        />
        <ellipse cx="60" cy="95" rx="24" ry="7" fill={RED_DEEP} opacity="0.28" />
      </g>
      <Head mood={face} />
      {badge && (
        <>
          <circle cx="97" cy="97" r="15" fill={NAVY} stroke="#FFFFFF" strokeWidth="3" />
          <path
            d="M97 87.5 C98 94 100 96 106.5 97 C100 98 98 100 97 106.5 C96 100 94 98 87.5 97 C94 96 96 94 97 87.5 Z"
            fill="#FFFFFF"
          />
        </>
      )}
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
  mood,
}: {
  children: ReactNode;
  size?: number;
  className?: string;
  /** The 16/24 weight-500 version used on the confirmation. */
  big?: boolean;
  mood?: AvatarMood;
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <Avatar size={size} mood={mood} />
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
