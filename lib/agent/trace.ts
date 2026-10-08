import {
  countBySource,
  uncertainFields,
  FIELD_LABELS,
  type DraftKey,
  type TripDraft,
} from "@/lib/assistant/draft";
import { itineraryFor, type Itinerary } from "@/lib/assistant/itinerary";
import { breakdown, naivePath, priceOf } from "@/lib/assistant/price";
import { extract } from "@/lib/assistant/understand";
import { suggest } from "@/lib/assistant/discover";
import { firstOpen, pitches } from "./first-open";
import { fareDrop } from "@/lib/group/next-trip";
import { stayFor } from "@/lib/group/stay";
import { tripNudge } from "@/lib/group/trip-nudge";
import { sceneFor } from "./scenes";
import {
  BREAKFAST,
  INVITE,
  FRIENDS,
  MEAL_PRICE,
  buildInviteeDraft,
  firstName,
  friendByName,
  groupMembers,
  inviteeExtras,
  listNames,
  seatBeside,
  type Friend,
} from "@/lib/group/group";
import {
  AIRPORTS,
  FARE_RULES,
  formatFare,
  inventory,
  type AirportCode,
} from "@/lib/journey/flights";
import { NEXT_TRIP, SQUAD, TRIP_NUDGE } from "@/lib/journey/script";
import {
  WILL,
  WILL_PROMPT,
  daysBetween,
  longDate,
  shift,
  shortDate,
  willDraft,
} from "@/lib/demo/personas";

/**
 * What the agents read, thought and did to reach the screen on the phone.
 *
 * The presenter's panel has two views. Scenes jumps between beats. Agent shows
 * the work behind the beat on screen: which of the four agents acted, what it
 * took in, what it concluded and what it did about it, step by step. Nothing
 * here is narrated separately from the screens: every figure in a step comes
 * from the same call the screen made, so a trace cannot say one thing while
 * the phone shows another. A step that stays quiet is a step too; restraint
 * nobody can see reads as no restraint at all.
 */

export type AgentName = "Trip" | "Offer" | "Group" | "Moments";

export type StepKind =
  /** Took something in: a sentence, a profile, a date, a reply. */
  | "read"
  /** Worked something out. */
  | "think"
  /** Did something the passenger can see. */
  | "act"
  /** Decided not to act, and why. */
  | "quiet"
  /** Waiting on a person. */
  | "wait";

export type Step = {
  agent: AgentName;
  kind: StepKind;
  /** What it did, as a short label. */
  did: string;
  /** What it was thinking, first person, with the figures a passenger can check. */
  thought: string;
  /** Small facts the step rests on. */
  facts?: string[];
};

export type Trace = {
  /** Whose phone, and when. */
  who: string;
  when: string;
  steps: Step[];
};

/** A trace with the scene it belongs to, for the panel's heading. */
export type TitledTrace = Trace & { title: string };

/** The slice of the demo's state the trace reads. Structurally the journey state. */
export type TraceState = {
  prompt: string | null;
  draft: TripDraft | null;
  edit: { said: string; changed: DraftKey[] } | null;
  booked: boolean;
  thumbs: "up" | "down" | null;
  invited: string[];
  shared: string[];
  sent: boolean;
  inviteesBooked: Record<string, string | null>;
  hostel: "booked" | "declined" | null;
  mumTold: boolean;
  nudge: { declined: boolean; never: boolean; spoken: number };
};

const cityOf = (code: string): string => AIRPORTS[code as AirportCode]?.city ?? code;
const gbp = (amount: number): string => `${formatFare(amount)} GBP`;

function step(
  agent: AgentName,
  kind: StepKind,
  did: string,
  thought: string,
  facts?: string[],
): Step {
  return facts === undefined || facts.length === 0
    ? { agent, kind, did, thought }
    : { agent, kind, did, thought, facts };
}

/* ------------------------------------------------------------------ */
/* Journey 1                                                            */
/* ------------------------------------------------------------------ */

type Will = {
  me: string;
  prompt: string;
  /** How many mates the sentence named. */
  companions: number;
  draft: TripDraft;
  itinerary: Itinerary;
  invited: string[];
};

function will(state: TraceState): Will {
  const me = WILL.travellers[0]?.name ?? "Will Parker";
  const draft = state.draft ?? willDraft();
  const prompt = state.prompt ?? WILL_PROMPT;
  return {
    me,
    prompt,
    companions: extract(prompt).companions ?? 0,
    draft,
    itinerary: itineraryFor(draft, me),
    invited: state.invited.length > 0 ? state.invited : FRIENDS.map((f) => f.name),
  };
}

function legFacts(itinerary: Itinerary): string[] {
  return itinerary.legs.map(
    (leg) =>
      `${leg.from} → ${leg.to} · ${shortDate(leg.date)} · ${leg.flight.flightNo} ${leg.flight.departs}`,
  );
}

function routeSentence(draft: TripDraft): string {
  const stops = draft.stops.value;
  if (stops.length === 0) {
    return `${cityOf(draft.origin.value)} to ${cityOf(draft.destination.value)} and back.`;
  }
  const legs = stops.map(
    (s) => `${cityOf(s.code)} for ${s.nights} night${s.nights === 1 ? "" : "s"}`,
  );
  return `${cityOf(draft.origin.value)} to ${legs.join(", then ")}, then home from ${cityOf(stops[stops.length - 1]?.code ?? "")}.`;
}

function heardSteps(w: Will): Step[] {
  const heard = extract(w.prompt);
  const facts: string[] = [];
  if (heard.companions !== null) facts.push(`Travellers: ${heard.companions + 1}`);
  if (heard.month !== null) {
    facts.push(
      `Month: ${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][heard.month]}`,
    );
  }
  if (heard.destination !== null) facts.push(`To: ${cityOf(heard.destination)}`);
  if (heard.departDate !== null) facts.push(`Out: ${shortDate(heard.departDate)}`);
  if (heard.returnDate !== null && heard.nights === null) {
    facts.push(`Back: ${shortDate(heard.returnDate)}`);
  }
  if (heard.nights !== null) facts.push(`Nights: ${heard.nights}`);
  if (heard.tripType !== null) {
    facts.push(`Trip: ${heard.tripType === "backpacking" ? "backpacking" : "city break"}`);
  }
  if (heard.checkedBag === true) facts.push("Bag: checked");
  if (heard.checkedBag === false || (heard.cabinBag === true && heard.checkedBag === null)) {
    facts.push("Bag: hand luggage");
  }
  if (heard.seating !== null) facts.push(`Seat: ${heard.seating}`);
  const missing: string[] = [];
  if (heard.origin === null) missing.push("where from");
  if (heard.departDate === null && heard.month === null) missing.push("which days");
  if (heard.departDate === null && heard.month !== null) missing.push("which week");
  if (heard.checkedBag === null && heard.cabinBag === null) missing.push("bags");
  if (heard.seating === null) missing.push("seats");
  return [
    step("Trip", "read", "Heard the sentence", `"${w.prompt}"`, facts),
    step(
      "Trip",
      "think",
      "Listed what wasn't said",
      missing.length === 0
        ? "Everything I need is in the sentence."
        : `Not said: ${missing.join(", ")}. ${WILL.coldStart ? "No history to remember from, so each of those is a prediction and gets a dotted underline." : "I'll fill those from past trips."}`,
    ),
  ];
}

/** What a field reads as after a change, for the panel. */
function fieldValue(draft: TripDraft, key: DraftKey): string {
  switch (key) {
    case "origin":
      return cityOf(draft.origin.value);
    case "destination":
      return cityOf(draft.destination.value);
    case "stops":
      return draft.stops.value.map((s) => `${cityOf(s.code)} ${s.nights}n`).join(", ");
    case "departDate":
      return shortDate(draft.departDate.value);
    case "returnDate":
      return draft.returnDate.value === null ? "one way" : shortDate(draft.returnDate.value);
    case "party":
      return `${draft.party.value.adults + draft.party.value.children}`;
    case "package":
      return FARE_RULES[draft.package.value].label;
    case "checkedKg":
      return draft.checkedKg.value === 0 ? "none" : `${draft.checkedKg.value} kg`;
    case "cabinBag":
      return draft.cabinBag.value ? "yes" : "underseat only";
    case "seating":
      return draft.seating.value;
    case "flexibility":
      return draft.flexibility.value;
  }
}

/** A change said in a sentence: what moved, and that nothing else did. */
function editSteps(w: Will, edit: { said: string; changed: DraftKey[] }): Step[] {
  const facts = edit.changed.map((k) => `${FIELD_LABELS[k]}: ${fieldValue(w.draft, k)}`);
  return [
    step(
      "Trip",
      "read",
      edit.changed.length === 0 ? "Heard a change, found nothing to move" : "Heard a change",
      `"${edit.said}"${edit.changed.length === 0 ? " names nothing on the ticket. It stays as it is." : ""}`,
      facts.length === 0 ? undefined : facts,
    ),
    step(
      "Trip",
      "think",
      "Kept the rest",
      `Only what the sentence names moves. The trip is still "${w.prompt}": the other ${countBySource(w.draft).said + countBySource(w.draft).predicted - edit.changed.length} fields keep their value and where it came from, so the changed ones carry a solid underline and the guesses stay dotted.`,
    ),
  ];
}

function builtSteps(w: Will): Step[] {
  const { draft, itinerary } = w;
  const counts = countBySource(draft);
  const price = breakdown(draft);
  const naive = naivePath(draft);
  const flagged = uncertainFields(draft).map((k) => FIELD_LABELS[k].toLowerCase());
  const steps: Step[] = [
    step(
      "Trip",
      "think",
      "Routed it on the network",
      draft.stops.value.length === 0
        ? `${AIRPORTS[draft.origin.value as AirportCode]?.name ?? draft.origin.value} to ${AIRPORTS[draft.destination.value as AirportCode]?.name ?? draft.destination.value} direct, and back. ${routeSentence(draft)}`
        : `Pegasus doesn't fly ${cityOf(draft.origin.value)} to ${AIRPORTS[draft.destination.value as AirportCode]?.name ?? draft.destination.value} direct. ${draft.stops.why} So: ${routeSentence(draft)} Four sectors on one booking; the app today would sell one return to Istanbul and lose the rest.`,
      legFacts(itinerary),
    ),
    step(
      "Trip",
      "think",
      "Picked the dates",
      `Out ${shortDate(draft.departDate.value)}${draft.returnDate.value === null ? "" : `, back ${shortDate(draft.returnDate.value)}`}. ${draft.departDate.why}`,
    ),
    step(
      "Offer",
      "think",
      `Chose ${FARE_RULES[draft.package.value].label}`,
      draft.package.why,
      [
        `Checked bag: ${draft.checkedKg.value === 0 ? "none" : `${draft.checkedKg.value} kg`}`,
        `Cabin bag: ${draft.cabinBag.value ? "yes" : "underseat only"}`,
      ],
    ),
    step(
      "Offer",
      "think",
      draft.seating.value === "none" ? "Left the seat" : "Chose the seat",
      draft.seating.why,
      itinerary.out === null
        ? undefined
        : [
            `${firstName(w.me)}: ${itinerary.out.seats[0] ?? "—"} on every leg`,
            ...(w.companions > 0
              ? [`Held beside: ${SQUAD.seats.archie}, ${SQUAD.seats.jess}`]
              : []),
          ],
    ),
    step(
      "Trip",
      "act",
      `Priced it at ${gbp(price.total)}`,
      naive === null
        ? "No cheaper way to buy the same trip, so I make no claim about a saving."
        : `Bought the funnel's way, LIGHT first and the bag added later, the same trip comes to ${gbp(naive.paid)}. This is ${gbp(naive.saved)} cheaper, and I only say so because I computed both.`,
      price.lines.map((l) => `${l.label}: ${formatFare(l.amount)} (${l.detail})`),
    ),
    step(
      "Trip",
      "act",
      "Printed the ticket",
      `${counts.said} thing${counts.said === 1 ? "" : "s"} you said, ${counts.predicted} I predicted, each with a dotted underline and a reason.${flagged.length === 0 ? "" : ` Flagged as a guess worth a look: ${flagged.join(", ")}.`}`,
      [`Reference ${itinerary.reference}`],
    ),
  ];
  return steps;
}

function thumbsStep(state: TraceState, w: Will): Step | null {
  if (state.thumbs === "up") {
    return step(
      "Trip",
      "read",
      "Thumbs up",
      "The guesses held. Nothing to relearn from this one.",
    );
  }
  if (state.thumbs === "down") {
    const cityBreak = w.draft.stops.value.length === 2;
    return step(
      "Trip",
      "read",
      "Thumbs down",
      cityBreak
        ? `"Actually: a city break." I dropped the coast, gave Istanbul the nights instead, and switched to ${FARE_RULES[w.draft.package.value].label}. One tap, not a fresh search.`
        : "Noted which field was wrong. The next prediction for this trip starts from that, not from zero.",
    );
  }
  return null;
}

/**
 * Home before anything has been said: three trips from what the phone and the
 * sign-up give away, with every input named so it is clear how little was used.
 */
export function suggestTrace(today?: string): Trace {
  const s = firstOpen(today);
  const picks = pitches(s);
  const nearest = s.device.nearest.map((c) => AIRPORTS[c].name).join(" and ");
  const weekend = `${shortDate(s.calendar.freeWeekend.from)} to ${shortDate(s.calendar.freeWeekend.to)}`;
  return {
    who: "Will's phone",
    when: "Home, first open",
    steps: [
      step(
        "Trip",
        "read",
        "Read the sign-up",
        `${s.signup.firstName}, ${s.signup.ageBand}, ${s.signup.bookings} bookings. Nothing remembered, so nothing to rebuild. I start from the phone.`,
        [`Name: ${s.signup.firstName}`, `Age: ${s.signup.ageBand}`, `History: none`],
      ),
      step(
        "Trip",
        "read",
        "Asked the phone where it is",
        `Locale ${s.device.locale}, time zone ${s.device.timeZone}, location ${s.device.city}. Nearest airports ${nearest}. Pegasus flies from ${AIRPORTS[s.network.from].name}, so that's the origin until he says otherwise.`,
        [
          `Locale: ${s.device.locale}`,
          `Location: ${s.device.city}`,
          `From: ${s.network.from}`,
        ],
      ),
      step(
        "Trip",
        "read",
        "Looked at the weather widget",
        `${s.weather.tempC}°C and ${s.weather.sky} in ${s.device.city} today, ${shortDate(s.today)}. Warm is a pitch, not a guess.`,
        [`${s.weather.tempC}°C`, s.weather.sky],
      ),
      step(
        "Trip",
        "read",
        "Checked the calendar",
        s.calendar.granted
          ? `Permission granted. The next weekend with nothing in it is ${weekend}: a Friday to a Monday.`
          : "Permission not granted. I'll pitch dates without it.",
        [`Free: ${weekend}`],
      ),
      step(
        "Trip",
        "think",
        `What flies from ${AIRPORTS[s.network.from].name}`,
        `Direct to ${s.network.direct.map((c) => AIRPORTS[c].city).join(", ")}, and the rest of Türkiye through ${AIRPORTS[s.network.via].city}. Fares from the same inventory the ticket uses.`,
        picks.map((p) => `${AIRPORTS[p.code].city}: from ${formatFare(p.from)} return`),
      ),
      step(
        "Trip",
        "think",
        "What people like him book",
        `${s.cohort.label}, in aggregate: ${s.cohort.ranked.map((c) => AIRPORTS[c].city).join(", then ")}. Not his data; Pegasus's.`,
      ),
      step(
        "Trip",
        "quiet",
        "Ruled out anything that needs a plan",
        "Balloons, a wedding, a week with mates: those come from him, not from a weather widget. Nothing long-haul on a first open either.",
      ),
      step(
        "Trip",
        "act",
        "Picked three",
        `Warm, because of the rain. Istanbul, because the weekend is free and it's the direct flight. ${AIRPORTS.ADB.city}, because it's the cheapest city on the network that month. Each is a sentence he can tap or ignore.`,
        picks.map((p) => p.title),
      ),
      step(
        "Offer",
        "quiet",
        "Nothing to sell",
        "There is no trip yet. Bags and seats are decided from the trip, not before it.",
      ),
      step(
        "Moments",
        "quiet",
        "Nothing to bring up",
        "No history means no moment to predict. A companion that speaks on first open is a pop-up.",
      ),
      step(
        "Trip",
        "wait",
        "Waiting on the sentence",
        "Typed or spoken. I answer with a ticket, not with text.",
      ),
    ],
  };
}

/** A sentence with no place in it: destinations, not flights, each with its reason. */
function discoveryTrace(state: TraceState): Trace {
  const w = will(state);
  const said = extract(w.prompt);
  const when = said.departDate ?? shift(new Date().toISOString().slice(0, 10), 21);
  const picks = suggest(said, WILL, when, WILL.homeAirport);
  return {
    who: "Will's phone",
    when: "Home, after the sentence",
    steps: [
      step("Trip", "read", "Heard the sentence", `"${w.prompt}"`, [
        ...said.vibes.map((v) => `Vibe: ${v}`),
        ...(said.budget === null ? [] : [`Budget: £${said.budget}`]),
        ...(said.month === null ? [] : [`Month: ${MONTH_NAMES[said.month] ?? ""}`]),
      ]),
      step(
        "Trip",
        "think",
        "No place named",
        "So the answer is places, not flights. A list of departure times would answer a question he didn't ask.",
      ),
      step(
        "Trip",
        "think",
        "Scored the network",
        `Every destination against ${said.vibes.length > 0 ? said.vibes.join(", ") : "what a first-timer usually wants"}${said.budget === null ? "" : `, then anything over £${said.budget} dropped, not demoted`}. Fares from the inventory for ${shortDate(when)}.`,
        picks.map((p) => `${p.city}: from ${formatFare(p.from)}`),
      ),
      step(
        "Trip",
        "act",
        `Offered ${picks.length}`,
        picks.map((p) => `${p.city}: ${p.because}`).join(" "),
      ),
      step(
        "Trip",
        "wait",
        "Waiting on a tap",
        "One place, and the trip builds from the same sentence.",
      ),
    ],
  };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function homeTrace(state: TraceState): Trace {
  if (state.prompt === null && state.draft === null) return suggestTrace();
  if (state.draft === null && state.prompt !== null && extract(state.prompt).discovery) {
    return discoveryTrace(state);
  }
  const w = will(state);
  const steps =
    state.edit === null
      ? [...heardSteps(w), ...builtSteps(w)]
      : [...editSteps(w, state.edit), ...builtSteps(w)];
  const thumbs = thumbsStep(state, w);
  if (thumbs !== null) steps.push(thumbs);
  else
    steps.push(
      step(
        "Trip",
        "wait",
        "Waiting on Will",
        "Did I get it right? One tap either way teaches me.",
      ),
    );
  return { who: "Will's phone", when: "Home, after the sentence", steps };
}

function checkoutTrace(state: TraceState): Trace {
  const w = will(state);
  const price = breakdown(w.draft);
  const free = [SQUAD.seats.archie, SQUAD.seats.jess];
  return {
    who: "Will's phone",
    when: "Checkout",
    steps: [
      step(
        "Trip",
        "read",
        "Filled the form nobody sees",
        `Passport ${WILL.onFile.passport}, ${WILL.onFile.from.toLowerCase()}. Paying with ${WILL.onFile.payment}. Nothing to type; a wrong guess costs one tap.`,
        [WILL.onFile.passport, WILL.onFile.payment],
      ),
      step(
        "Offer",
        "quiet",
        "Nothing to add at the till",
        `The bag and the seat were decided on the ticket. Insurance, a car, the lounge: none fits a backpacker on a ${w.itinerary.out?.flight.departs ?? "06:10"}, so none is here. A checkout with four upsells is the funnel I replaced.`,
      ),
      step(
        "Group",
        "think",
        "Seats beside are free",
        `${free.join(" and ")} next to ${w.itinerary.out?.seats[0] ?? "14A"} are free right now. If he sends the trip to anyone, that's the offer they get. Nothing is held: an offer, not a reservation.`,
      ),
      state.booked
        ? step(
            "Trip",
            "act",
            `Booked ${w.itinerary.reference}`,
            `${gbp(price.total)} paid. Now the mates.`,
          )
        : step(
            "Trip",
            "wait",
            `Waiting on Will to pay ${gbp(price.total)}`,
            "One tap. The total is the one on the ticket, to the penny.",
          ),
    ],
  };
}

function inviteePlan(friend: Friend, w: Will): string {
  const seat = seatBeside(w.draft, friend, w.me);
  return friend.account
    ? `${firstName(friend.name)} has the app: a push in Will's name, his booking already built, ${seat ?? "the seat beside"} offered at ${formatFare(SQUAD.seatPricePerLeg)} a leg.`
    : `${firstName(friend.name)} doesn't have the app: a WhatsApp from Will's number, the same booking on the web, ${seat ?? "the seat beside"} offered the same way.`;
}

function confirmationTrace(state: TraceState): Trace {
  const w = will(state);
  const friends = state.sent
    ? w.invited.map((n) => friendByName(n)).filter((f): f is Friend => f !== null)
    : FRIENDS;
  const steps: Step[] = [
    step(
      "Trip",
      "act",
      `Booked ${w.itinerary.reference}`,
      `Will is going. ${gbp(priceOf(w.draft))}, ${w.itinerary.legs.length} legs, seat ${w.itinerary.out?.seats[0] ?? "14A"}.`,
    ),
    step(
      "Group",
      "think",
      "Backpacking is rarely solo",
      "Balloons and a backpack in May: trips like this are usually three or four people. The sentence didn't say who, and I don't guess who a friend is. So I ask whether to send it on, and suggest.",
    ),
    step(
      "Group",
      "read",
      "Looked at his contacts, with permission",
      `Two people stand out: ${FRIENDS.map((f) => `${firstName(f.name)}, ${f.because.toLowerCase()}`).join(" ")}`,
      FRIENDS.map((f) => `${firstName(f.name)}: ${f.account ? "has the app" : "no app"}`),
    ),
    step(
      "Offer",
      "think",
      "Made the seat the nudge",
      `${SQUAD.seats.archie} and ${SQUAD.seats.jess} next to ${w.itinerary.out?.seats[0] ?? "14A"} are free. That's the line each friend gets, in Will's name: the seat beside him, ${formatFare(SQUAD.seatPricePerLeg)} a leg, if they're quick. Nothing is frozen; the fare is today's fare.`,
    ),
    step(
      "Group",
      "think",
      "Picked each friend's channel",
      friends.map((f) => inviteePlan(f, w)).join(" "),
    ),
    ...(state.sent && state.shared.length > 0
      ? [
          step(
            "Group",
            "read",
            `Will added ${listNames(state.shared)}`,
            `Found by name in his contacts, not by me: I suggest two and guess no further. ${listNames(state.shared)} ${state.shared.length === 1 ? "gets" : "get"} the same link in Will's name, with no seat held: the row has two seats beside him, and he said two mates.`,
          ),
        ]
      : []),
    state.sent
      ? step(
          "Group",
          "act",
          `Sent to ${listNames([...w.invited, ...state.shared])}`,
          "A booking built for each, in Will's name. They pay their own way; nobody sees anybody else's fare.",
        )
      : step(
          "Group",
          "wait",
          "Waiting on Will",
          "Untick anyone, add anyone from his contacts, or send to nobody. If he sends to nobody, I don't ask again.",
        ),
    state.mumTold
      ? step(
          "Moments",
          "act",
          `Sent ${WILL.parent?.name ?? "Mum"} the dates and the landing time`,
          "Will said keep her posted. She gets the trip and when he lands, a follow link and STOP; never an offer. If a flight moves she hears the same second he does.",
        )
      : step(
          "Moments",
          "quiet",
          `Asked about ${WILL.parent?.name ?? "Mum"}, sent nothing`,
          `${WILL.parent?.name ?? "Mum"} is in his contacts. Whether she hears is his call, so the card asks once; nothing goes to her until he says so.`,
        ),
  ];
  return { who: "Will's phone", when: "Confirmation", steps };
}

function inviteeTrace(
  state: TraceState,
  id: "archie" | "jess",
  stage: "arrive" | "signup" | "ticket" | "checkout" | "confirmation",
): Trace {
  const w = will(state);
  const friend = FRIENDS.find((f) => firstName(f.name).toLowerCase() === id) ?? FRIENDS[0]!;
  const first = firstName(friend.name);
  const draft = buildInviteeDraft(w.draft, friend, w.me);
  const counts = countBySource(draft);
  const seat = seatBeside(w.draft, friend, w.me);
  const extras = inviteeExtras(w.draft, friend, w.me);
  const base = breakdown(draft);
  const total = base.total + extras.reduce((a, l) => a + l.amount, 0);
  const itinerary = itineraryFor(draft, friend.name);
  const booked = friend.name in state.inviteesBooked;

  const built = step(
    "Group",
    "think",
    `Built ${first}'s booking`,
    `${counts.shared} fields from Will's booking, ${counts.profile} remembered from ${first}'s own, ${counts.predicted} predicted from Will's reasons. Same route, same dates, his own reference.`,
    [`Reference ${itinerary.reference}`, `Seat ${seat ?? "—"}, next to Will`],
  );

  const steps: Step[] = [];
  if (stage === "arrive") {
    steps.push(
      friend.account
        ? step(
            "Group",
            "think",
            "Chose push",
            `${first} has the app, so the booking opens inside it. The push is signed Will, because a mate asking lands and an airline asking doesn't.`,
          )
        : step(
            "Group",
            "think",
            "Chose WhatsApp",
            `${first} has no account. A link from Will's number opens the app on a sign-up that already knows ${friend.pronoun.object}, and the same booking right after. The account is a tap, not a form.`,
          ),
      step(
        "Offer",
        "think",
        "Led with the seat",
        `${seat ?? "The seat"} next to Will is free: that's the first line, at ${formatFare(SQUAD.seatPricePerLeg)} a leg. A mate's seat sells itself; a fare doesn't.`,
      ),
      step(
        "Moments",
        "think",
        "Timed it",
        `Sent the minute Will booked, ${INVITE.sentAt}, while the trip is the thing he's talking about.`,
      ),
      step(
        "Group",
        "wait",
        `Waiting on ${first}`,
        "He opens it or he doesn't. One nudge later, at most.",
      ),
    );
  }
  if (stage === "signup") {
    steps.push(
      step(
        "Group",
        "read",
        "Opened from Will's link",
        `The link carries the invite: ${friend.name}, Will's trip, ${seat ?? "a seat"} held. So the app opens knowing who ${friend.pronoun.subject} is, before any account exists.`,
        [
          `Name: ${friend.name}`,
          "Number: the one Will messaged",
          `Seat ${seat ?? "—"}, next to Will`,
        ],
      ),
      step(
        "Trip",
        "act",
        "Skipped the form",
        "Name and number from the invite; the passport can wait for check-in and the card for the pay button. One tap on Apple or email makes the account. A form in front of a mate's seat is where he leaves.",
      ),
      step(
        "Offer",
        "quiet",
        "Sold nothing here",
        "No newsletter box, no app-only offer. The booking is the reason to join, and it is the next screen.",
      ),
      step("Group", "wait", `Waiting on ${first}`, "Continue, and the ticket is next."),
    );
  }
  if (stage === "ticket") {
    steps.push(
      built,
      step(
        "Offer",
        "think",
        friend.remembered?.meal ? "Remembered the meal" : "Nothing to remember",
        friend.remembered?.meal
          ? `${friend.remembered.meal} on his last bookings: ${formatFare(MEAL_PRICE)} × ${itinerary.legs.length} legs = ${gbp(extras[0]?.amount ?? 0)}, already in the basket and removable in one tap.`
          : `No history, so no extras. Everything not from Will is predicted and underlined.`,
      ),
      step(
        "Trip",
        "act",
        `Priced at ${gbp(total)}`,
        `${first} pays his own way. Will's fare is not on this screen.`,
        base.lines.map((l) => `${l.label}: ${formatFare(l.amount)}`),
      ),
      step("Group", "wait", `Waiting on ${first}`, "Check it, change anything, pay."),
    );
  }
  if (stage === "checkout") {
    steps.push(
      built,
      friend.remembered === null
        ? step(
            "Trip",
            "read",
            "Nothing on file",
            "Passport at check-in, card typed once. The seat beside is still free while he does.",
          )
        : step(
            "Trip",
            "read",
            "Filled the form",
            `${friend.remembered.passport}; ${friend.remembered.payment}. Nothing to type.`,
          ),
      booked
        ? step("Trip", "act", `Booked ${itinerary.reference}`, `${gbp(total)} paid.`)
        : step(
            "Trip",
            "wait",
            `Waiting on ${first} to pay ${gbp(total)}`,
            "His money, his tap.",
          ),
    );
  }
  if (stage === "confirmation") {
    const members = groupMembers(w.me, w.itinerary.out?.seats[0] ?? null, w.invited, {
      ...state.inviteesBooked,
      [friend.name]: seat,
    });
    const done = members.filter((m) => m.status === "booked").length;
    steps.push(
      step(
        "Trip",
        "act",
        `Booked ${itinerary.reference}`,
        `${first} is in, seat ${seat ?? "—"}.`,
      ),
      step(
        "Group",
        "act",
        "Updated the squad",
        `${done} of ${members.length} booked. Will's tracker and the Live Activity say so now, not at the end.`,
        members.map(
          (m) => `${firstName(m.name)}: ${m.status}${m.seat === null ? "" : ` · ${m.seat}`}`,
        ),
      ),
      done === members.length
        ? step(
            "Offer",
            "think",
            "Squad complete",
            "Now, and not before, one offer for all three.",
          )
        : step(
            "Offer",
            "quiet",
            "No offer yet",
            "Half a squad is not a group. Extras wait until everyone has paid.",
          ),
    );
  }
  return {
    who: `${first}'s phone`,
    when:
      stage === "arrive"
        ? friend.account
          ? "A push"
          : "A WhatsApp"
        : stage.charAt(0).toUpperCase() + stage.slice(1),
    steps,
  };
}

function stallsTrace(state: TraceState): Trace {
  const w = will(state);
  const jess = FRIENDS[1]!;
  const left = w.itinerary.out?.flight.seatsLeft ?? 9;
  return {
    who: "Jess's phone, then Will's",
    when: "The next day",
    steps: [
      step(
        "Moments",
        "read",
        "Watched the flight, not a clock",
        `Jess opened the link and didn't pay. The ${w.itinerary.out?.flight.departs ?? "06:10"} is down to ${left} seats, so the reason to nudge is real.`,
      ),
      step(
        "Moments",
        "think",
        "Chose who speaks, and where",
        "A push from Pegasus is marketing, and Jess has no app to push to. The same words from Will on WhatsApp are a mate. So Will is asked first whether to nudge, and the message goes from his phone in his name.",
      ),
      step(
        "Moments",
        "quiet",
        "One nudge, not three",
        "If Jess ignores it, nothing else arrives. I don't chase.",
      ),
      step(
        "Trip",
        "act",
        "Made the card the way in",
        `The card in the message installs the app and opens it on a sign-up that already knows ${jess.pronoun.object}, then Will's flight with ${seatBeside(w.draft, jess, w.me) ?? `${jess.pronoun.possessive} seat`} held. One tap to join, one to pay, nothing to type on either. A form here is where the squad is lost.`,
      ),
    ],
  };
}

function waitingTrace(state: TraceState): Trace {
  const w = will(state);
  const members = groupMembers(w.me, w.itinerary.out?.seats[0] ?? null, w.invited, {
    ...state.inviteesBooked,
    ...(FRIENDS[0] !== undefined && !(FRIENDS[0].name in state.inviteesBooked)
      ? { [FRIENDS[0].name]: SQUAD.seats.archie }
      : {}),
  });
  const booked = members.filter((m) => m.status === "booked");
  const last = w.draft.stops.value[w.draft.stops.value.length - 1];
  return {
    who: "Will's lock screen",
    when: "The waiting window",
    steps: [
      step(
        "Group",
        "act",
        "Kept a Live Activity up",
        `${booked.length} of ${members.length} booked. It updates itself; nobody has to open the app to know.`,
        members.map((m) => `${firstName(m.name)}: ${m.status}`),
      ),
      step(
        "Offer",
        "think",
        "Offered extras only to the booked",
        `${firstName(FRIENDS[0]?.name ?? "Archie")} has paid, so he's asked about 10 kg for souvenirs on the ${last === undefined ? "last" : cityOf(last.code)} leg, cheaper now than at the airport.`,
      ),
      step(
        "Offer",
        "quiet",
        "Nothing for Jess",
        "He hasn't paid. An extra on top of an unpaid fare is noise.",
      ),
    ],
  };
}

function squadTrace(state: TraceState): Trace {
  const w = will(state);
  const members = groupMembers(
    w.me,
    w.itinerary.out?.seats[0] ?? null,
    w.invited,
    state.inviteesBooked,
  );
  const booked = members.filter((m) => m.status === "booked").length;
  const all = booked === members.length;
  return {
    who: "Will's phone",
    when: "My Flights",
    steps: [
      step(
        "Group",
        "read",
        "Counted the squad",
        `${booked} of ${members.length} booked.`,
        members.map(
          (m) => `${firstName(m.name)}: ${m.status}${m.seat === null ? "" : ` · ${m.seat}`}`,
        ),
      ),
      all
        ? step(
            "Offer",
            "think",
            "One offer for three",
            `A ${w.itinerary.out?.flight.departs ?? "06:10"} departure and three people sat together: breakfast is the one extra that makes sense for all of them. ${formatFare(BREAKFAST.each)} × ${members.length} = ${gbp(BREAKFAST.each * members.length)}, offered once, to the organiser.`,
          )
        : step(
            "Offer",
            "quiet",
            "No group offer yet",
            `Waiting for ${members
              .filter((m) => m.status !== "booked")
              .map((m) => firstName(m.name))
              .join(" and ")}. An offer to a half-booked squad is three separate upsells.`,
          ),
      ...(state.sent
        ? []
        : [
            step(
              "Group",
              "quiet",
              "Not sent yet",
              "Will hasn't sent the trip on. The squad card waits; nothing goes to anyone he didn't name.",
            ),
          ]),
    ],
  };
}

function checkInTrace(state: TraceState): Trace {
  const w = will(state);
  const out = w.itinerary.out;
  return {
    who: "Will's lock screen",
    when: `${longDate(shift(w.draft.departDate.value, -2))}, 05:30`,
    steps: [
      step(
        "Moments",
        "think",
        "Counted down to check-in",
        `Check-in for the ${out?.flight.departs ?? "06:10"} on ${shortDate(w.draft.departDate.value)} opens 24 hours before. The day before that is the last chance to fix seats.`,
      ),
      (state.inviteesBooked[FRIENDS[1]?.name ?? ""] ?? null) !== null
        ? step(
            "Group",
            "read",
            "Checked the seats",
            `All three took the seats beside each other when they booked: ${out?.seats[0] ?? "14A"}, ${SQUAD.seats.archie}, ${SQUAD.seats.jess}. Nothing to fix.`,
          )
        : step(
            "Group",
            "read",
            "Noticed Jess has no seat",
            `${FRIENDS[1]?.pronoun.subject === "she" ? "She" : "He"} skipped seat selection, so ${FRIENDS[1]?.pronoun.subject ?? "she"}'d be placed randomly. ${SQUAD.seats.jess} next to ${out?.seats[0] ?? "14A"} is still free, so I ask Will, not Jess.`,
          ),
      step(
        "Moments",
        "act",
        "Checked everyone in",
        `The moment it opened. Gate ${out?.gate ?? SQUAD.gate}, boarding ${out?.boards ?? "05:40"}, passes in the app. Nobody has to remember.`,
      ),
    ],
  };
}

function nextTripTrace(state: TraceState): Trace {
  const w = will(state);
  const drop = fareDrop(w.draft, 1 + FRIENDS.length);
  const home = w.draft.returnDate.value ?? w.draft.departDate.value;
  return {
    who: "Will's lock screen",
    when: longDate(drop.when),
    steps: [
      step(
        "Moments",
        "read",
        `${drop.city} fares down ${drop.dropPercent}%`,
        `I watch fares on the routes the squad hasn't flown. ${cityOf(NEXT_TRIP.origin)} to ${drop.city}, a long weekend in September: ${gbp(drop.nowEach)} return this week, ${gbp(drop.wasEach)} last week. Both numbers are the fare feed's; the percentage is mine.`,
        [
          `Out ${drop.flights.out} · ${shortDate(drop.out)}`,
          `Back ${drop.flights.back} · ${shortDate(drop.back)}`,
          `Last week ${gbp(drop.wasEach)}, now ${gbp(drop.nowEach)}`,
        ],
      ),
      step(
        "Moments",
        "think",
        "Chose who hears first",
        `A squad that flew together is a better audience than a list. ${daysBetween(home, drop.when)} days after they got home, once, to Will: he organised last time. ${FRIENDS.map((f) => firstName(f.name)).join(" and ")} hear it from him, not from me.`,
      ),
      step(
        "Group",
        "think",
        "Sized it for three",
        `${gbp(drop.savingEach)} each is a line in a sale email. ${gbp(drop.savingSquad)} for the three of them, same row, is a plan. So the card says the squad's number, and the saving is computed from the two fares, not quoted.`,
      ),
      step(
        "Group",
        "act",
        "Made it one tap",
        `"Ask ${FRIENDS.map((f) => firstName(f.name)).join(" and ")}" opens the squad, not a search: the three of them, the weekend, the price each.`,
      ),
      step(
        "Moments",
        "quiet",
        "One card, then quiet",
        "If Will says nothing, nothing follows: no reminder, no second drop. A fare drop is a reason to speak once, not a campaign.",
      ),
    ],
  };
}

function hostelTrace(state: TraceState): Trace {
  const w = will(state);
  const stay = stayFor(w.draft);
  const squad = [w.me, ...w.invited].map(firstName);
  const ending =
    state.hostel === "booked"
      ? step(
          "Trip",
          "act",
          `Booked ${stay.people} beds in the cave dorm`,
          `${gbp(stay.total)} on Will's card, ${gbp(stay.each)} each, ${squad.slice(1).join(" and ")} told. One booking for the squad, like the breakfast.`,
        )
      : state.hostel === "declined"
        ? step(
            "Moments",
            "quiet",
            "Not this trip",
            "No stay is mentioned again, here or at check-in. A no is an answer, not a delay.",
          )
        : step(
            "Moments",
            "wait",
            "Waiting on Will",
            "Book it for three, or not this trip. Either way I don't ask twice.",
          );
  return {
    who: "Will's lock screen",
    when: "The evening after the squad was complete",
    steps: [
      step(
        "Moments",
        "read",
        "Three flights, no bed",
        `${stay.people} people, ${w.itinerary.legs.length} sectors each, and no stay on any booking. No hotel email in the inbox either, with permission. ${stay.town} is the stop that matters: ${stay.nights} nights for the balloons.`,
        [`${stay.town}: ${stay.nights} nights`, `Squad: ${squad.join(", ")}`],
      ),
      step(
        "Trip",
        "think",
        "Picked one, not a list",
        `A backpacking squad of three on a ${w.itinerary.out?.flight.departs ?? "06:10"}: a cave dorm in ${stay.town}, walking distance from the balloon pick-up, ${gbp(stay.perNight)} a night a bed. One place, one price. A list is a search, and he didn't ask for a search.`,
        [stay.name, stay.room, `${gbp(stay.perNight)} a night each`],
      ),
      step(
        "Offer",
        "think",
        "Said the squad's number",
        `${gbp(stay.perNight)} × ${stay.nights} nights = ${gbp(stay.each)} each; × ${stay.people} = ${gbp(stay.total)} for the three of them. Computed from the nights on the ticket, not quoted.`,
      ),
      step(
        "Moments",
        "quiet",
        "Once, the evening after Jess booked",
        "Not at checkout, where it would have been a fourth upsell, and not before the squad was complete, when the plan could still change. One card, no reminder.",
      ),
      ending,
    ],
  };
}

function squadCancelledTrace(state: TraceState): Trace {
  const w = will(state);
  const out = w.itinerary.out;
  const later = inventory(SQUAD.origin, "SAW", w.draft.departDate.value)[1];
  return {
    who: "Will's lock screen",
    when: `${longDate(w.draft.departDate.value)}, 04:50`,
    steps: [
      step(
        "Trip",
        "read",
        `${out?.flight.flightNo ?? "PC 1164"} cancelled`,
        `The ${out?.flight.departs ?? "06:10"} is off. Three people, one booking each, same onward flight from Istanbul.`,
      ),
      step(
        "Trip",
        "think",
        "Found the next flight that still connects",
        later === undefined
          ? "The next departure on the same route."
          : `${later.flightNo} at ${later.departs} lands ${later.arrives}, in time for the Kayseri leg. Three seats together: 21A to 21C.`,
      ),
      step(
        "Trip",
        "act",
        "Rebooked all three",
        "Before anyone queued at a desk. Then told them, in that order: rebooked first, told second.",
      ),
      step(
        "Moments",
        "act",
        state.mumTold
          ? "Told Archie, Jess and Mum the same second"
          : "Told Archie and Jess the same second",
        `Three phones, one message each, with the new flight already in it. ${
          state.mumTold ? "Mum follows the trip, so she got the new landing time too." : ""
        }Nobody got an apology without a plan.`,
      ),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* The opening nudge, and Mum                                            */
/* ------------------------------------------------------------------ */

function nudgeTrace(state: TraceState): Trace {
  const nudge = tripNudge(state.nudge);
  const w = will(state);
  const steps: Step[] = [
    step(
      "Moments",
      "read",
      "Three signals, no form",
      `Will has typed nothing. What the phone and the app give away, with permission: ${nudge.why.join(" ")}`,
      nudge.facts.slice(0, 3),
    ),
    step(
      "Moments",
      "think",
      "Checked the gates",
      `${TRIP_NUDGE.budget} unasked message a quarter, and only if he hasn't said not this time or never. ${
        nudge.quiet ?? "All three open: it may speak, once."
      }`,
      [nudge.facts[3] ?? ""],
    ),
  ];
  if (nudge.verdict === "silent") {
    steps.push(
      step(
        "Moments",
        "quiet",
        "Said nothing",
        `${nudge.quiet ?? "Not the moment."} One gate is enough. The phone stayed dark.`,
      ),
    );
    return {
      who: "Will's lock screen",
      when: `${TRIP_NUDGE.date}, ${TRIP_NUDGE.time}`,
      steps,
    };
  }
  steps.push(
    step(
      "Trip",
      "think",
      "Built the week before asking",
      `${routeSentence(w.draft)} ${gbp(nudge.priceEach)} each all in, so the card carries a real number, not "from".`,
      legFacts(w.itinerary),
    ),
    step(
      "Group",
      "think",
      "Counted the three",
      `${FRIENDS.map((f) => `${firstName(f.name)} ${f.account ? "has the app" : "doesn't"}`).join(", ")}. The invites are ready the moment he books; nothing goes to anyone until he does.`,
    ),
    step(
      "Moments",
      "act",
      "Spoke, once, on the lock screen",
      `At ${TRIP_NUDGE.time}, where he'll see it. "Why I spoke" is on the card so he can check me.`,
      nudge.why,
    ),
    step(
      "Moments",
      "wait",
      "Waiting on Will",
      "Yes builds the ticket. Not this time, or don't suggest trips, and I don't ask twice.",
    ),
  );
  return { who: "Will's lock screen", when: `${TRIP_NUDGE.date}, ${TRIP_NUDGE.time}`, steps };
}

function mumTrace(state: TraceState, cancelled = false): Trace {
  const w = will(state);
  const first = w.itinerary.out;
  const lands = first?.flight.arrives ?? "12:05";
  const later = inventory(SQUAD.origin, first?.to ?? "SAW", w.draft.departDate.value)[1];
  const parent = WILL.parent;
  if (cancelled) {
    return {
      who: "Mum's phone",
      when: `${longDate(w.draft.departDate.value)}, 04:51`,
      steps: [
        step(
          "Moments",
          "read",
          "Will's flight moved",
          `${first?.flight.flightNo ?? "PC 1164"} cancelled; ${later?.flightNo ?? "the next flight"} lands ${later?.arrives ?? "19:25"} instead of ${lands}.`,
        ),
        step(
          "Moments",
          "think",
          "She asked to know",
          `${parent?.name ?? "Mum"} follows the trip because Will said so. A flight that moved is her news as much as his; an offer never is.`,
        ),
        step(
          "Moments",
          "act",
          "Told her the same second as Will",
          "The new flight and landing time, nothing else, and that he knows. No apology without a plan.",
        ),
      ],
    };
  }
  return {
    who: "Mum's phone",
    when: `${INVITE.sentLong}, 18:33`,
    steps: [
      step(
        "Moments",
        "read",
        "Will said keep her posted",
        `${parent?.name ?? "Mum"} in ${parent?.city ?? "Norwich"}, from his contacts, with permission. ${first?.flight.flightNo ?? "PC 1164"} lands ${cityOf(first?.to ?? "SAW")} ${lands} on ${shortDate(w.draft.departDate.value)}.`,
      ),
      step(
        "Moments",
        "think",
        "What a parent wants to know",
        "The dates, who he's with, and when he lands. Not the fare, not the seat, not the hostel.",
      ),
      step(
        "Moments",
        "act",
        "Sent one message",
        "The trip, the landing, a follow link, and STOP in the same breath. One tap installs the app: a direct customer Pegasus didn't have.",
      ),
      step(
        "Moments",
        "quiet",
        "No offers, ever",
        "She is on the status list, not the marketing one. The two were separate from the start.",
      ),
    ],
  };
}

function mumStopTrace(state: TraceState): Trace {
  const w = will(state);
  return {
    who: "Mum's phone",
    when: INVITE.sentLong,
    steps: [
      step("Moments", "read", "Mum replied STOP", "One word. It means what it says."),
      step(
        "Moments",
        "act",
        "Flight status only, for good",
        `She still hears if ${firstName(w.me)}'s flights move. She never hears an offer. The two lists were separate from the start, which is what makes this a one-line change.`,
      ),
      step(
        "Moments",
        "quiet",
        'No "are you sure"',
        "Messages she never asked for would cost the family's trust.",
      ),
    ],
  };
}

/* ------------------------------------------------------------------ */

/** The trace for a route, from the demo's state, titled after its scene. */
export function traceFor(pathname: string, state: TraceState): TitledTrace {
  const found = sceneFor(pathname);
  return {
    title: found === null ? "This screen" : found.scene.title,
    ...untitled(pathname, state),
  };
}

function untitled(pathname: string, state: TraceState): Trace {
  switch (pathname) {
    case "/nudge":
      return nudgeTrace(state);
    case "/":
      return homeTrace(state);
    case "/checkout":
      return checkoutTrace(state);
    case "/confirmation":
      return confirmationTrace(state);
    case "/group":
      return squadTrace(state);
    case "/invite/archie":
      return inviteeTrace(state, "archie", "arrive");
    case "/invite/archie/ticket":
      return inviteeTrace(state, "archie", "ticket");
    case "/invite/archie/checkout":
      return inviteeTrace(state, "archie", "checkout");
    case "/invite/archie/confirmation":
      return inviteeTrace(state, "archie", "confirmation");
    case "/invite/jess":
      return inviteeTrace(state, "jess", "arrive");
    case "/invite/jess/signup":
      return inviteeTrace(state, "jess", "signup");
    case "/invite/jess/ticket":
      return inviteeTrace(state, "jess", "ticket");
    case "/invite/jess/checkout":
      return inviteeTrace(state, "jess", "checkout");
    case "/invite/jess/confirmation":
      return inviteeTrace(state, "jess", "confirmation");
    case "/invite/jess/stalls":
      return stallsTrace(state);
    case "/squad/waiting":
      return waitingTrace(state);
    case "/squad/hostel":
      return hostelTrace(state);
    case "/squad/check-in":
      return checkInTrace(state);
    case "/squad/next-trip":
      return nextTripTrace(state);
    case "/squad/cancelled":
      return squadCancelledTrace(state);
    case "/follow/mum":
      return mumTrace(state);
    case "/follow/mum/cancelled":
      return mumTrace(state, true);
    case "/follow/mum/stop":
      return mumStopTrace(state);
    default:
      return homeTrace(state);
  }
}
