/**
 * The assistant's face: a cartoon of the mythological Pegasus, whole, in flight.
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
 *    chat and at 120px over the greeting; a raster asset would need both.
 *
 * Four attempts. The failures are recorded because each looked fine in source:
 *
 * - **Face-on head** read as a cartoon insect: a round head between two
 *   symmetric wings is a moth however carefully the ears are drawn.
 * - **Short feathers** read as a mohican. A wing has to be large and has to
 *   extend clearly past the body or the eye files it under hair.
 * - **A head alone** was a horse, not a pegasus. The wing on a bust reads as
 *   decoration; the wing on a galloping body reads as the thing that lifts it.
 *
 * So: the whole animal, in profile, facing right and climbing, forelegs tucked
 * and hind legs trailing the way a horse holds them off the ground. Everything
 * is bounded inside the disc, so no clip path is needed and therefore no
 * generated element id — several of these render on one screen and colliding
 * ids are a horrible bug to find.
 *
 * The small sparkle badge is the tell that this is the AI companion rather than
 * mascot art. It sits on the disc, not on the animal, so it survives every size.
 */

/** Barrel of the body, tilted nose-up a few degrees. */
const BODY = { cx: 31, cy: 38, rx: 14, ry: 7.2, tilt: -6 };

/** Neck, from the withers up to the poll. Thick, the way a cartoon neck is. */
const NECK = "M 35 33 C 37 28 40 23 44 19 L 52 23 C 49 27 47 31 46 36 Z";

/** Head in profile, muzzle down and forward. The wedge is what says "horse". */
const HEAD =
  "M 45 17 C 50 15 55 17 57 22 C 58 25 59 28 58 30 " +
  "C 57 32 55 32 53 31 C 51 30 50 28 49 27 C 47 26 45 23 44 20 Z";

const EAR = "M 46 17 C 45.5 14 46 11.5 47.5 10.5 C 49 12.5 49.5 15 49.5 16.5 Z";

/** Mane, the brand orange, so it separates from the yellow wing at 32px. */
const MANE =
  "M 46 16 C 42 17 39 21 37 26 C 36 29 36 31 37 33 " +
  "C 39 30 41 26 44 22 C 45 20 47 18 48 17 Z";

/** Tail, flowing back and down from the rump. */
const TAIL =
  "M 18 35 C 13 32 8 33 5 38 C 7 36 10 36 12 38 " + "C 9 40 8 44 10 47 C 11 43 14 40 18 40 Z";

/** Forelegs tucked under the chest; hind legs trailing. Flight, not standing. */
const LEGS = [
  // Near foreleg, then far foreleg a little behind it.
  "M 39 41 C 41 44 44 46 46 49 L 43.5 51 C 41 48 38.5 46 36.5 43.5 Z",
  "M 35 42 C 37 45 39 47 41 50 L 38.5 51.5 C 36.5 49 34.5 46.5 32.5 44.5 Z",
  // Near hind leg, then far hind leg.
  "M 22 42 C 19 45 15 48 12 51 L 14.5 53 C 17.5 50 21 47 24.5 44.5 Z",
  "M 26 43 C 23 46 20 49 17 52 L 19.5 54 C 22.5 51 25.5 48 28.5 45.5 Z",
];

/** Hooves, one per leg, at the toe end of each path above. */
const HOOVES = [
  { cx: 45, cy: 50, rot: 40 },
  { cx: 40, cy: 51, rot: 40 },
  { cx: 13.2, cy: 52, rot: -45 },
  { cx: 18.2, cy: 53, rot: -45 },
];

/** Where the feathers are rooted — the withers, so the beat pivots on the back. */
const WING_PIVOT = { x: 32, y: 32 };

/** Coverts: solid mass over the feather roots, so four lobes read as one wing. */
const WING_ROOT = "M 38 36 C 30 37 23 34 20 29 C 25 25 33 26 38 30 Z";

/**
 * Feathers, swept up and back in a narrow fan, longest at the top. A wide
 * radial fan from one point is a sunflower; this is a wing.
 */
const FEATHERS: { angle: number; length: number; width: number }[] = [
  { angle: -8, length: 14, width: 4.6 },
  { angle: -30, length: 15, width: 5 },
  { angle: -52, length: 14, width: 4.8 },
  { angle: -74, length: 11.5, width: 4.2 },
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
  badge = true,
  className = "",
}: {
  size?: number;
  state?: AvatarState;
  /** The soft yellow circle behind it. Off when it sits on colour already. */
  disc?: boolean;
  /** The sparkle that says "AI". Off only where a label beside it says so. */
  badge?: boolean;
  className?: string;
}) {
  const thinking = state === "thinking";
  // Thinner line as it grows, so the drawing does not turn into a woodcut at
  // 120px or lose its outline entirely at 32px.
  const stroke = Math.min(2.4, Math.max(1.3, 100 / size));

  const wing = (fill: string) => (
    <>
      {FEATHERS.map((feather) => (
        <ellipse
          key={feather.angle}
          cx="0"
          cy={-feather.length}
          rx={feather.width}
          ry={feather.length}
          transform={`translate(${WING_PIVOT.x} ${WING_PIVOT.y}) rotate(${feather.angle})`}
          fill={fill}
        />
      ))}
      <path d={WING_ROOT} fill={fill === YELLOW ? YELLOW_DEEP : fill} />
    </>
  );

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={
        thinking ? "Your Pegasus AI companion, thinking" : "Your Pegasus AI companion"
      }
      className={`${thinking ? "pg-bob" : ""} ${className}`}
    >
      {disc && <circle cx="32" cy="32" r="31" fill="#fff3d1" />}

      {/* The animal, pulled in a few percent so the top feather clears the disc
          and the near hoof clears the badge. Scaled about the centre. */}
      <g
        transform="translate(2.5 2) scale(0.92)"
        stroke={NAVY}
        strokeWidth={stroke / 0.92}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      >
        {/* Far wing: behind everything, smaller, deeper yellow, and still. Only
            the near wing beats, which is what the eye expects. */}
        <g transform="translate(5 -3) scale(0.82)" opacity="0.9">
          {wing(YELLOW_DEEP)}
        </g>

        <path d={TAIL} fill={ORANGE} />

        {/* Far legs first, then the body over their tops, then the near legs. */}
        <path d={LEGS[1]} fill="#ffffff" />
        <path d={LEGS[3]} fill="#ffffff" />
        <ellipse
          cx={BODY.cx}
          cy={BODY.cy}
          rx={BODY.rx}
          ry={BODY.ry}
          transform={`rotate(${BODY.tilt} ${BODY.cx} ${BODY.cy})`}
          fill="#ffffff"
        />
        <path d={LEGS[0]} fill="#ffffff" />
        <path d={LEGS[2]} fill="#ffffff" />

        <path d={NECK} fill="#ffffff" />
        <path d={EAR} fill="#ffffff" />
        <path d={HEAD} fill="#ffffff" />
        <path d={MANE} fill={ORANGE} />

        {/* The near wing, last, so its coverts sit on the back. Its root is on
            the body, so the beat pivots somewhere that never tears open. */}
        <g
          className={thinking ? "pg-flap-l" : ""}
          style={{
            transformBox: "view-box",
            transformOrigin: `${WING_PIVOT.x}px ${WING_PIVOT.y}px`,
          }}
        >
          {wing(YELLOW)}
        </g>
      </g>

      {/* Details with no stroke of their own, under the same transform as the
          animal so hooves stay on legs and the eye stays in the head. */}
      <g transform="translate(2.5 2) scale(0.92)">
        {HOOVES.map((hoof) => (
          <ellipse
            key={`${hoof.cx}-${hoof.cy}`}
            cx={hoof.cx}
            cy={hoof.cy}
            rx="1.9"
            ry="1.2"
            transform={`rotate(${hoof.rot} ${hoof.cx} ${hoof.cy})`}
            fill={NAVY}
          />
        ))}
        <path
          d="M 54 29 C 56 29.5 57.5 30 58 30.5"
          stroke={CREAM}
          strokeWidth="2"
          fill="none"
        />
        <circle cx="52" cy="21.5" r="1.6" fill={NAVY} />
        <circle cx="51.5" cy="21" r="0.55" fill="#ffffff" />
        <circle cx="56.6" cy="28.4" r="0.7" fill={NAVY} opacity="0.7" />
      </g>

      {badge && (
        /* The AI mark. A four-point sparkle on a navy disc, bottom right, the
           place a status badge goes on any avatar people already know. */
        <g>
          <circle cx="53" cy="53" r="8" fill={NAVY} stroke="#fff3d1" strokeWidth="1.8" />
          <path
            d="M 53 47.5 C 53.6 51 54.5 52 58.5 53 C 54.5 54 53.6 55 53 58.5 C 52.4 55 51.5 54 47.5 53 C 51.5 52 52.4 51 53 47.5 Z"
            fill={YELLOW}
          />
        </g>
      )}
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
