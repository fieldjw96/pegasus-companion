import { buildDraft } from "./understand";
import type { TripDraft } from "./draft";
import type { Profile } from "./profiles";

/**
 * What the assistant would book if nobody said anything.
 *
 * Direction C opens on a finished proposal rather than an empty box. That only
 * works if the proposal can justify itself, so each one carries the history it
 * was built from -- a reason a passenger can agree or disagree with, rather
 * than a recommendation they have to take on trust.
 *
 * The honest framing: these histories are invented for the mock. A real build
 * reads them from the booking record, which is the easiest part of this whole
 * idea to implement and the only part nobody would argue with.
 */

export type Proposal = {
  draft: TripDraft;
  /** The headline claim, in the assistant's voice. */
  headline: string;
  /** Why this trip and not another. Two or three short facts. */
  because: string[];
  /** What would make this wrong, said plainly. */
  caveat: string;
};

/** Next occurrence of a given month, as an ISO date. */
function nextOccurrence(month: number, day: number): string {
  const now = new Date();
  const year = month - 1 < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function propose(profile: Profile): Proposal {
  switch (profile.id) {
    case "family": {
      const out = nextOccurrence(10, 19);
      const back = nextOccurrence(10, 26);
      return {
        draft: buildDraft(
          `Stansted to Antalya on ${pretty(out)}, back ${pretty(back)}, checking a bag`,
          profile,
        ),
        headline: "Half term in Antalya, the same week as last year",
        because: [
          "You have flown to Antalya in October for three years running.",
          "Mila's half term starts on the 18th, and you have never flown on the first day of it.",
          "Fares on this route rise through November; this week is the cheapest left.",
        ],
        caveat: "If you are going somewhere new this year, say so and I will start again.",
      };
    }

    case "business": {
      const out = nextOccurrence(11, 4);
      return {
        draft: buildDraft(
          `Stansted to Berlin on ${pretty(out)}, back ${pretty(nextOccurrence(11, 6))}, hand luggage only, flexible`,
          profile,
        ),
        headline: "Berlin on the 4th, back on the 6th",
        because: [
          "The quarterly review is in Berlin and you have flown out the day before it, twice.",
          "Hand luggage and an aisle seat, as on your last four work trips.",
          "Changeable, because you have moved the return on three of them.",
        ],
        caveat: "I have guessed the dates from the pattern, not from your calendar.",
      };
    }

    case "weekend": {
      const out = nextOccurrence(11, 14);
      return {
        draft: buildDraft(
          `Stansted to Rome on ${pretty(out)}, back ${pretty(nextOccurrence(11, 16))}, hand luggage only`,
          profile,
        ),
        headline: "Two nights in Rome with Sam, out Friday evening",
        because: [
          "You and Sam book a short city break roughly every ten weeks. It has been eleven.",
          "Always Friday evening out, Sunday back, cabin bags only.",
          "Rome is the one city on your shortlist you have not done together.",
        ],
        caveat: "I have not checked whether Sam is free.",
      };
    }

    default: {
      const out = nextOccurrence(10, 19);
      return {
        draft: buildDraft(
          `Stansted to Bodrum on ${pretty(out)}, back ${pretty(nextOccurrence(10, 26))}, checking a bag`,
          profile,
        ),
        headline: "A week in Bodrum, quieter than Antalya in October",
        because: [
          "You and Ayşe take one long trip a year, and it has always been Turkey in autumn.",
          "A checked bag every time, and never the flexible fare.",
          "Bodrum is cheaper than Antalya this month and the transfer is shorter.",
        ],
        caveat: "This is a guess at the month as much as the place.",
      };
    }
  }
}

function pretty(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
}
