/**
 * Clicks: the companion against today's app. The tile says clicks; on a phone each is a tap.
 *
 * A tap is one touch that is not a keystroke: opening a field counts, typing
 * into it does not, so today's count is the floor of what the form asks for.
 * Today's figures are read screen by screen off pegasus-baseline, the mock of
 * the live journey, for one return booking with a seat and a bag, by a
 * passenger with no account and no saved card. Where the live app's defaults
 * are wrong for Will but right for a Turkish passenger, the fix is not
 * counted, so the figure is one Pegasus can check against its own funnel. The
 * companion's are the taps the demo's own screens take between the first
 * touch and "paid", so the two columns count the same thing.
 */
export type TapScreen = { screen: string; taps: number; what: string };

/** The live journey, one return, one passenger. Keystrokes are not counted. */
export const TODAY_TAPS: TapScreen[] = [
  {
    screen: "Search",
    taps: 9,
    what: "From, To, out and back: open each, pick each. Then Search Flight.",
  },
  { screen: "Departure flight", taps: 1, what: "Pick the flight." },
  { screen: "Departure package", taps: 2, what: "Pick a package, Continue." },
  { screen: "Return flight", taps: 1, what: "Pick the flight." },
  { screen: "Return package", taps: 2, what: "Pick a package, Continue." },
  {
    screen: "Passenger details",
    taps: 8,
    what: "Name, surname, date of birth (open, pick), gender, mobile, Continue. The form also opens on Turkish Citizen and a CA dial code, which a British passenger has to change; those two are left out, so the count holds for a Turkish passenger too.",
  },
  { screen: "Seat, out", taps: 2, what: "Pick a seat, proceed." },
  { screen: "Baggage, out", taps: 3, what: "Cabin bag, checked bag, proceed." },
  { screen: "Seat, back", taps: 2, what: "Pick a seat, proceed." },
  { screen: "Baggage, back", taps: 3, what: "Cabin bag, checked bag, proceed." },
  { screen: "Additional services", taps: 1, what: "Skip." },
  {
    screen: "Payment",
    taps: 5,
    what: "Card number, holder, expiry, CVV: open each. Pay now.",
  },
];

/** What one booking costs in taps today. */
export const TODAY_TAPS_PER_BOOKING = TODAY_TAPS.reduce((sum, s) => sum + s.taps, 0);

/**
 * The companion's taps, per person, from the demo's own screens.
 *
 * Will: "Yes, plan it" (or the sentence sent) and Pay. Sending the trip on
 * is one tap of his that the friends' bookings depend on, so it is counted
 * with theirs. Archie: the push, Book in one tap, Book. Jess: the WhatsApp
 * card, Continue with Apple, Book and pay. The stall route is the same three.
 */
export const COMPANION_TAPS = {
  organiser: 2,
  send: 1,
  invitee: 3,
} as const;
