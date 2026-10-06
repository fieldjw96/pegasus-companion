# pegasus-companion

A mock of the Pegasus Airlines mobile app with an agentic **AI Travel Companion**
built into it, as a web app.

Built for the Pegasus × Berkeley Haas **AI Travel Companion Hackathon**.
**Not affiliated with Pegasus Airlines.** Every fare, flight, price and person
here is invented. Nothing books anything and no payment is taken.

## Running it

No database, no auth, no secrets, no `.env` required.

```bash
npm ci
npm run dev
```

Then open **http://localhost:3000** — `localhost`, not `127.0.0.1`. Next refuses
its own dev chunks on the latter and the page renders with no interactivity, which
looks exactly like a broken build and is not one.

The whole check chain, which is what CI runs:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build
```

## What you are looking at

The phone is the mock. The **scenes panel** beside it is for the presenter: it
lists every screen of both journeys and jumps straight to it, because a phone
cannot show "two days later" or "on a friend's phone" on its own. Every screen
also works when opened cold; the trip falls back to the demo's hero trip.

Everything the companion does is one of three things:

1. **Part 1 · Booking.** A passenger says a trip in one sentence (or taps one under
   _Try_). The companion fills in what was not said from past bookings and prints a
   ticket. Every value it chose carries a dotted underline; _Change anything_ shows
   where each came from (you said, remembered, predicted) and why. One tap to pay.
2. **Part 2 · Group booking.** From the confirmation, the companion offers to hold
   the same flights for the friends the passenger usually travels with and to build
   each their own booking. On the friend's phone a notification leads to a ticket
   already built from the organiser's flights and the friend's own history, with one
   question the companion could not answer alone: the seat beside the organiser.
   Each pays only for themself; nobody sees anybody else's fare.
3. **Part 3 · The companion moves first.** A trip described as tolerances rather
   than a search: a week, a few places, a cap, must-haves, a buy rule, a deadline.
   The companion checks every morning and speaks only when the answer changes,
   on the lock screen, with _Why I spoke_. Approve goes through Face ID without
   opening the app. The mornings it has nothing to say, it says so, and counts
   them.

### The two journeys

The prototype has to carry two user journeys end to end, and does:

- **Journey 1, cold start.** Speak the trip → a ticket with reasons → checkout →
  confirmation → build a group → friends' seats held → the friend's phone →
  group status filling in. Scenes: Part 1 then Part 2.
- **Journey 2, warm start.** The moment is spotted before anyone searches → the
  intent sheet → watching → a quiet morning → the fare drops and the companion
  proposes → approve from the lock screen, or look, or say not this one → the
  deadline rule. Scenes: Part 3.

## Design

Built to the design canvas, screen for screen: Figtree for UI, Archivo for the
wordmark, airport codes, times and totals; white cards on `#F2F6FA`; yellow fill
for the one primary action per screen; orange for text links, the active
underline and the dotted "mine" underline, never a fill. Both fonts are OFL and
self-hosted under `public/fonts`, so neither the build nor the demo depends on
the venue's wifi.

The companion's face is a cartoon Pegasus from the myth, drawn as inline SVG so
its wings can beat while it thinks. It is not the airline's trademark.

## Architecture

```
app/                       One route per screen. Server components rendering client islands.
  page.tsx                 Greeting, thinking, ticket.
  checkout/ confirmation/  Jack's checkout and confirmation (with the group card).
  group/                   Organiser side: people, review, status.
  invite/                  Invitee side: lock screen, ticket, checkout, confirmation, email.
  flights/                 My Flights: trips I'm watching, the intent sheet.
  companion/               Lock-screen mornings: quiet, proposal, look, not this one, deadline.
components/
  phone-frame.tsx          The device. Every screen renders inside it.
  scenes.tsx               The presenter's panel.
  journey-provider.tsx     What the passenger has done so far, kept in session storage.
  ui/                      The design system: avatar, shell, nav, sheet, lock screen, tags.
  screens/                 One file per screen or family of screens.
lib/
  journey/flights.ts       Deterministic mock inventory. No network.
  journey/script.ts        The hero trip, pinned, so every screen prints the same numbers.
  assistant/               Sentence → trip: understand, draft (provenance), price, itinerary.
  group/group.ts           Friends, the hold, the invitee's booking, the seat offer.
  watch/watch.ts           The watch: intent, the scripted market, the three gates.
```

**Everything is arithmetic, in code.** The companion's sentences ("84.00 GBP
cheaper", "dropped 94 GBP overnight") are computed, never asserted. The one hero
trip is pinned in `lib/journey/script.ts` so the ticket, the Live Activity, the
friend's notification and the deck all agree: SAVER PLUS for three over two legs
is 1224.66, a friend on LIGHT with a cabin bag is 342.22, and the seat beside the
family is 19C at 9.00 a leg. `lib/journey/script.test.ts` asserts every one of
those figures.

**Restraint is a property of the system.** `lib/watch/watch.ts` has three gates,
each of which alone keeps the companion quiet: nothing changed; the change does
not cross the cap; the interruption budget is spent. A change that makes it speak
more often is a regression unless the Ticket says otherwise.

**The sentence is deterministic.** `lib/assistant/understand.ts` is rules over
the text. A real build would put a model there; nothing else would change,
because the harder half is what to do once you know what was said.

## Deliberate differences from the sibling repos

This repo copies `caddie` and `rolodeck-ai` conventions almost exactly — same CI
gate order, same `.gitattributes`, same tsconfig strictness, same Tailwind v4
setup. Three deliberate departures:

1. **Next is pinned to `16.3.8`, not caddie's `16.3.3`.** 16.2.0–16.3.5 carry a
   critical RCE in `next/og` (GHSA-vcvr-r3jv-pc5j). `npm audit --audit-level=high`
   in CI is what keeps this honest.
2. **Vercel's Git integration stays on.** This repo has no database, so the simple
   path is the correct one: no deploy workflow, no `VERCEL_TOKEN`, no secrets.
3. **No Playwright in the repo.** Unit tests on the decision logic and a render
   test on the ticket are where the value is; an e2e suite is not.
