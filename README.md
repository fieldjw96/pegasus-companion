# Where to · talk to Pegasus, and the booking fills itself (idea prototype)

Say where you're going. The trip fills in while you talk, and you change any of it by talking. Nothing paid happens without your tap.

> "Antalya with my wife and our 6 month old, 10 to 14 Nov, morning flights, one bag."
>
> "Make it five nights and add my mom."

The first sentence becomes a whole Antalya trip: both flights, you, Dana (from your past Pegasus trips) and the baby on a lap, Saver with a 15 kg bag, €154. The second comes back as a receipt, not a reply: **Back Sun 15 Nov · Mom added · €78 more · Undo**.

This branch is a standalone idea. It shares no history or code with `main`.

## The one screen

- **Top:** the flying Pegasus logo, "Where to next, Deniz?", one box and a mic.
- **Your trip, filling in:** five rows wait under the box (where, when, what time, who, bags) and fill while you talk or type. Where, when and what time of day are the only must-haves. Once those three are in, the rows become the real booking: flight out, flight home, travelers, bundle, seats, extras, price.
- **What you said:** your first sentence comes back above the trip, word for word, with what it worked out in blue right after the words it belongs to ("6 month old · on a lap, one per adult", "morning · 07:05, lands 08:25", "one bag · Saver, 15 kg checked"). A word it couldn't use is orange, and Book waits until you tap it (let it go) or say it another way. Nothing is dropped silently.
- **Say a change:** the bar at the bottom has a mic for changes, the total and Book. "Make it five nights", "add my mom", "evening flight back", "a day earlier", "switch to Saver Plus", "without Dana", "seats together", "one way". Each change lands once as a receipt above the bar, with Undo, and stays as a small chip under your sentence, with its own undo. The rows it touched flash once. However many changes you make, the trip still starts on the first screen.
- **Or tap:** any row opens for a one-tap change (flight times, bundle, seats, extras, travelers). Taps and spoken changes are kept apart: "add my mom" keeps the flight you tapped, and "evening flight back" replaces only the flight home.
- **The seat map:** under the seats row, a dark card shows the whole plane (a demo A320neo, 31 rows of 3-3) with your party glowing in it, and a close-up of your rows with everyone's initials in their seats and a lap baby as a small badge on the adult's seat. Seats at check-in show the party as loose, pulsing dots spread over the cabin ("At check-in: 2 different rows"); a child always sits beside an adult, so only a party of two or more adults gets the "may sit apart" line. A change that moves seats scrolls the map into view before the seats glide. "Seats together" or the blue line's **Sit together** makes them glide side by side; "add my mom" drops one more seat in next to them, and Undo puts it back. A tab switches between the flight out and the flight home.
- **Something missing:** that row asks in place with taps ("When?" with the next three weekends, or weeks if you said "for a week"; "How many of you?"; "A seat or a lap?"), or you just say it.

On a phone it is one column with the bar under your thumb. The grid icon (top right) goes to the classic booking form, which is just another way of saying the first sentence.

## The rule: talk changes the trip, it never opens a conversation

There are no reply bubbles and no message thread. The companion's only answers are the filled rows, one receipt per change, one-tap questions for what's missing, the rules it applied, and at most two blue "worth knowing" lines.

## Where every value comes from

Every row and rule line carries a badge:

| Badge | Means |
|---|---|
| You said | It came from your words |
| You picked | A tap |
| Your past trips | Your own earlier Pegasus bookings: who you flew with, your usual bags and trip length (one switch turns this off) |
| Pegasus profile | Your name, birthday and saved card |
| Pegasus rule | A published Pegasus rule: the fare families, one lap infant per adult, under 2 on the date of each flight |
| Companion rule | The companion's own default, not a Pegasus rule: a same-day return leaves 3 h or more after landing; seats are left for check-in; Saver Plus when its seat and meal cost less than buying them singly |
| Best guess | Nothing said and nothing known, so the cheapest start, open to change |

## What it decides, and what it never does

It decides the cheapest flight in the time of day you said, the cheapest bundle that covers what you said, seats free at check-in and no paid extras.

It never picks anything paid that you didn't ask for in words or taps. "Refundable", "flexible ticket" or "Comfort Flex" buys flexibility; a funeral, "plans may change" or "I might cancel" only gets a blue line offering it. The blue lines can move the price either way, one tap each, two at most:

- "Lands 05:10 the next morning. The 08:15 lands 13:35 for €2 more each." (six to Barcelona, 13 to 16 Nov, cheapest)
- "Seats are given at check-in, so the 6 of you may sit apart. Together is €7 each per flight."
- "If plans shift: Comfort Flex adds one free change up to 2 h before departure and a full refund (service fee excluded), for €58 more each." ("Grandma passed. Get me home to Izmir on 8 Oct")
- "Light is one 3 kg bag under the seat for 3 nights. Saver adds an 8 kg cabin bag and a 20 kg checked bag for €24 more each per flight."
- "The 07:05 is €15 less each." (only when it saves €5 or more and doesn't land in the small hours)

Pegasus rules it applies, and says out loud:

| Rule | What you see |
|---|---|
| Light is international only | "Saver, since Light isn't sold on domestic flights" (also when you ask for Light by name) |
| Saver checked bag: 15 kg domestic, 20 kg international | The bundle row and its perks |
| Under 2 flies on a lap; 2 to 12 is a child | "Baby · on lap" on the traveler; the infant line in the price (a demo price, not Pegasus' published fee) |
| One lap baby per adult | It asks: give a baby a seat, or another adult is coming |
| A baby who turns 2 before the flight home needs a seat on it | Priced per flight, with a note on the traveler |

Fare families: Light (under-seat bag 40×30×15 cm, 3 kg; international only), Saver (plus cabin bag 55×40×23 cm, 8 kg, and a checked bag), Saver Plus (plus a standard seat, sandwich, Fly & Watch), Comfort Flex (plus extra legroom, one free change up to 2 h before departure, full refund less the service fee). Destinations are real Pegasus routes from Istanbul Sabiha Gökçen (SAW), with local arrival times and European summer time.

## Demo script (about 3 minutes)

1. Tap the mic and say: "Antalya with my wife and our 6 month old, 10 to 14 Nov, morning flights, one bag." The rows fill while you talk. The bar reads **Waiting on 1**: the baby needs a name and birthday.
2. Say: "And we're bringing a pram." Nothing changes, and "pram" stays orange: the bar reads **Check 1 word** until you tap it. Nothing it doesn't understand is dropped silently.
3. Say: "Make it five nights and add my mom." Receipt: Back Sun 15 Nov · Mom added · €78 more. Tap Undo, then say it again.
4. Tap the travelers row. Mom: **Ask** sends the group link, and 2.6 s later she has typed in her own details. The baby: **Add**, a name and a birthday. The bar now reads **Book it**.
5. Look at the seat map: two loose dots in different rows. Tap **Sit together** on the blue line and watch them glide into one row, the baby riding on the lap badge. Then **Book it**.
6. New trip (top right): "Me and my two babies to Antalya next weekend, morning." One adult can hold one baby on a lap (a Pegasus rule), so the travelers row asks: give a baby a seat, or another adult is coming.
7. New trip: "Barcelona with the boys, cheapest, no bags." The friends come from your past trips; the dates were never said, so the When row asks. One tap on a weekend, and six loose dots scatter over the seat map while a blue line points out that six people seated at check-in may sit apart. Say "switch to Saver Plus": seat choice is free in that bundle, so all six land in one row and the paid line disappears.
8. New trip: "Annemle babamla yılbaşında İzmir'e, akşam uçuşu." Mom, Dad and the evening flight are understood; "yılbaşında" stays orange and the date is asked. English only in this demo; Turkish words it doesn't know stay orange instead of being guessed.

Where the browser has no speech recognition, or the microphone is refused, the mic plays the demo sentence (and, in the bar, the demo change, on the demo trip only) and labels it "demo voice". When the mic hears nothing, it says so and asks you to type.

## Talking to it on Pegasus' app

How the prototype maps onto the native apps (Swift and SwiftUI on iOS 17.2 and later; Kotlin and Jetpack Compose on Android, shipped in a Google and a Huawei flavour, per the brief's FAQ #9). The language shares are assumptions to replace with Pegasus' own numbers.

| Piece | iOS | Android (Google flavour) | Android (Huawei flavour, no Google services) |
|---|---|---|---|
| Speech to text | Apple's Speech framework, on the phone where the language supports it (checked per language at run time, `requiresOnDeviceRecognition`); otherwise Apple's server, and the privacy line says so | The on-device recognizer where the phone has one (Android 12 and later); otherwise Google's speech service, and the privacy line says so | HMS ML Kit speech recognition, which runs on Huawei's servers; the passenger is told before the first use and can type instead |
| The rules parser | One stateless endpoint next to the flight search the app already calls; the same rules for every app and the web, updated without an app release | Same endpoint | Same endpoint |
| The trip state | The list of what was said and tapped lives in the app's booking state (the prototype's `lib/talk.js`); the server only parses | Same | Same |

- **Rows fill while you talk:** the app sends the transcript at each pause (debounced) and the rows update as the answers come back. The rules themselves take a few milliseconds; the round trip is the cost.
- **The LLM path:** used only for words the rules leave orange, and for Turkish, which the rules here don't parse. Assume 70% of booking sessions are in Turkish and 1.5 sentences per session (the first plus the occasional change): that is about 1.1 LLM calls per booking session (0.7 × 1.5 for Turkish, plus 0.3 × 0.3 for orange words in English), so **about $0.002 per session with Claude Haiku 4.5**, or **about $0.008 to $0.014 with Claude Opus 5.5**, from the per-call costs below.
- **Latency budget:** 1.5 s for the LLM answer. On a timeout the words stay orange and the rows ask; nothing is guessed.
- **KVKK:** one purpose (fill this booking), kept for the life of the cart, deleted at checkout; where audio leaves the phone, that is shown before the first use.
- **The A/B:** the apps already run Firebase Analytics, Crashlytics and Performance (FAQ #9), so the 10% arm can be a Firebase Remote Config flag with Firebase A/B Testing on the Google flavour and iOS, and the same flag served from Pegasus' own backend on the Huawei flavour. Assign on the logged-in member ID where there is one, so a passenger stays in one arm across sessions.

## What it uses

| Source | What for | Switch |
|---|---|---|
| What you say | Everything on the trip that says "You said" | Typing works the same |
| Your Pegasus profile | Your name, birthday, saved card | It's your account |
| Your past Pegasus trips | Who you flew with (and their saved birthdays), your usual bags and trip length | Tap your initial, top left. Off means off: "the boys" becomes "How many of you?" |

No chats, email, calendar or phone contacts are read. In this prototype, the mic uses your browser's speech service (Chrome sends the audio to Google, Safari to Apple); typing sends nothing. The in-app privacy panel says the same.

## Where an LLM fits, and what it costs

The rules parser in this prototype answers instantly and is tested, including a 47-sentence scorecard where a silent error fails the run. It stays the default. An LLM with structured JSON output sits behind the same `parse()` contract and is called only for what the rules leave orange, or for a Turkish sentence.

Estimate per LLM call, assuming about 650 input tokens (instructions, schema, sentence) and 200 output tokens of JSON, at Anthropic API list prices (cached 2026-09-25):

| Model | Price per million tokens (in / out) | Per call | Per million calls |
|---|---|---|---|
| Claude Haiku 4.5 (`claude-haiku-4-5`) | $1 / $5 | about $0.0017 | about $1,700 |
| Claude Opus 5.5 (`claude-opus-5-5`, low effort; thinking tokens bill as output) | $4 / $20 | about $0.007 to $0.012 | about $7,000 to $12,000 |

## Measuring it: one A/B, one euro line, one kill metric

- **Test:** 10% of booking sessions on SAW to AYT and SAW to BER get the talk screen; the rest get today's flow.
- **Primary KPI:** completion from first input to payment.
- **Sample size (an assumed baseline, to replace with Pegasus' data):** if 20% of these sessions end in a payment today, seeing a lift to 22% at 95% confidence and 80% power needs about 6,500 sessions per arm, so about 65,000 sessions in the window with a 10% arm.
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

51 tests (Node 20 or newer): the engine; 12 for the seat map (side by side, children beside an adult at check-in, nobody moves when someone joins, no taken or doubled seats, lap babies, exit rows adults only, a baby who turns two mid-trip, Saver Plus and Comfort Flex seat rules); the 47-sentence no-silent-errors scorecard, including every sentence judgment 2026-10-05-0155 found ("tomorrow morning, back Sunday", "no morning flights", "2 adults, 2 children and an infant", "for a couple of days", "for a week", "the 10th"); the people and switch rules; and 15 for talking to change the trip (what it added, in blue; receipts, undo, taps that survive changes, details that stay with the right person, weekdays near the trip, "add a friend", "not Saturday, Sunday", Light refused on domestic flights, nothing paid unasked, orange words holding Book, the blue lines).

```bash
npm run test:ui
```

35 checks in headless Chrome, about 15 s, that drive the real page at phone width: typing fills the rows, the seat map (loose at check-in, side by side after Sit together, the flight home tab, Saver Plus seating six together), the blue additions in your sentence, a spoken change and its receipt, undo, an orange word holding Book, a blue line, filling in the baby, booking, a missing date answered by a tap and by talking, the past-trips switch, a mic that hears nothing, the demo voice (and that it never changes another trip), five changes with the trip still on the first screen, a reload, the classic form, no sideways scroll, no page errors.

## What is real and what is mocked

| Real | Mocked |
|---|---|
| Voice input (Web Speech API) | Flights and prices (stable per route and date), including the infant fee |
| The seat solver: side by side, stable, children beside an adult at check-in, exit rows adults only, Pegasus bundle seat rules | The cabin layout (a demo A320neo) and other passengers' seats (stable per flight). The mock keeps two rows open per flight so a group always fits side by side; a real cabin may not have them |
| The parser, talking to change it, receipts and undo, the bundle choice, pricing, Pegasus' fare rules, time zones | The passenger (Deniz Aksoy, invented, living in Istanbul), their past trips and the people in them (`lib/persona.js`, never exported) |
| The past-trips switch really stops that data being used | The group link and the people answering it; payment |

## Files

| Path | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The one screen, the bar, voice, the classic form, the booked overlay |
| `phone.html` | The same page in a phone frame |
| `lib/parse.js` | One sentence to trip context: where, when, time of day (and times ruled out), who (typed travelers), bags, budget, and the words it couldn't place |
| `lib/talk.js` | Talking to change it: every sentence and tap is an event; replaying them builds the trip, the receipts, the orange words and the blue lines |
| `lib/agent.js` | The three must-haves, one-tap questions, bundle choice, rules, trip assembly and pricing |
| `lib/seats.js` | The seat map's solver: who sits where on each flight, at check-in or side by side, and what the bundle makes free |
| `lib/flights.js`, `lib/dates.js` | Mock schedule with correct local times; calendar helpers |
| `lib/data.js`, `lib/persona.js` | Routes, fare families, extras and sources; the invented passenger |
| `scripts/export-classic.mjs` | Bundles the parser (without the persona) as one classic script for other prototypes |
| `test/` | Unit tests, the scorecard, the talk tests and the headless UI test |

## Brand

Wordmark: Wikimedia Commons "Pegasus Airlines logo.svg". Palette (navy, yellow, orange, surface) and the Gilroy typeface come from the Pegasus Innovation Lab hackathon site; Plus Jakarta Sans stands in when Gilroy isn't installed.
