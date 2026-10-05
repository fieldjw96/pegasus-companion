# Where to · talk to Pegasus, and the booking fills itself (idea prototype)

Say where you're going. The trip fills in while you talk, and you change any of it by talking. Nothing paid happens without your tap.

> "Antalya with my wife and our 6 month old, 10 to 14 Nov, morning flights, one bag."
>
> "Make it five nights and add my mom."

The first sentence becomes a whole Antalya trip: both flights, you, Dana (from your past Pegasus trips) and the baby on a lap, Saver with a 15 kg bag, €154. The second one comes back as a receipt, not a reply: **Back Sun 15 Nov · Mom added · €78 more · Undo**.

This branch is a standalone idea. It shares no history or code with `main`.

## The one screen

- **Top:** the flying Pegasus logo, "Where to next?", one box and a mic.
- **Your trip, filling in:** five rows wait under the box (where, when, what time, who, bags) and fill while you talk or type. Where, when and what time of day are the only must-haves. Once those three are in, the rows become the real booking: flight out, flight home, travelers, bundle, seats, extras, price.
- **What you said:** after you say it, your sentence comes back above the trip. A word it couldn't use is orange, and Book waits until you tap it (let it go) or say it another way. Nothing is dropped silently.
- **Say a change:** the bar at the bottom has a mic for changes, the total and Book. "Make it five nights", "add my mom", "evening flight back", "a day earlier", "switch to Saver Plus", "without Dana", "seats together", "one way". Each change lands as a receipt with Undo, and the rows it touched flash once.
- **Or tap:** any row opens for a one-tap change (flight times, bundle, seats, extras, travelers). Taps and changes are kept apart: saying "add my mom" keeps the flight you tapped, and "evening flight back" replaces only that flight.
- **Something missing:** that row asks in place with taps ("When?" with the next three weekends, "How many of you?", "A seat or a lap?"), or you just say it.

On a phone it is one column with the bar under your thumb. The grid icon (top right) goes to the classic booking form, which is just another way of saying the first sentence.

## The rule: talk changes the trip, it never opens a conversation

There are no reply bubbles and no message thread. The companion's only answers are the filled rows, one receipt per change, one-tap questions for what's missing, Pegasus rules it applied, and at most two blue "worth knowing" lines.

## What it decides, and what it never does

It decides the cheapest flight in the time of day you said, the cheapest bundle that covers what you said, seats free at check-in and no paid extras. Every row shows where its value came from: you said it, you picked it, your past trips, your Pegasus profile, a Pegasus rule, or a best guess.

It never adds anything paid that you didn't ask for. The blue lines can move the price either way, one tap each, two at most:

- "Lands 05:10 the next morning. The 08:15 lands 13:35 for €2 more each." (six to Barcelona, 13 to 16 Nov, cheapest)
- "Seats are given at check-in, so the 6 of you may sit apart. Together is €7 each per flight."
- "Light is one 3 kg bag under the seat for 3 nights. Saver adds an 8 kg cabin bag and a 20 kg checked bag for €24 more each per flight."
- "The 07:05 is €15 less each." (only when it saves €5 or more and doesn't land in the small hours)

Pegasus rules it applies, and says out loud on the trip:

| Rule | What you see |
|---|---|
| Light is international only | "Saver, since Light isn't sold on domestic flights" (also when you ask for Light by name) |
| Saver checked bag: 15 kg domestic, 20 kg international | The bundle row and its perks |
| Under 2 flies on a lap, €20 per flight; 2 to 12 is a child | "Baby · on lap" on the traveler, the infant line in the price |
| One lap baby per adult | It asks: give a baby a seat, or another adult is coming |
| A baby who turns 2 before the flight home needs a seat on it | Priced per flight, with a note on the traveler |
| A same-day return leaves 3 h or more after landing | "Same day: back 20:30, 3 h+ after landing 08:10" (Ankara for an interview, back the same day) |

Fare families: Light (under-seat bag 40×30×15 cm, 3 kg; international only), Saver (plus cabin bag 55×40×23 cm, 8 kg, and a checked bag), Saver Plus (plus a standard seat, sandwich, Fly & Watch), Comfort Flex (plus extra legroom, one free change up to 2 h before departure, full refund less the service fee). Destinations are real Pegasus routes from Istanbul Sabiha Gökçen (SAW), with local arrival times and European summer time.

## Demo script (about 3 minutes)

1. Tap the mic and say: "Antalya with my wife and our 6 month old, 10 to 14 Nov, morning flights, one bag." The rows fill while you talk. The bar reads **Waiting on 1**: the baby needs a name and birthday.
2. Say: "Make it five nights and add my mom." Receipt: Back Sun 15 Nov · Mom added · €78 more. Tap Undo, then say it again.
3. Tap the travelers row. Mom: **Ask** sends the group link, and 2.6 s later she has typed in her own details. The baby: **Add**, a name and a birthday. The bar now reads **Book it**.
4. Tap **Sit together** on the blue line under seats, then **Book it**.
5. New trip (top right): "Barcelona with the boys, cheapest, no bags." The friends come from your past trips; the dates were never said, so the When row asks. One tap on a weekend, and a blue line points out that six people seated at check-in may sit apart (together is €7 each per flight), or that the cheapest flight home lands in the small hours.
6. New trip: "Annemle babamla yılbaşında İzmir'e, akşam uçuşu." Mom, Dad and the evening flight are understood; "yılbaşında" stays orange and the date is asked. English only in this demo; Turkish words it doesn't know stay orange instead of being guessed.

Where the browser has no speech recognition, the mic plays the demo sentence (and, in the bar, the demo change) and labels it "demo voice".

## What it uses

| Source | What for | Switch |
|---|---|---|
| What you say | Everything on the trip that says "You said" | Typing works the same |
| Your Pegasus profile | Your name, birthday, saved card | It's your account |
| Your past Pegasus trips | Who you flew with (and their saved birthdays), your usual bags and trip length | Tap your initial, top left. Off means off: "the boys" becomes "How many of you?" |

No chats, email, calendar or phone contacts are read. In production, speech becomes text on the phone and the audio isn't kept; the sentence lives with the cart and is deleted at checkout or when the cart expires. KVKK and GDPR: one purpose (fill this booking), kept for the life of the cart, deletable by the passenger. In this prototype the mic uses the browser's speech recognition, which may send audio to the browser maker (Google or Apple) to transcribe it; typing sends nothing.

## Where an LLM fits, and what it costs

The rules parser in this prototype runs on the phone, answers instantly and is tested, including a 26-sentence scorecard where a silent error fails the run. It stays the default. An LLM with structured JSON output sits behind the same `parse()` contract and is called only when the rules leave something unplaced (an orange word, an uncountable "with my family", a Turkish sentence), so most sentences cost nothing.

Estimate per LLM call, assuming about 650 input tokens (instructions, schema, sentence) and 200 output tokens of JSON, at Anthropic API list prices (cached 2026-09-25):

| Model | Price per million tokens (in / out) | Per call | Per million calls |
|---|---|---|---|
| Claude Haiku 4.5 (`claude-haiku-4-5`) | $1 / $5 | about $0.0017 | about $1,700 |
| Claude Opus 5.5 (`claude-opus-5-5`, low effort; thinking tokens bill as output) | $4 / $20 | about $0.007 to $0.012 | about $7,000 to $12,000 |

Latency is measured in the pilot, not promised here: the rows fill from the rules parser at once, and an LLM answer only refines what was orange.

## Measuring it: one A/B, one euro line, one kill metric

- **Test:** 10% of booking sessions on SAW to AYT and SAW to BER get the talk screen; the rest get today's flow.
- **Primary KPI:** completion from first input to payment.
- **The euro line (per booking, labelled):** ancillaries added from blue lines, minus the ones it talked people out of (the cheaper flight, Light instead of Saver). It can go either way; that is the point.
- **Diagnostics:** share of bookings started by talking; changes said per booking; orange words per sentence; how often a change is undone; time from first word to Book.
- **Guardrails:** name-correction requests, bags bought at the airport, complaints about pre-filled items.
- **Kill metric:** if completion doesn't beat control at the planned sample size, or any guardrail gets worse, switch talking off.

## Run it

No build step and no dependencies. From this folder:

```bash
python3 -m http.server 8090
```

Then open http://localhost:8090, or http://localhost:8090/phone.html for the phone frame. Chrome or Safari for real voice input.

| Parameter | What it does |
|---|---|
| `?say=...` | Types that sentence in and runs it (always starts a new trip) |
| `&then=...` | Then says that change |
| `?today=2026-10-03` | Pins "today" so relative dates come out the same every time |
| `?name=Jack` | Changes the greeting |

## Tests

```bash
npm test
```

36 tests (Node 20 or newer): the engine, the 26-sentence no-silent-errors scorecard, the people and switch rules, and 12 for talking to change the trip (receipts, undo, taps that survive changes, details that stay with the right person, weekdays near the trip, Light refused on domestic flights, orange words holding Book, the blue lines).

```bash
node test/ui.run.mjs
```

26 checks in headless Chrome that drive the real page at phone width: typing fills the rows, a spoken change and its receipt, undo, an orange word holding Book, a blue line, filling in the baby, booking, a missing date answered by a tap and by talking, the past-trips switch, the demo voice, a reload, the classic form, no sideways scroll, no page errors.

## What is real and what is mocked

| Real | Mocked |
|---|---|
| Voice input (Web Speech API) | Flights and prices (stable per route and date) |
| The parser, talking to change it, receipts and undo, the bundle choice, pricing, Pegasus rules, time zones | The persona, their past trips and the people in them (`lib/persona.js`, invented, never exported) |
| The past-trips switch really stops that data being used | The group link and the people answering it; payment |

## Files

| Path | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The one screen, the bar, voice, the classic form, the booked overlay |
| `phone.html` | The same page in a phone frame |
| `lib/parse.js` | One sentence to trip context: where, when, time of day, who (typed travelers), bags, budget, and the words it couldn't place |
| `lib/talk.js` | Talking to change it: every sentence and tap is an event; replaying them builds the trip, the receipts, the orange words and the blue lines |
| `lib/agent.js` | The three must-haves, one-tap questions, bundle choice, Pegasus rules, trip assembly and pricing |
| `lib/flights.js`, `lib/dates.js` | Mock schedule with correct local times; calendar helpers |
| `lib/data.js`, `lib/persona.js` | Routes, fare families, extras and sources; the invented passenger |
| `scripts/export-classic.mjs` | Bundles the parser (without the persona) as one classic script for other prototypes |
| `test/` | Unit tests, the scorecard, the talk tests and the headless UI test |

## Brand

Wordmark: Wikimedia Commons "Pegasus Airlines logo.svg". Palette (navy, yellow, orange, surface) and the Gilroy typeface come from the Pegasus Innovation Lab hackathon site; Plus Jakarta Sans stands in when Gilroy isn't installed.
