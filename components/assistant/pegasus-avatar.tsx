/**
 * The assistant's face: a cartoon of the mythological Pegasus.
 *
 * Drawn here as inline SVG rather than shipped as an image, for three reasons
 * that all turned out to matter:
 *
 * 1. **It is ours.** The Pegasus Airlines winged-horse mark is a trademark and
 *    tracing it would make the assistant look like a logo that had learned to
 *    talk. This is the creature from the myth, drawn as a friendly cartoon, in
 *    the airline's palette. Same idea, no borrowed asset.
 * 2. **It animates.** The wing beats while the assistant is thinking, which is
 *    the only honest way to show work in a mock where the work is instant.
 * 3. **It is one file at any size.** The avatar appears at 32px beside a line of
 *    chat and at 104px over the greeting; a raster asset would need both.
 *
 * Three attempts, and the two failures are worth recording because both looked
 * fine in the source and wrong on screen:
 *
 * - **Face-on** read as a cartoon insect. A round head between two symmetric
 *   wings is a moth however carefully the ears are drawn. A horse is recognised
 *   by the long wedge of its muzzle, and you only see that from the side.
 * - **Short feathers** read as a mohican. Three yellow spikes rising behind a
 *   horse's head are hair, not flight. A wing has to be large, and it has to
 *   extend clearly past the body, or the eye files it under mane.
 *
 * So: head turned right and sized to leave the left half of the disc empty, and
 * a four-feather wing that fills it. Everything is bounded inside the disc, so
 * no clip path is needed and therefore no generated element id — several of
 * these render on one screen and colliding ids are a horrible bug to find.
 */

/** Head and neck, facing right. The muzzle is the whole reason this is a profile. */
const HEAD =
  "M 29 16 C 36 16 42 22 46 29 C 48 33 49 37 48 40 " +
  "C 47 43 44 45 41 44 C 38 43 35 41 32 39 " +
  "C 29 41 25 46 22 53 L 13 53 " +
  "C 13 45 13 34 17 27 C 20 21 24 16 29 16 Z";

/** The pale band down the nose. Without it the face reads flat. */
const MUZZLE =
  "M 41 31 C 46 32 49 35 48 40 C 47 43 44 45 41 44 " +
  "C 39 42 38 38 38 35 C 38 33 39 31 41 31 Z";

/**
 * Mane, in the brand orange rather than the brand yellow.
 *
 * Not a decorative choice. A yellow mane in front of a yellow wing is one
 * yellow shape, and the drawing loses its depth entirely. Orange is the
 * airline's accent colour, it is already used sparingly everywhere else in this
 * mock, and it separates the two at 32px where nothing else would.
 */
const MANE =
  "M 30 13 C 22 15 15 20 11 27 C 8 32 6 39 6 45 " +
  "C 12 39 15 32 19 27 C 23 21 28 17 32 15 Z";

/** A quiff falling forward over the forehead. The one asymmetry, for character. */
const FORELOCK = "M 29 17 C 32 13 37 12 40 14 C 37 15 35 18 35 21 C 33 18 31 17 29 17 Z";

/** Leaf-shaped and leaning back, which is how a horse holds a relaxed ear. */
const EAR = "M 25 20 C 23 13 24.5 7.5 28 6 C 31.5 9.5 32 16 31 19 Z";

/**
 * The head sits right of centre and smaller than the disc, purely to leave the
 * wing somewhere to go. Scaling the group scales its stroke too, so the stroke
 * width is divided back out where it is set.
 */
const HEAD_SCALE = 0.8;
const HEAD_SHIFT = { x: 9, y: 5 };

/** Where the feathers are rooted — under the neck, so the beat pivots unseen. */
const WING_PIVOT = { x: 30, y: 33 };

/**
 * Coverts: the solid mass over the feather roots, which is what makes four
 * separate lobes read as one wing rather than four petals.
 */
const WING_ROOT = "M 34 39 C 25 40 16 36 11 30 C 18 25 28 26 34 31 Z";

/**
 * Feathers, swept back in a narrow fan rather than radiating.
 *
 * The previous pass fanned them across seventy degrees from a single point,
 * which is a sunflower. A wing's primaries run roughly parallel and shorten
 * towards the body, so: forty degrees of spread, longest at the top.
 */
const FEATHERS: { angle: number; length: number; width: number }[] = [
  { angle: -66, length: 14.5, width: 4.8 },
  { angle: -81, length: 14, width: 4.8 },
  { angle: -96, length: 12.3, width: 4.4 },
  { angle: -111, length: 10, width: 3.9 },
];

const NAVY = "#1f2a37";
const YELLOW = "#fdb913";
const YELLOW_DEEP = "#e5a70c";
const ORANGE = "#ff5c00";
const CREAM = "#fdeccd";

export type AvatarState =
  /** Resting. Wing still. */
  | "idle"
  /** Working. The wing beats and the whole creature lifts. */
  | "thinking";

export function PegasusAvatar({
  size = 44,
  state = "idle",
  disc = true,
  className = "",
}: {
  size?: number;
  state?: AvatarState;
  /** The soft yellow circle behind it. Off when it sits on colour already. */
  disc?: boolean;
  className?: string;
}) {
  const thinking = state === "thinking";
  // Thinner line as it grows, so the drawing does not turn into a woodcut at
  // 104px or lose its outline entirely at 32px.
  const stroke = Math.min(2.6, Math.max(1.5, 110 / size));

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={thinking ? "Your Pegasus assistant, thinking" : "Your Pegasus assistant"}
      className={`${thinking ? "pg-bob" : ""} ${className}`}
    >
      {disc && <circle cx="32" cy="32" r="31" fill="#fff3d1" />}

      {/* The wing, drawn first so the head covers where it joins on. */}
      <g
        className={thinking ? "pg-flap-l" : ""}
        style={{
          transformBox: "view-box",
          transformOrigin: `${WING_PIVOT.x}px ${WING_PIVOT.y}px`,
        }}
        stroke={NAVY}
        strokeWidth={stroke}
        strokeLinejoin="round"
        fill="none"
      >
        {FEATHERS.map((feather) => (
          <ellipse
            key={feather.angle}
            cx="0"
            cy={-feather.length}
            rx={feather.width}
            ry={feather.length}
            transform={`translate(${WING_PIVOT.x} ${WING_PIVOT.y}) rotate(${feather.angle})`}
            fill={YELLOW}
          />
        ))}
        <path d={WING_ROOT} fill={YELLOW_DEEP} />
      </g>

      <g transform={`translate(${HEAD_SHIFT.x} ${HEAD_SHIFT.y}) scale(${HEAD_SCALE})`}>
        <g
          stroke={NAVY}
          strokeWidth={stroke / HEAD_SCALE}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        >
          {/* Mane and ear before the head, so their inner edges vanish under it. */}
          <path d={MANE} fill={ORANGE} />
          <path d={EAR} fill="#ffffff" />

          <path d={HEAD} fill="#ffffff" />
          <path d={MUZZLE} fill={CREAM} strokeWidth={(stroke / HEAD_SCALE) * 0.65} />
          <path d={FORELOCK} fill={ORANGE} />

          {/* Cheekbone. One stroke, and the head stops being an outline. */}
          <path
            d="M 32 38 C 34 34 35 31 34 28"
            strokeWidth={(stroke / HEAD_SCALE) * 0.6}
            fill="none"
          />
        </g>

        {/* These sit on the head fill, so they need no stroke of their own. */}
        <path
          d="M 26.5 19 C 25 13.5 26 9.5 28 8.5 C 30.5 11.5 30.5 16 30 18.5 Z"
          fill={ORANGE}
          opacity="0.45"
        />
        <circle cx="36" cy="26" r="2.5" fill={NAVY} />
        <circle cx="35.1" cy="25.1" r="0.95" fill="#ffffff" />
        <ellipse cx="44.2" cy="37.6" rx="1.35" ry="1.05" fill={NAVY} opacity="0.7" />
      </g>
    </svg>
  );
}

/**
 * The avatar with a line of speech beside it.
 *
 * Used wherever the assistant says something in its own voice, so that voice
 * always arrives attached to a face and the passenger never has to work out who
 * is talking.
 */
export function PegasusSays({
  children,
  state = "idle",
  size = 36,
}: {
  children: React.ReactNode;
  state?: AvatarState;
  size?: number;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <PegasusAvatar size={size} state={state} className="shrink-0" />
      <div className="min-w-0 flex-1 pt-1 text-[14px] leading-snug text-pg-navy">
        {children}
      </div>
    </div>
  );
}
