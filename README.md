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

The phone is the mock. The **presenter's panel** beside it has two views.
**Agent**, the default, is the companion thinking, live: when a screen needs the
agents' work, their steps stream in one at a time, the way a model's reasoning
does, and the phone shows its result only when the last step has landed. What
each agent read, what it concluded, what it did, and what it decided not to do,
with the figures it used. On a first open that is the Trip agent working out
three trips from what the phone and the sign-up give away (locale, location,
the weather widget, a free weekend on the calendar, the network from Stansted,
what passengers like Will book in aggregate), with every input named.
**Scenes** lists every beat of the journey and jumps straight to it.

Two more things stand in for what a phone cannot do. When the story moves to
someone else's device (Archie's push, Jess's WhatsApp, Mum's message) a **second
phone** appears on the left, is used like any other, and goes away when that
person's part is done. The **time strip** under the main phone jumps its clock
to the later moments: the morning the companion speaks, the waiting window,
check-in. The journey runs end to end by tapping inside the phones. Every
screen also works when opened cold; it falls back to Will's week.

The Agent view is computed, not written. `lib/agent/trace.ts` builds each step
from the same calls the screen made, so the panel cannot say one thing while
the phone shows another; `lib/agent/trace.test.ts` holds it to that. Each step
shows its headline; the reasoning and the figures open on a tap.

The **impact column** at the far right is the commercial case, moving as the
demo moves: revenue, add-ons, bookings and new users, each against a
stated model of today's app. `lib/metrics/impact.ts` computes it from the same
drafts and prices the screens print, and says at its foot how "today" is
counted.

### The journey · Three mates go to Cappadocia

Will, 26, London, with Archie and Jess. A cold start: no history, no profile.

1. **The companion speaks first.** Will has typed nothing. On a Tuesday morning
   it speaks once on his lock screen: "Balloons in Cappadocia with Archie and
   Jess?", 409.40 GBP each all in, with _Why I spoke_ a tap away: two searches
   for Cappadocia in February, a week in May free in his calendar and in the
   three of theirs, May fares at their lowest since October. One unasked
   message a quarter. "Not this time" keeps it quiet until the next free week;
   "Don't suggest trips" keeps it quiet for good.
2. **A wish becomes a week.** Yes builds the week he would have asked for: a
   four-flight route on Pegasus's network (in through Istanbul, the balloons,
   out via Antalya), the week, the price, and a ticket: flights, seat, fare and
   baggage, with the breakdown and every field changeable underneath, or
   changed in a sentence. Everything it guessed carries a dotted underline and
   a reason. Four sectors where today's app sells one. From "backpacking" it
   puts SAVER on the ticket (a 40L pack won't fit under the seat) and the seat
   sheet gives a reason to take the window on a 06:10.
3. **Nothing to type.** Checkout fills the passport from his Wallet, checks it
   against the 150 days Türkiye asks for, and pays with Apple Pay. The Offer
   agent adds nothing at the till: insurance, a car and the lounge don't fit a
   backpacker, so they aren't there.
4. **Send it to your friends?** The confirmation suggests two people from his
   contacts and lets him search for more. Each gets it in Will's name, with the
   seat next to his offered at 7 GBP a leg. Under it, **keep Mum posted?**:
   the dates, who he's with and when he lands, a follow link and STOP, never
   an offer. Her phone appears beside his.
5. **Archie has the app.** A push in Will's name leads with the seat and opens a
   booking already built: flights from Will, fare and seat predicted, passport,
   payment and his usual hot meal remembered. He checks and pays.
6. **Jess doesn't.** A WhatsApp from Will opens the app on a sign-up with
   nothing to type, then the same booking, ready to pay.
7. **The waiting window.** A lock-screen tracker shows who has booked and sells
   extras to the ones already in.
8. **Jess stalls.** When everyone else is in, one WhatsApp from Will, drafted
   by the companion: get the app, book the same flight. One tap to join, one
   to pay.
9. **Squad complete.** All three booked, seats together, one group offer that
   makes sense for three: breakfast for the 06:10, to the organiser only.
   That evening, one more: "Looking to book a hostel?", one cave dorm in
   Göreme for the balloon nights, priced for three, booked in a tap or
   declined for the trip.
10. **Checked in for them**, then the unhappy path: the 06:10 is cancelled,
    all three rebooked before anyone queued, told second, and Mum's phone
    shows the new landing time the same second.
11. **The next trip.** Two months after they get home, fares to Bodrum drop
    10%: same three, a long weekend in September, 76.50 GBP less than last
    week for the squad, offered to Will first. One card, then quiet.

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
  nudge/                   The first screen: the companion speaks first, on Will's lock screen.
  page.tsx                 Will's home: greeting, thinking, the week as a ticket.
  checkout/ confirmation/  Will's checkout and confirmation (send it to your friends).
  group/                   Organiser side: who's coming, review, squad status.
  invite/archie/ jess/      Invitee side: push or WhatsApp, ticket, checkout, confirmation, stalls.
  squad/                   Lock-screen moments: waiting window, hostel, check-in, cancelled, next trip.
  follow/mum/              Mum's phone: the landing time, the cancellation, STOP.
components/
  phone-frame.tsx          The device, and the stage: second phone, main phone, panel.
  companion-phone.tsx      The second phone: Archie's, Jess's or Mum's, when the story is there.
  time-strip.tsx           Jumps the main phone's clock to the later moments.
  agent-provider.tsx       The agents running: one streaming run per phone, and the wait.
  phone-nav.tsx            Where a tap goes: the browser's router, or the second phone's screen.
  scenes.tsx               The presenter's panel: Agent (live) and Scenes (the list).
  impact.tsx               The impact column: the companion against today's app.
  journey-provider.tsx     What the passengers have done so far, in session storage.
  ui/                      The design system: avatar, shell, nav, sheet, lock screen, tags.
  screens/                 One file per screen or family of screens.
lib/
  journey/flights.ts       Deterministic mock inventory. No network.
  journey/script.ts        The demo's routes, pinned, so every screen prints the same numbers.
  assistant/               Sentence → trip: understand, draft (provenance), price, itinerary.
  group/group.ts           Friends and why they're suggested, the invitee's booking, the seat beside.
  group/trip-nudge.ts      The opening nudge: three signals, the gates, Why I spoke.
  group/stay.ts, next-trip.ts  The hostel for three, and the fare drop, as figures.
  agent/trace.ts           What each agent read, thought and did on every screen, computed.
  agent/first-open.ts      The first open: the device and sign-up signals, and the three pitches.
  metrics/impact.ts        Revenue, add-ons, bookings and new users, companion against today.
  agent/scenes.ts          Every beat of the journey, with its route.
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
