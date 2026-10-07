import { BREAKFAST } from "@/lib/group/group";
import { formatFare, LIGHT_TO_SAVER_UPSELL } from "@/lib/journey/flights";
import { HOME, SQUAD } from "@/lib/journey/script";
import { GIFTS } from "@/lib/moments/moments";
import type { Step } from "./trace";

/**
 * What each agent step is worth to Pegasus.
 *
 * Jamie version. The agent panel already shows what each agent read, thought
 * and did. This adds the commercial reason for the step: which of the five
 * outcomes it moves, and the gain in a line. A held-back step gets a tag too,
 * because not speaking is a commercial decision: it protects conversion and
 * keeps the right to speak next time.
 *
 * Figures are computed from the same constants the screens use, never typed in.
 */

export type Outcome =
  | "More passengers"
  | "More per passenger"
  | "New direct customer"
  | "Repeat booking"
  | "Protects the booking"
  | "Protects conversion";

export type Commercial = { outcome: Outcome; gain: string };

const gbp = (n: number): string => `${formatFare(n)} GBP`;

/** Seat beside a mate, every leg of the squad's four-sector week. */
const SQUAD_LEGS = SQUAD.stops.length + 1;
const seatPerFriend = SQUAD.seatPricePerLeg * SQUAD_LEGS;
const giftsTotal = GIFTS.extraWeight.perLeg + GIFTS.delight.perLeg;

/** First matching rule wins. Matched against the step's label, then its agent. */
const RULES: { test: RegExp; agent?: Step["agent"]; value: Commercial }[] = [
  // Journey 1: the wish
  {
    test: /^Read the sentence|^Heard/,
    value: {
      outcome: "Protects conversion",
      gain: "One sentence replaces the search-to-payment funnel (search, dates, flights, fare, passengers, bags, seats, extras): fewer drop-off points on a 3.4% web conversion.",
    },
  },
  {
    test: /^Listed what wasn't said/,
    value: {
      outcome: "Protects conversion",
      gain: "Every gap is filled with a reason instead of asked as a question. Each question is a place people drop out.",
    },
  },
  {
    test: /^Routed it on the network/,
    value: {
      outcome: "More per passenger",
      gain: "A wish becomes 4 Pegasus sectors through the Istanbul hub, not 1 return to a competitor.",
    },
  },
  {
    test: /^Picked the dates/,
    value: {
      outcome: "Protects conversion",
      gain: "Lands the trip in a week with seats and before peak fares, so the first price shown is one people buy.",
    },
  },
  {
    test: /bag|Bag|SAVER|package|fare/,
    agent: "Offer",
    value: {
      outcome: "More per passenger",
      gain: `Bag sold at booking inside SAVER, where 74% would have bought LIGHT and paid ${gbp(LIGHT_TO_SAVER_UPSELL)} later, or dropped out.`,
    },
  },
  {
    test: /^Printed the ticket/,
    value: {
      outcome: "Protects conversion",
      gain: "A ticket to check, not a funnel to complete. Every guess is one tap to change.",
    },
  },
  {
    test: /^Thumbs/,
    value: {
      outcome: "Repeat booking",
      gain: "Feedback on exactly which field was wrong. The next prediction for this traveller is better.",
    },
  },
  // Discovery
  {
    test: /^Picked three|^Scored the network|^No place named|^What people like him book/,
    value: {
      outcome: "More passengers",
      gain: "Someone who did not know where to go leaves with a Pegasus route, not a search on a competitor.",
    },
  },
  // Checkout
  {
    test: /^Filled the form/,
    value: {
      outcome: "Protects conversion",
      gain: "Nothing to type at the till, the step where most mobile bookings are abandoned.",
    },
  },
  {
    test: /^Nothing to add at the till/,
    value: {
      outcome: "Protects conversion",
      gain: "Insurance, car and lounge have low predicted take-up here. Showing them would cost more bookings than they earn.",
    },
  },
  {
    test: /^Noted the mates|^Heard mates/,
    value: {
      outcome: "More passengers",
      gain: "Average booking is about 1.5 passengers. The mates in the sentence are the passengers missing from that number.",
    },
  },
  // Group
  {
    test: /^Booked /,
    value: {
      outcome: "More passengers",
      gain: "The organiser is booked: passenger 1 of the squad.",
    },
  },
  {
    test: /^Looked at his contacts|^Matched his contacts|^Picked each friend's channel|^Chose push|^Chose WhatsApp/,
    value: {
      outcome: "More passengers",
      gain: "Each friend gets the trip in Will's name, booking already built. Two more passengers from one booking.",
    },
  },
  {
    test: /^Made the seat the nudge|^Led with the seat/,
    value: {
      outcome: "More per passenger",
      gain: `The seat beside Will is the hook: ${gbp(SQUAD.seatPricePerLeg)} a leg × ${SQUAD_LEGS} legs = ${gbp(seatPerFriend)} per friend, where seat attach is 13% today.`,
    },
  },
  {
    test: /^Timed it/,
    value: {
      outcome: "More passengers",
      gain: "Sent while the trip is the conversation, when the friend is most likely to say yes.",
    },
  },
  {
    test: /^Nothing on file|^Filled the form/,
    value: {
      outcome: "New direct customer",
      gain: "Tom books on pegasus.com, not through an OTA. Pegasus keeps the customer and the commission.",
    },
  },
  {
    test: /^Rescued a declined card|^Planned the rescue/,
    value: {
      outcome: "Protects the booking",
      gain: "A declined card is a lost passenger unless the next step is one tap away.",
    },
  },
  {
    test: /^Updated the squad|^Kept a Live Activity up|^Counted the squad/,
    value: {
      outcome: "More passengers",
      gain: "Social proof: '2 of 3 booked' does the chasing so Pegasus does not have to.",
    },
  },
  {
    test: /^Offered extras only to the booked/,
    value: {
      outcome: "More per passenger",
      gain: "Extra weight offered after payment, when take-up is highest and it cannot put the fare at risk.",
    },
  },
  {
    test: /^Squad complete|^One offer for three/,
    value: {
      outcome: "More per passenger",
      gain: `Breakfast for the squad: ${gbp(BREAKFAST.each)} × 3 = ${gbp(BREAKFAST.each * 3)} in one tap, offered once.`,
    },
  },
  {
    test: /^Watched the flight|^Chose who speaks/,
    value: {
      outcome: "More passengers",
      gain: "A nudge from a friend converts where airline marketing is ignored.",
    },
  },
  {
    test: /^Checked the seats|^Noticed Tom has no seat/,
    value: {
      outcome: "More per passenger",
      gain: `A paid seat (${gbp(SQUAD.seatPricePerLeg)} a leg) sold the day before check-in would have placed him for free.`,
    },
  },
  {
    test: /^Counted down to check-in|^Checked everyone in/,
    value: {
      outcome: "Protects the booking",
      gain: "Fewer missed check-ins and airport desk queues, which cost Pegasus staff time and goodwill.",
    },
  },
  {
    test: /^A new route opened|^Chose who hears first|^Made it one tap/,
    value: {
      outcome: "Repeat booking",
      gain: "A launch sold to a squad that already flew together, not a newsletter that gets deleted.",
    },
  },
  {
    test: /cancelled$|^Found the next|^Rebooked|^Told Archie|^Told Dad|^Emre's flight moved|^Dad is at the other end|^Told him the same second/,
    value: {
      outcome: "Protects the booking",
      gain: "Rebooked before anyone asks: fewer refunds and call-centre contacts, and a customer kept after a bad day.",
    },
  },
  // Journey 2
  {
    test: /^Gate 1|^Learned a pattern|^Made it a Moment|^Watching|^Showed its memory|^Set the rules/,
    value: {
      outcome: "Repeat booking",
      gain: "A trip Emre takes every year, prompted when fares are lowest, before he searches anywhere else.",
    },
  },
  {
    test: /^Gate 2|^Gate 3|^Said nothing|^Not this year|^Don't suggest again|^Two ways to say no|^Flight status only/,
    value: {
      outcome: "Protects conversion",
      gain: "Restraint keeps notifications switched on. Every opt-out avoided keeps the channel that sells next year's trip.",
    },
  },
  {
    test: /^Spoke, once|^Asked, once/,
    value: {
      outcome: "Repeat booking",
      gain: "One message, at the right moment, with the trip already built.",
    },
  },
  {
    test: /^Rebuilt the usual|^Had the usual ready/,
    value: {
      outcome: "Repeat booking",
      gain: `His usual, rebuilt in one tap: seat ${HOME.seat} at ${gbp(HOME.seatPricePerLeg)} a leg and the fare he always buys.`,
    },
  },
  {
    test: /^No extras yet|^Presents not offered|^No extras this year|^No offer yet|^Nothing for Tom|^No group offer yet/,
    value: {
      outcome: "Protects conversion",
      gain: "No upsell before the fare is paid. An extra on an unpaid fare is noise that costs bookings.",
    },
  },
  {
    test: /^Presents added|^Built extras around the occasion|^Presents again/,
    value: {
      outcome: "More per passenger",
      gain: `Extras built around the occasion: 15 kg for gifts and Turkish delight for Mum, ${gbp(giftsTotal)} he would not have searched for.`,
    },
  },
  {
    test: /^Checked the passport/,
    value: {
      outcome: "Protects the booking",
      gain: "A passport problem found before payment, not at the gate: no denied boarding, no refund.",
    },
  },
  {
    test: /^Asked who should know|^Dad gets the flight|^Dad becomes a follower|^Sent one message|^Who should know|^Emre is booked home/,
    value: {
      outcome: "New direct customer",
      gain: "Dad installs the app to follow the flight: a direct customer Pegasus did not have, at no acquisition cost.",
    },
  },
  {
    test: /^Waiting/,
    value: {
      outcome: "Protects conversion",
      gain: "Silence counts as no, so the budget for speaking is kept for the moments that sell.",
    },
  },
];

export function commercialFor(step: Step): Commercial | null {
  for (const rule of RULES) {
    if (rule.agent !== undefined && rule.agent !== step.agent) continue;
    if (rule.test.test(step.did)) return rule.value;
  }
  return null;
}

/** The outcomes a run of steps moved, in the order they first appear. */
export function outcomesOf(steps: Step[]): Outcome[] {
  const seen: Outcome[] = [];
  for (const s of steps) {
    const c = commercialFor(s);
    if (c !== null && !seen.includes(c.outcome)) seen.push(c.outcome);
  }
  return seen;
}
