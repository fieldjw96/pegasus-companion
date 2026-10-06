# pegasus-companion

A mock of the Pegasus Airlines mobile app with an agentic **AI Travel Companion**
built into it, as a web app. The companion is four agents behind one face:
**Trip** turns a wish into an itinerary and rebuilds repeat trips; **Offer**
predicts which bag, seat or bundle each traveller will buy, and when to ask;
**Group** turns one booking into a group; **Moments** picks the moment and the
channel.

Built by Team Winging It for the Pegasus × Berkeley Haas **AI Travel Companion
Hackathon**. **Not affiliated with Pegasus Airlines.** Every fare, flight, price
and person here is invented. Nothing books anything and no payment is taken.

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
lists every beat of both journeys and jumps straight to it, because a phone
cannot show "two days later" or "on Archie's phone" on its own. Every screen
also works when opened cold; it falls back to the persona's starting trip.

### Journey 1 · The lads go to Cappadocia

Will, 26, London. A cold start: no history, no profile.

1. **A wish becomes a week.** He says "Balloons in Cappadocia with 2 mates,
   backpacking, a week in May". The companion builds a four-flight route on
   Pegasus's network, picks the week, prices it, and prints a ticket. What it
   heard is shown as chips; everything it guessed carries a dotted underline and
   a reason. One tap says "actually: a city break" and the route re-ranks.
2. **The bag, sold at booking.** From "backpacking" it puts SAVER on the ticket
   with the reason: a 40L pack won't fit under the seat, and the bag costs less
   inside the fare than at the airport.
3. **Nab the window.** The seat sheet gives a reason to buy: the 06:10, the
   window, and the two seats beside him shown to his mates when they book.
4. **Lock the price, invite the lads.** From the confirmation, Price Freeze holds
   today's fare for Archie and Tom and sends the invites. Thumbs feed the agents.
5. **Archie has the app.** A push in Will's name opens a booking already built:
   flights from Will, fare and seat predicted, passport, payment and his usual
   hot meal remembered. He checks and pays.
6. **Tom doesn't.** A WhatsApp from Will opens the same booking on the web and
   brings him into the app.
7. **The waiting window.** A lock-screen tracker shows who has booked and how
   long the frozen fare has left, and sells extras to the ones already in.
8. **Tom stalls.** A nudge in Will's name, and a rescue when his card is
   declined.
9. **Squad complete.** All three booked, seats together, one group offer that
   makes sense for three: breakfast for the 06:10.
10. **Checked in for them**, **the next trip** (a new route offered first to the
    group), and the unhappy path of a cancelled flight.

### Journey 2 · Home for Mum's birthday

Emre, 34, Istanbul. A warm start: he has flown it before.

1. **Two months out.** The companion learned last June's trip and speaks on the
   lock screen on 14 April, with _Why I spoke_, while he is most likely to book.
2. **One tap, his usual.** The trip is rebuilt from last year: the Friday 19:05,
   SAVER, seat 3A, all-in price up front. It guessed the Sunday; it's Mum's
   birthday, so he stays. "Not quite: return date" fixes it and teaches it.
3. **Room for presents.** Extras built around the occasion: weight for gifts and
   Turkish delight from Pegasus Café. The passport is checked before payment.
4. **Dad's in on the surprise.** Dad follows the flight; Mum finds out when Emre
   walks in.
5. **The flight is cancelled.** Rebooked first, told second, Dad told too.
6. **Next year.** The same nudge, two months out. It stays quiet if told to:
   "not this year" holds for a year, "don't suggest again" for good, and Dad's
   STOP leaves him with flight status only.

## Design

Built to the design canvas, screen for screen: Figtree for UI, Archivo for the
wordmark, airport codes, times and totals; white cards on `#F2F6FA`; yellow fill
for the one primary action per screen; orange for text links, the active
underline and the dotted "mine" underline, never a fill. Both fonts are OFL and
self-hosted under `public/fonts`, so neither the build nor the demo depends on
the venue's wifi. The companion's face is a cartoon Pegasus from the myth, drawn
as inline SVG so its wings can beat while it thinks. It is not the airline's
trademark.

## Architecture

```
app/                       One route per screen. Server components rendering client islands.
  page.tsx                 Will's home: greeting, thinking, the week as a ticket.
  checkout/ confirmation/  Will's checkout and confirmation (Freeze and invite).
  group/                   Organiser side: who's coming, review, squad status.
  invite/archie/ tom/      Invitee side: push or WhatsApp, ticket, checkout, confirmation, stalls.
  squad/                   Lock-screen moments: waiting window, check-in, next trip, cancelled.
  emre/                    Emre's usual trip, checkout, confirmation.
  flights/                 My Flights: trips I'm watching, the moment sheet.
  moment/                  Lock-screen mornings: nudge, quiet, look, reminder, opt-outs, Dad.
components/
  phone-frame.tsx          The device. Every screen renders inside it.
  scenes.tsx               The presenter's panel.
  journey-provider.tsx     What the passengers have done so far, in session storage.
  ui/                      The design system: avatar, shell, nav, sheet, lock screen, tags.
  screens/                 One file per screen or family of screens.
lib/
  journey/flights.ts       Deterministic mock inventory. No network.
  journey/script.ts        The demo's routes, pinned, so every screen prints the same numbers.
  assistant/               Sentence → trip: understand, draft (provenance), price, itinerary.
  group/group.ts           Friends, Price Freeze, the invitee's booking, the seat beside.
  moments/moments.ts       Mum's birthday: the usual trip, the nudge rule, the three gates.
```

**Everything the companion says is arithmetic, in code.** "112.00 GBP cheaper",
"14B next to him is yours", "down to 7 seats": computed, never asserted. The
routes the demo runs on are pinned by route in `lib/journey/script.ts`, keyed
by route rather than date so the figures hold whichever month the demo is run
in. `lib/journey/script.test.ts` asserts every one of them.

**Restraint is a property of the system.** `lib/moments/moments.ts` has three
gates, each of which alone keeps the companion quiet: it is not the moment; the
passenger said not this year, or never; the interruption budget is spent. A
change that makes it speak more often is a regression unless the Ticket says
otherwise.

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
