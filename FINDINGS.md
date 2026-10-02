# What the funnel does, and what it leaves out

Read off nineteen screenshots of the live Pegasus app, 2 October 2026, on one
itinerary: **STN → AJI, 19 Oct, returning 25 Oct, 1 adult, 389.13 GBP total.**

Every number below is from a screenshot, not a model. They are asserted exactly in
`lib/journey/baggage.test.ts` and `lib/journey/packages.test.ts`, so a future
screenshot that disagrees fails the suite rather than quietly drifting.

---

## The pattern

The app **quantifies what it wants you to buy, and leaves vague what it would cost
you to choose differently or to wait.**

| Step                 | What it tells you                               | What it does not say                                            |
| -------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Package selection    | LIGHT is cheapest at 199.13                     | That LIGHT plus bags beats SAVER's price in the wrong direction |
| Upgrade interstitial | "+59.00 to avoid penalty fees at boarding"      | That the same thing was +30.00 one screen earlier               |
| Seat skip            | "These fees may be higher"                      | How much higher                                                 |
| Baggage selection    | "Recommended" on 20 kg at 41.00                 | That the recommended option is dominated                        |
| Additional services  | "Starting from" on four products                | Whether this traveller needs any of them                        |
| Payment              | "Last Chance to Buy At This Price", ~58 minutes | That this is a routine fare hold                                |

**The Companion's job is to quantify the vague thing at the moment the choice is
made.** That is one sentence, it is provable rather than persuasive, and it is the
inverse of what the funnel currently does.

---

## 1. The baggage trap, which is the strongest finding

Four ways to end up with a cabin bag and a checked bag:

| Route                            | Cost over LIGHT | Cabin | Checked                   |
| -------------------------------- | --------------- | ----- | ------------------------- |
| **SAVER at package selection**   | **30.00**       | 8 kg  | **25 kg**                 |
| LIGHT + upgrade offer            | 59.00           | 8 kg  | 20 kg                     |
| LIGHT + à la carte cabin + 20 kg | 58.00           | 8 kg  | 20 kg ← **"Recommended"** |
| LIGHT + à la carte cabin + 12 kg | 37.00           | 8 kg  | 12 kg                     |

À la carte prices: cabin **17.00**, 12 kg **20.00**, 20 kg **41.00**.

**SAVER strictly dominates.** It is both the cheapest route and the largest
allowance; every alternative costs more and carries no more. That is not a matter
of taste and cannot be argued with in a Q&A.

The route the app itself badges **"Recommended"** is **28.00 GBP more for 5 kg
less**. Even the cheapest à la carte combination loses by 7.00 GBP while giving
13 kg less.

Implemented in `lib/journey/baggage.ts` as `compareBaggagePaths()`.

---

## 2. Urgency the app manufactures, and uncertainty it leaves alone

**Payment carries a purple countdown**: _"Last Chance to Buy At This Price:
02/10/2026 16:09"_ — about **58 minutes** from the screenshot.

This is the sharpest contrast available to the pitch. The app manufactures
time pressure at the moment of payment, while doing nothing about the real
uncertainty earlier: _should I book now or wait?_ A Companion that watches a fare
across days is the opposite of a 58-minute countdown, and the two can be put on
one slide.

**The app already computes time-to-flight** — _"There are still **16** days until
your flight"_ on the additional-services screen — but spends that knowledge
selling a 6.00 GBP change option rather than informing the decision.

---

## 3. Friction the app creates from context it already has

On **Passenger and Contact Details**, for a passenger departing London Stansted:

- **Nationality defaults to "Turkish Citizen"**, demanding a Turkish ID Number,
  then shows **"Incorrect Turkish ID"**
- **Mobile Phone defaults to "CA (+1)"** — Canada
- Validation errors appear **before** input: an empty date of birth already reads
  _"The age range for adults should be 12+."_

The departure airport, the currency and the account are all known. None of them
inform these defaults.

**GIG Travel Insurance is quoted in EUR** (_"Starting from 15.00 EUR"_) on a
booking priced in GBP throughout. Every other number in the funnel is GBP.

---

## 4. The same product sold twice

**Free Cancellation / Free Change Option at 6.00 GBP per person** appears on the
_Selected Flights_ screen **and** again on _Food and Other Additional Services_.
Same product, same price, two asks, no acknowledgement that it was already
declined once.

This is the clearest argument for an **interruption budget**: the funnel has no
concept of having already asked.

---

## 5. What is already solved, and must not be claimed

Two things the app does well, which the brief's "no replicating existing roadmap
items" rules out as headline claims:

- **The Calendar/Chart screen already stars the month's lowest fare** (129.25 GBP
  against the 199.13 selected) and the results screen already shows a three-day
  strip with each day's price. _"A cheaper date exists"_ is a solved problem.
- **"Pegasus Assistant" already ships** on the home screen. A chatbot is not
  merely out of scope; it exists.

What is **not** solved is noticing on the passenger's behalf while they are not
looking, and quantifying a later cost at the moment of an earlier choice.

---

## Fare packages, for reference

| Package      | Price  | Cabin                 | Checked | Seat      | Change right               |
| ------------ | ------ | --------------------- | ------- | --------- | -------------------------- |
| LIGHT        | 199.13 | underseat only (3 kg) | —       | —         | —                          |
| SAVER        | 229.13 | 8 kg + underseat      | 25 kg   | —         | —                          |
| SAVER PLUS   | 249.13 | 8 kg + underseat      | 25 kg   | Standard  | 7 days before              |
| COMFORT FLEX | 262.13 | 8 kg + underseat      | 30 kg   | Preferred | 2 hours before, + sandwich |

Seats: Front Row XL 26.00–30.00, Front Row Comfort 24.00–25.00.
Additional services: meals, change option 6.00, entertainment from 1.00,
insurance from 15.00 EUR.

---

## What this means for the build

The Companion should intervene **once**, at package selection, with the baggage
dominance, and otherwise stay quiet. Everything else in this document is evidence
for the pitch rather than a feature to build in a day.
