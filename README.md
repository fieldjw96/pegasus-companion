# Where to · a Pegasus booking companion (idea prototype)

Say where you're going in one sentence. Get the whole booking back, already filled in. All you do is confirm.

> "I'm going to Barcelona with five of my friends. I don't need any bags, I just want the cheapest option. No insurance. Don't make me go through any of the steps."

That sentence becomes: 6 travelers (your WhatsApp group "The Boys"), dates taken from that group's chat, the cheapest flights of the day, the Light bundle (no bags), seats left free at check-in, no insurance, five of six birthdays filled in, a group link to send, and a €510 total (€85 each). No questions asked.

This branch is a standalone idea. It shares no history or code with `main`.

## Run it

No build step and no dependencies. From this folder:

```bash
python3 -m http.server 8090
```

Then open http://localhost:8090. Chrome or Safari for real voice input.

Tests (Node 20 or newer):

```bash
npm test
```

Handy URL parameters for demos:

| Parameter | What it does |
|---|---|
| `?say=...` | Plays that sentence into the box on load, then runs it |
| `?today=2026-10-03` | Pins "today" so relative dates come out the same every time |
| `?name=Jack` | Changes the greeting |

## The two screens

**1. Where to next?** The Pegasus wordmark floats and dances while a plane circles it. Below it, a big text box with a mic (the mic pulses, and while you talk the letters bounce and a waveform runs). On a wide screen there are two columns underneath:

- **Previous**: earlier conversations ("Boys' trip", "Grandma's funeral", "Client week"...). Five show, `···` unlocks the rest. A thread that stalled for missing context reopens right where it stopped and asks for the missing piece.
- **Suggested**: trips spotted in connected apps (a wedding invite in email, "come home for New Year?" in the family WhatsApp, a work offsite, a public holiday on the calendar, a birthday in contacts). Five show, `···` generates more. The dots on the right open the connection switches.

On a phone the two columns become one list: Previous first, Suggested underneath. The icon in the top right corner goes to the classic booking form.

**2. Your trip, pre-filled.** One scroll, top to bottom: route, what it understood, flights, bundle, seats, extras, travelers, group link, payment, and a sticky total with **Book it**. Every decision carries a small badge for where it came from (you said it, WhatsApp, email, contacts, past trips, your Pegasus profile, a link) and a one-line reason. Flights, bundle, seats and extras each change with one tap, and the total updates.

## How much context is enough?

Three things: **where**, **when**, and **what time of day**. Three pills under the box fill in as you talk, and the ring around the go button fills a third at a time. The companion fills a pill from, in order:

1. what you said,
2. a chip you tapped,
3. connected context (for example, the dates "The Boys" proposed in their chat, or "cheapest" meaning any time of day).

If a pill is still empty when you hit go, it asks for that one thing with tappable answers, never a chat reply. If you name somewhere Pegasus doesn't fly (Barbados), it says so and offers the closest fit.

Everything after the three pills it decides on its own:

- **Bundle**: the cheapest bundle plus extras that covers what you asked for (bags, flexibility, seats, meals). "Plans might change" picks Comfort Flex; no bags on a domestic flight picks Saver because Light is international only.
- **Flights**: the cheapest flight in the time of day you asked for, with a nudge when a different time is cheaper.
- **Travelers**: you from your Pegasus profile; friends from the group, contacts and past trips, with birthdays. Missing details (Josh's birthday) are asked through the group link instead of blocking you.

## Pegasus rules it follows

| Bundle | Includes |
|---|---|
| Light | Under-seat bag 40×30×15 cm, 3 kg. International flights only |
| Saver | Light + cabin bag 55×40×23 cm, 8 kg + checked bag 15 kg domestic / 20 kg international |
| Saver Plus | Saver + free standard seat (not extra legroom) + sandwich + Fly & Watch |
| Comfort Flex | Saver Plus + extra-legroom seats + one free change up to 2 h before departure + full refund (service fee excluded) |

Destinations are real Pegasus routes from Istanbul Sabiha Gökçen (SAW). Arrival times use each city's time zone, including European summer time.

## What is real and what is mocked

| Real | Mocked |
|---|---|
| Voice input (Web Speech API). Where the browser has none, the mic plays a demo sentence and labels it "demo voice" | Flights and prices (stable per route and date) |
| The sentence parser, the three-slot logic, the bundle optimizer, pricing, time-zone math | People, chats, emails, calendar, payment card |
| Switching a connection off really stops it being used (switch WhatsApp off and the companion has to ask for dates) | The group link and friends confirming |

Understanding the sentence is done with deterministic rules in `lib/parse.js`, so the demo behaves the same on stage every time. In production an LLM with structured output would sit behind the same `parse()` contract and return the same shape.

## Files

| Path | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The two screens, the classic form, voice, overlays |
| `lib/parse.js` | Sentence to context: destination, dates, time of day, party, bags, budget, insurance, seats |
| `lib/agent.js` | The three must-haves, one-tap questions, bundle choice, trip assembly, pricing, the "working on it" steps |
| `lib/flights.js` | Mock schedule with correct local times |
| `lib/data.js` | Network, fare families, extras, people, groups, threads, suggestions |
| `lib/logo.js`, `lib/icons.js` | The Pegasus wordmark split into letters so they can move, and the icon set |
| `test/engine.test.mjs` | 13 tests: the demo sentence, Barbados, the WhatsApp switch, dates, time zones, fare rules, every thread and suggestion, no em dashes |

## Brand

Wordmark: Wikimedia Commons "Pegasus Airlines logo.svg". Palette (navy, yellow, orange, surface) and the Gilroy typeface come from the Pegasus Innovation Lab hackathon site; Plus Jakarta Sans stands in when Gilroy isn't installed.
