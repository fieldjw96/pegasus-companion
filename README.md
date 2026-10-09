# pegasus-companion

**Agentic underneath. A companion on the surface.**

A working mock of the Pegasus Airlines app with an AI travel companion built
into it. The companion speaks first, builds a whole trip from a yes, brings the
friends in, keeps a parent posted, and stays quiet when it should. The deck
calls it **Kanat**, Turkish for wing; in the app it is just a face.

Built by Team Winging It (Jamie Clements, Jack Field, Yitzy Rosenberg, Austin
Lai) for the Pegasus × Berkeley Haas **AI Travel Companion Hackathon**. **Not
affiliated with Pegasus Airlines.** Every fare, flight, price and person is
invented. Nothing books anything and no payment is taken.

## Try it

Live: **https://pegasus-companion-git-feat-pegasus-companion-demo-jf-6a2d.vercel.app/nudge**

Start on the lock screen and tap through. Everything after that is tapped
inside the phones; the panel beside them is for whoever is presenting.

To run it locally, with no database, auth, secrets or `.env`:

```bash
npm ci
npm run dev
```

Then open **http://localhost:3000/nudge** (`localhost`, not `127.0.0.1`; Next
refuses its own dev chunks on the latter and the page looks broken when it is
not).

## What Pegasus asked for, and what we built

Three things Pegasus said on day one became the design rules.

- **"If it could run on the old stack, it's previous technology."** So the
  companion acts, it does not chat. There is no transcript and no reply bubble.
  The one input is a sentence, answered with a ticket; everywhere else the
  companion decides when to speak.
- **"We don't want a white-label tool."** So it is built on what only Pegasus
  has: live fares and seat maps, the booking and payment it can complete, past
  trips and abandoned searches, and the feedback from every tap.
- **74% of customers choose the cheapest fare.** So offers are need-based. The
  bag goes on the ticket only where the trip says a bag is needed, with the
  reason underlined; the lounge, the car and the insurance are never shown to
  a backpacker.

Four agents do the work, each moving a commercial outcome.

| Agent       | What it does                                                                                               | What it moves                         |
| ----------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Trip**    | Spots a trip before anyone searches and offers it, then turns the yes into a full itinerary on the network | More passengers, repeat booking       |
| **Offer**   | Predicts the extra each traveller will buy, and when                                                       | More per passenger                    |
| **Group**   | Turns one booking into a group, seated together                                                            | New direct customers, more passengers |
| **Moments** | Picks the right moment and channel                                                                         | Repeat booking, protects the booking  |

Four guardrails hold throughout. Pegasus sets every price. The passenger
confirms every purchase. Silence is a feature: ignored offers are not repeated,
"not this time" holds until the next free week, "don't suggest trips" holds for
good. And every number the companion says is computed in code and handed over
as a sentence; nothing is a model's guess.

## The journey: three mates go to Cappadocia

Jess, 26, London, with Archie and Will. A cold start: no history, no profile.

1. **The companion speaks first.** Jess has typed nothing. One Tuesday morning
   it speaks once on her lock screen: "Balloons in Cappadocia with Archie and
   Will?", 409.40 GBP each, all in. _Why I spoke_ is a tap away: two searches
   for hostels in Göreme in February, a week in May free in her calendar and in
   theirs, May fares at their lowest since October. One unasked message a
   quarter.
2. **A wish becomes a week.** Yes builds the week she would have asked for: four
   flights on Pegasus's network, in through Istanbul and out via Antalya, with
   seat, fare and bag. Everything guessed carries a dotted underline and a
   reason, and any field changes in a tap or a sentence. Four sectors where
   today's app sells one.
3. **Nothing to type.** Checkout fills the passport from her Wallet, checks it
   against the 150 days Türkiye asks for, and pays with Apple Pay.
4. **Send it to your friends to claim a voucher?** The confirmation suggests
   two people from her contacts and lets her search for more. Each gets the
   trip in Jess's name, with the seat next to hers offered at 7 GBP a leg.
   Under it, **keep Dad posted?**: one button, and he gets the dates, who she
   is with and when she lands, told the same second if a flight moves, never an
   offer.
5. **Archie has the app.** A push in Jess's name opens a booking already built:
   flights from Jess, fare and seat predicted, passport, payment and his usual
   hot meal remembered. He checks and pays.
6. **Will doesn't.** A WhatsApp from Jess opens the app on a sign-up with
   nothing to type, then the same booking, ready to pay. When he stalls, one
   more WhatsApp in Jess's name, drafted by the companion.
7. **Group complete.** All three booked, seats together, one offer that makes
   sense for three: breakfast for the 06:10. That evening, one more: a cave
   dorm in Göreme for the balloon nights, priced for three, one tap.
8. **Checked in for them**, then the unhappy path: the 06:10 is cancelled, all
   three are rebooked before anyone queues, told second, and Dad's phone shows
   the new landing time the same second.
9. **The next trip.** Two months after they get home, fares to Bodrum drop
   10%: same three, a long weekend in September. One card, then quiet.

## What you are looking at

The phone is the mock. Beside it, the **presenter's panel** has two views.
**Agent** is the companion thinking, live: when a screen needs the agents'
work, their steps stream in one at a time, and the phone shows its result only
when the last step has landed. What each agent read, thought and did, and what
it decided not to do, with the figures it used. **Scenes** lists every beat of
the journey and jumps to it.

When the story moves to someone else's device (Archie's push, Will's WhatsApp,
Dad's message) a **second phone** appears on the left and goes away when their
part is done. Later days (the waiting window, check-in, the cancellation, the
next trip) are reached from Scenes. **Reset demo** puts everything back to the
lock screen.

The **impact column** on the right is the commercial case, moving as the demo
moves: revenue, add-ons and new users, each against a stated model of today's
app, and the clicks the three did not have to make. Today's clicks are counted
screen by screen off [pegasus-baseline](https://github.com/fieldjw96/pegasus-baseline),
our mock of the live booking journey. The column says at its foot how "today"
is counted.

## What is real here, and what is not

**Every figure is arithmetic in code.** "14B next to her is free", "down to 9
seats", 409.40 GBP: computed from pinned routes in `lib/journey/script.ts`,
never asserted, and tested in `lib/journey/script.test.ts`.

**The Agent panel is computed from the same calls the screen made.**
`lib/agent/trace.ts` builds every step from `lib/`, so the panel cannot say one
thing while the phone shows another. A step held back is shown, because
restraint nobody can see reads as no restraint.

**There is no model in this mock.** The sentence is understood by rules in
`lib/assistant/understand.ts`, and the reasons on the ticket are written in
code. A real build puts a model behind the sentence and the reasons, and keeps
everything else exactly here: a model is never asked for a price, a date
comparison or a seat, and it never speaks unprompted; `lib/moments/moments.ts`
decides that, with three gates that each alone keep it quiet.

## Architecture

TypeScript, strict. Next.js App Router on Vercel. Tailwind v4. Vitest, tests
colocated. Dependencies: next, react, zod. No database, no auth, no secrets.

```
app/                       One route per screen. Server components rendering client islands.
  nudge/                   The first screen: the companion speaks first, on Jess's lock screen.
  page.tsx                 Jess's home: the week as a ticket, changeable in a sentence.
  checkout/ confirmation/  Jess's checkout and confirmation (send it to your friends, Dad).
  group/                   Organiser side: who has booked, the one group offer.
  invite/archie/ will/      Invitee side: push or WhatsApp, sign-up, ticket, checkout, confirmation, stalls.
  squad/                   Lock-screen moments: waiting window, hostel, check-in, cancelled, next trip.
  follow/dad/              Dad's phone: the landing time, the cancellation, STOP.
components/
  phone-frame.tsx          The device, and the stage: second phone, main phone, panel.
  companion-phone.tsx      The second phone: Archie's, Will's or Dad's, when the story is there.
  agent-provider.tsx       The agents running: one streaming run per phone, and the wait.
  scenes.tsx               The presenter's panel: Agent (live) and Scenes (the list).
  impact.tsx               The impact column: the companion against today's app.
  journey-provider.tsx     What the passengers have done so far, in session storage.
  ui/                      The design system: avatar, shell, nav, sheet, lock screen, tags.
  screens/                 One file per screen or family of screens.
lib/
  journey/flights.ts       Deterministic mock inventory. No network.
  journey/script.ts        The demo's routes, pinned, so every screen prints the same numbers.
  assistant/               Sentence → trip: understand, draft (provenance), price, itinerary.
  group/                   Friends, the invitee's booking, the seat beside, the nudge, the stay, the fare drop.
  moments/moments.ts       The three gates that keep the companion quiet.
  agent/trace.ts           What each agent read, thought and did on every screen, computed.
  agent/scenes.ts          Every beat of the journey, with its route.
  metrics/impact.ts        Revenue, add-ons, new users and clicks, companion against today.
  metrics/taps.ts          Today's clicks, screen by screen off pegasus-baseline; the companion's per person.
```

`CONTEXT.md` is the vocabulary. `FINDINGS.md` is what we read off nineteen
screenshots of the live app, and why the companion intervenes where it does.

The check chain, which CI runs on every pull request:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build
```

## Design

Built to the design canvas, screen for screen: Figtree for UI, Archivo for the
wordmark, airport codes, times and totals; white cards on `#F2F6FA`; yellow
fill for the one primary action per screen; orange for text links and the
dotted "mine" underline, never a fill. Both fonts are OFL and self-hosted, so
neither the build nor the demo depends on the venue's wifi. The companion's
face is a cartoon Pegasus from the myth, drawn as inline SVG so its wings beat
while it thinks. It is not the airline's trademark. Destination photographs are
from Wikimedia Commons and credited at `/credits`.

## Hosting on Cloudflare (flykanat.com)

Static export, no server needed. Build command `CF_EXPORT=1 npm run build`,
deploy command `npx wrangler deploy` (config in `wrangler.jsonc`, assets from
`./out`). Vercel is unaffected: `output: "export"` only turns on when
`CF_EXPORT=1`.
