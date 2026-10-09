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
  shape: "coast" | "skyline" | "domes" | "desert" | "bridge" | "balloons";
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
  ECN: { sky: ["#FFD28A", "#2E86AB"], shape: "coast" },
  ESB: { sky: ["#D8C3A0", "#8A6A3F"], shape: "skyline" },
  TZX: { sky: ["#9ED8C0", "#2F7A66"], shape: "coast" },
  /* Cappadocia at dawn: the balloons are the point, so they are drawn in colour. */
  ASR: { sky: ["#F6C9A8", "#B98AC8"], shape: "balloons" },
  NAV: { sky: ["#F6C9A8", "#B98AC8"], shape: "balloons" },
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
      {art.shape === "balloons" && <Balloons />}
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

  if (shape === "balloons") {
    // Fairy chimneys: tall cones with capstones, the valley floor under them.
    return (
      <g fill={fill} opacity={opacity}>
        <path d="M0 180v-26q40-14 80-4t70-10 90 6 80-8v42z" />
        <path d="M22 158l10-44 10 44z" />
        <path d="M27 116l5-8 5 8z" />
        <path d="M56 162l8-30 8 30z" />
        <path d="M118 156l11-52 11 52z" />
        <path d="M124 106l5-9 5 9z" />
        <path d="M150 160l7-24 7 24z" />
        <path d="M232 158l10-40 10 40z" />
        <path d="M237 120l5-8 5 8z" />
        <path d="M270 162l8-28 8 28z" />
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

/** A hot-air balloon: envelope, a darker gore down the middle, lines and a basket. */
function Balloon({
  cx,
  cy,
  r,
  colour,
  gore,
}: {
  cx: number;
  cy: number;
  r: number;
  colour: string;
  gore: string;
}) {
  const envelope = `M${cx - r} ${cy} C${cx - r} ${cy - 1.35 * r} ${cx + r} ${cy - 1.35 * r} ${cx + r} ${cy} C${cx + r} ${cy + 0.55 * r} ${cx + 0.3 * r} ${cy + 0.95 * r} ${cx + 0.22 * r} ${cy + 1.1 * r} L${cx - 0.22 * r} ${cy + 1.1 * r} C${cx - 0.3 * r} ${cy + 0.95 * r} ${cx - r} ${cy + 0.55 * r} ${cx - r} ${cy}Z`;
  const stripe = `M${cx - 0.34 * r} ${cy} C${cx - 0.34 * r} ${cy - 1.35 * r} ${cx + 0.34 * r} ${cy - 1.35 * r} ${cx + 0.34 * r} ${cy} C${cx + 0.34 * r} ${cy + 0.6 * r} ${cx + 0.12 * r} ${cy + 1.1 * r} ${cx + 0.1 * r} ${cy + 1.1 * r} L${cx - 0.1 * r} ${cy + 1.1 * r} C${cx - 0.12 * r} ${cy + 1.1 * r} ${cx - 0.34 * r} ${cy + 0.6 * r} ${cx - 0.34 * r} ${cy}Z`;
  const basketY = cy + 1.5 * r;
  return (
    <g>
      <path d={envelope} fill={colour} />
      <path d={stripe} fill={gore} opacity="0.85" />
      <path
        d={`M${cx - 0.22 * r} ${cy + 1.1 * r} L${cx - 0.14 * r} ${basketY} M${cx + 0.22 * r} ${cy + 1.1 * r} L${cx + 0.14 * r} ${basketY}`}
        stroke="#0B1220"
        strokeWidth={Math.max(0.5, r * 0.05)}
        opacity="0.6"
      />
      <rect
        x={cx - 0.18 * r}
        y={basketY}
        width={0.36 * r}
        height={0.24 * r}
        rx={0.04 * r}
        fill="#4A2E1A"
      />
    </g>
  );
}

/** Dawn over Göreme: a dozen balloons at different heights, the nearest largest. */
function Balloons() {
  return (
    <g>
      <Balloon cx={286} cy={92} r={6} colour="#F2E6D8" gore="#C9B8A6" />
      <Balloon cx={64} cy={78} r={7} colour="#F2E6D8" gore="#C9B8A6" />
      <Balloon cx={190} cy={64} r={8} colour="#FFD166" gore="#E0A42C" />
      <Balloon cx={128} cy={84} r={9} colour="#6EC6E6" gore="#2E86AB" />
      <Balloon cx={240} cy={44} r={10} colour="#FF8A5B" gore="#D94E00" />
      <Balloon cx={30} cy={40} r={11} colour="#FDB913" gore="#E5A70C" />
      <Balloon cx={160} cy={30} r={13} colour="#FF5C00" gore="#B83D00" />
      <Balloon cx={92} cy={46} r={16} colour="#E84A6F" gore="#B22E52" />
      <Balloon cx={212} cy={104} r={19} colour="#FDB913" gore="#FF5C00" />
    </g>
  );
}
