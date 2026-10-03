/**
 * Destination artwork.
 *
 * Layered gradients with a silhouette, one per place, rather than photography.
 * Shipping real destination photos into a mock means shipping someone else's
 * copyrighted images, and a hackathon prototype is exactly the wrong place to
 * take that on.
 *
 * It is a single component on purpose: swapping these for licensed photos later
 * means replacing this file and nothing else.
 */

type Art = {
  /** Two-stop sky, warm to cool, chosen to suit the place. */
  sky: [string, string];
  /** The silhouette drawn across the bottom third. */
  shape: "coast" | "skyline" | "domes" | "desert" | "bridge";
};

const ART: Record<string, Art> = {
  AYT: { sky: ["#FFB86B", "#FF6B5B"], shape: "coast" },
  BJV: { sky: ["#7FD8E8", "#2E86AB"], shape: "coast" },
  DLM: { sky: ["#8FE0C4", "#1F8A70"], shape: "coast" },
  ADB: { sky: ["#FFC978", "#E8623C"], shape: "domes" },
  SAW: { sky: ["#FFB65C", "#C43E5E"], shape: "domes" },
  IST: { sky: ["#FFB65C", "#C43E5E"], shape: "domes" },
  FCO: { sky: ["#FFD28A", "#D4703F"], shape: "domes" },
  BER: { sky: ["#9FB8D8", "#3C5A84"], shape: "skyline" },
  CDG: { sky: ["#C3A7DE", "#5B4B8A"], shape: "skyline" },
  AMS: { sky: ["#A8C8E8", "#3F6A9E"], shape: "bridge" },
  STN: { sky: ["#AFC3D9", "#48617F"], shape: "skyline" },
  LGW: { sky: ["#AFC3D9", "#48617F"], shape: "skyline" },
  DXB: { sky: ["#FFCF7A", "#D96C2C"], shape: "desert" },
  ESB: { sky: ["#D8C3A0", "#8A6A3F"], shape: "skyline" },
  TZX: { sky: ["#9ED8C0", "#2F7A66"], shape: "coast" },
};

const FALLBACK: Art = { sky: ["#FFD88A", "#E8872C"], shape: "coast" };

export function DestinationArt({
  code,
  className = "",
}: {
  code: string;
  className?: string;
}) {
  const art = ART[code] ?? FALLBACK;
  const id = `sky-${code}`;

  return (
    <svg
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={art.sky[0]} />
          <stop offset="100%" stopColor={art.sky[1]} />
        </linearGradient>
      </defs>

      <rect width="320" height="180" fill={`url(#${id})`} />
      {/* Sun, low and soft, which reads as evening on every palette here. */}
      <circle cx="248" cy="52" r="26" fill="#fff" opacity="0.28" />
      <Silhouette shape={art.shape} />
      {/* Darkened foot so overlaid text stays readable whatever the sky does. */}
      <rect y="108" width="320" height="72" fill="#0B1220" opacity="0.38" />
    </svg>
  );
}

function Silhouette({ shape }: { shape: Art["shape"] }) {
  const fill = "#0B1220";
  const opacity = 0.42;

  if (shape === "skyline") {
    return (
      <g fill={fill} opacity={opacity}>
        <path d="M0 180V132h22v-26h18v26h16v-40h20v40h26v-18h22v18h24v-34h18v34h28v-22h20v22h30v-30h18v30h38v48z" />
      </g>
    );
  }

  if (shape === "domes") {
    return (
      <g fill={fill} opacity={opacity}>
        <path d="M0 180v-34h30l14-20 14 20h26l20-30 20 30h34l16-24 16 24h40l18-18 18 18h54v34z" />
        <rect x="52" y="96" width="5" height="50" />
        <rect x="196" y="92" width="5" height="54" />
      </g>
    );
  }

  if (shape === "desert") {
    return (
      <g fill={fill} opacity={opacity}>
        <path d="M0 180v-30q46-26 92-6t80-2 68-20 80 12v46z" />
        <rect x="150" y="70" width="8" height="78" />
        <rect x="178" y="88" width="6" height="60" />
      </g>
    );
  }

  if (shape === "bridge") {
    return (
      <g fill={fill} opacity={opacity}>
        <path d="M0 180v-28h320v28z" />
        <path d="M30 152q50-40 100 0" stroke={fill} strokeWidth="5" fill="none" />
        <path d="M180 152q50-40 100 0" stroke={fill} strokeWidth="5" fill="none" />
      </g>
    );
  }

  // coast: headland, water, a sail
  return (
    <g fill={fill} opacity={opacity}>
      <path d="M0 180v-44q58-40 118-14t104-34 98 22v70z" />
      <path d="M214 132l16-34 16 34z" opacity="0.85" />
    </g>
  );
}
