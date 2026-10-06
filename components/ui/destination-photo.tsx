import Image from "next/image";
import credits from "@/public/destinations/CREDITS.json";
import { DestinationArt } from "./destination-art";

/**
 * A destination image: the photograph if we have one, generated art if not.
 *
 * Photography comes from Wikimedia Commons, chosen because every file there
 * carries machine-readable licence metadata, so each image's provenance is
 * recorded rather than assumed. `CREDITS.json` is written by the fetch script
 * and read here, so a removed photo degrades to the gradient art instead of
 * leaving a hole.
 *
 * `next/image` rather than a plain tag: the originals are 200-800KB each and
 * this serves resized WebP instead, which is the difference between a demo
 * that feels instant and one that visibly loads.
 *
 * Callers must position the parent; this fills it.
 */

type Credit = {
  code: string;
  file: string;
  title: string;
  author: string;
  licence: string;
  source: string;
};

const BY_CODE = new Map((credits as Credit[]).map((c) => [c.code, c]));

export function creditFor(code: string): Credit | null {
  return BY_CODE.get(code) ?? null;
}

export function DestinationPhoto({
  code,
  className = "",
  /** Darken the foot of the image so overlaid text stays legible. */
  scrim = true,
  priority = false,
}: {
  code: string;
  className?: string;
  scrim?: boolean;
  priority?: boolean;
}) {
  const credit = creditFor(code);

  if (credit === null) {
    return <DestinationArt code={code} className={className} />;
  }

  return (
    <span className={`block ${className}`}>
      <Image
        src={`/destinations/${credit.file}`}
        alt=""
        aria-hidden
        fill
        priority={priority}
        sizes="(max-width: 420px) 100vw, 390px"
        className="object-cover"
      />
      {scrim && (
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5" />
      )}
    </span>
  );
}

/** Every credit, for the attribution list. */
export function allCredits(): Credit[] {
  return [...(credits as Credit[])].sort((a, b) => a.code.localeCompare(b.code));
}
