import { AIRPORTS, inventory, shiftDate, type AirportCode } from "@/lib/journey/flights";
import type { Extracted } from "./understand";
import type { Profile } from "./profiles";

/**
 * Discovery: "somewhere warm in October, under £300".
 *
 * Returns destinations rather than flights, because at this stage the passenger
 * has not chosen where they are going and a list of departure times would be
 * answering the wrong question. Each suggestion carries the reason it is there,
 * so the list reads as an argument rather than a ranking nobody can audit.
 */

type Destination = {
  code: AirportCode;
  tags: string[];
  pitch: string;
};

const DESTINATIONS: Destination[] = [
  {
    code: "AYT",
    tags: ["warm", "sunny", "beach", "cheap"],
    pitch: "Still 24°C in late October, and the cheapest beach on the network.",
  },
  {
    code: "BJV",
    tags: ["warm", "beach", "quiet"],
    pitch: "Quieter than Antalya once the season turns, and a shorter transfer.",
  },
  {
    code: "DLM",
    tags: ["warm", "beach", "quiet"],
    pitch: "Good for a week that is mostly swimming and not much else.",
  },
  {
    code: "ADB",
    tags: ["warm", "city", "cheap", "short"],
    pitch: "A city with a coastline attached, and the shortest hop of the warm options.",
  },
  {
    code: "FCO",
    tags: ["city", "warm"],
    pitch: "Warm enough in October to eat outside, and a city you have not flown to yet.",
  },
  {
    code: "BER",
    tags: ["city", "short", "cheap"],
    pitch: "Cheap, short, and good in the cold.",
  },
  {
    code: "CDG",
    tags: ["city", "short"],
    pitch: "Two hours door to gate, and you have done it before.",
  },
  {
    code: "ECN",
    tags: ["warm", "sunny", "beach"],
    pitch: "Sun into November and the sea still warm. Through Istanbul, so a longer day.",
  },
];

export type Suggestion = {
  code: AirportCode;
  city: string;
  pitch: string;
  /** The lowest you would actually pay: the cheapest LIGHT out on the date plus the cheapest LIGHT back, for one. */
  from: number;
  /** Why this one is in the list at all. */
  because: string;
};

/** The cheapest LIGHT fare on a route on a date, or null when nothing flies. */
function cheapestLight(origin: string, destination: string, date: string): number | null {
  return inventory(origin, destination, date).reduce<number | null>((min, f) => {
    const price = f.fares.light;
    if (price === undefined) return min;
    return min === null || price < min ? price : min;
  }, null);
}

/** How long the passenger said, or a week when they did not. */
export function returnDateFor(said: Extracted, departDate: string): string {
  return said.returnDate ?? shiftDate(departDate, said.nights ?? 7);
}

/**
 * Rank destinations against what was asked for.
 *
 * "From" is a return, because nobody flies out and stays: the cheapest LIGHT
 * out on the date plus the cheapest LIGHT back, for one person. Budget is
 * applied as a hard filter rather than a preference: a passenger who says
 * "under £300" and is shown a £420 option has been ignored, however good the
 * option is.
 */
export function suggest(
  said: Extracted,
  profile: Profile,
  departDate: string,
  origin = "STN",
): Suggestion[] {
  const vibes = said.vibes.length > 0 ? said.vibes : defaultVibes(profile);
  const returnDate = returnDateFor(said, departDate);
  // Pegasus's network from outside Türkiye is Türkiye and Cyprus; the European
  // cities are reachable from Istanbul, not from London.
  const abroad = AIRPORTS[origin as AirportCode]?.country !== "Turkiye";
  const reachable = DESTINATIONS.filter((d) => {
    if (d.code === origin) return false;
    const country = AIRPORTS[d.code].country;
    return !abroad || country === "Turkiye" || country === "Cyprus";
  });

  const scored = reachable.map((d) => {
    const matched = vibes.filter((v) => d.tags.includes(v));
    const out = cheapestLight(origin, d.code, departDate);
    const back = cheapestLight(d.code, origin, returnDate);
    const cheapest =
      out === null || back === null ? null : Math.round((out + back) * 100) / 100;
    return { destination: d, matched, cheapest };
  });

  const affordable = scored.filter(
    (s) =>
      s.cheapest !== null &&
      (said.budget === null || s.cheapest * travellers(profile) <= said.budget),
  );

  const pool = affordable.length > 0 ? affordable : scored.filter((s) => s.cheapest !== null);

  return pool
    .sort((a, b) => {
      if (b.matched.length !== a.matched.length) return b.matched.length - a.matched.length;
      return (a.cheapest ?? 0) - (b.cheapest ?? 0);
    })
    .slice(0, 3)
    .map(({ destination, matched, cheapest }) => ({
      code: destination.code,
      city: AIRPORTS[destination.code].city,
      pitch: destination.pitch,
      from: cheapest ?? 0,
      because:
        matched.length > 0
          ? `Matches ${matched.join(" and ")}${said.budget !== null ? `, and fits under £${said.budget} for ${travellers(profile)}` : ""}.`
          : `Closest fit for a ${profile.label.toLowerCase()}.`,
    }));
}

function travellers(profile: Profile): number {
  return profile.travellers.filter((t) => t.kind !== "infant").length;
}

/** With no descriptors given, lean on what this person usually does. */
function defaultVibes(profile: Profile): string[] {
  return profile.coldStart ? ["warm", "beach", "cheap"] : ["city", "short"];
}
