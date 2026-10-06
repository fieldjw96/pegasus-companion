# pegasus-companion

A mock of the Pegasus mobile app with an AI companion that acts inside it on its
own initiative. The whole repo exists to answer one question for the hackathon
jury: can an agent make the purchase decision easier without becoming a chatbot?

## Language

### The trip

**Sentence**:
The one input in the app. A passenger says a trip in one go, typed or spoken, and
the companion answers with a ticket rather than with text. There is no transcript
and no reply bubble, which is what keeps this from being a chatbot.
_Avoid_: prompt, query, message, chat

**Draft**:
The trip as the companion has assembled it, field by field, with where each value
came from. It becomes a Ticket when printed and a booking when paid for.
_Avoid_: search, form, itinerary

**Provenance**:
Where a value on the draft came from, as one of a closed set: **you said**
(navy), **remembered** from past bookings (surface, hairline), **predicted** from
the rest of the trip (dotted), or **from** the organiser of a group (white, with
their initials). On the pass, anything not said carries a dotted underline. A
value loses its tag the moment the passenger changes it.
_Avoid_: source, confidence, inferred

**Worth a look**:
A predicted value the companion is not sure of, flagged beside its tag. Flexibility
on a family holiday is one; a cabin bag for someone who usually goes for a weekend
is another.
_Avoid_: uncertain, low confidence

**Hero trip**:
The one trip the demo is built around: Stansted to Izmir, 19 to 25 October, three
travelling, SAVER PLUS, 1224.66 GBP, reference NSVSXR, seats 19D 19E 19F. Pinned
in `lib/journey/script.ts` so every screen prints the same numbers.
_Avoid_: default, sample, fixture

### The group

**Organiser**:
The passenger who booked first and had the companion hold the same flights for
others. Sees names, status and seat only; never anybody else's fare.
_Avoid_: host, leader, admin

**Invitee**:
Someone the organiser invited. With a Pegasus account, the companion builds their
booking from their own history; without one, they get an email link to a booking
built from the organiser's flights alone. They pay only for themself.
_Avoid_: guest, member, friend (in code)

**Hold**:
The 48 hours during which the seats beside the organiser are kept for invitees.
Shown as a deadline everywhere it matters and as time left on the group card.
_Avoid_: reservation, lock, price freeze

**Seat offer**:
The one question the companion will not answer on an invitee's behalf: whether to
pay for the seat beside the organiser. Computed off the organiser's block, priced
per leg, and asked exactly once.
_Avoid_: upsell, add-on, recommendation

### The watch

**Watch**:
A trip the passenger will take, described as tolerances rather than a search, which
the companion checks every morning. The unit the companion reasons about across
days, and the reason it exists: nobody books a half term in one sitting.
_Avoid_: alert, price alert, saved search, deliberation

**Intent**:
The watch's contents: a week, places still in the running, who, an all-in cap,
must-haves, a buy rule, and a deadline. Set on the intent sheet, which has no input
boxes: each row is a tolerance with a provenance tag.
_Avoid_: criteria, filters, preferences

**Morning**:
One check of the watch, at 06:40. Pure and scripted, so a rehearsal and the live
run agree. Its verdict is silent, propose, or deadline.
_Avoid_: poll, tick, run, job

**The three gates**:
What keeps a morning silent, each alone sufficient: nothing changed overnight; the
change does not bring the best under the cap; the interruption budget is spent.
Restraint is a property of the system, not a claim in a slide.
_Avoid_: thresholds, rules engine, filters

**Interruption budget**:
Three. How many times the companion may speak in one watch. When it is gone the
companion is silent regardless of how interesting the market is.
_Avoid_: rate limit, throttle, quota

**Why I spoke**:
The pale-yellow block on every proposal, in the first person, with the figures a
passenger can check. Every number in it is computed in code and handed over as a
sentence. Restraint nobody can see reads as no restraint at all, and a proposal
nobody can check reads as a push.
_Avoid_: explanation, rationale, reasoning

**Live Activity**:
The card on the lock screen a proposal arrives in. Compact: one line, one price,
one yellow action. Expanded: Why I spoke, approve with Face ID, look, not this one.
The app is not open; that is the point.
_Avoid_: notification (that is the invitee's), push, banner

**Not this one**:
Declining a proposal and saying why: the place, the dates, or the price. The place
is struck off the watch and the companion keeps watching the rest.
_Avoid_: dismiss, reject, snooze

**Deadline rule**:
The morning, N days before departure, when the companion stops waiting and brings
the best there is, with a recommendation the passenger can refuse, a cap to raise,
or the option to keep waiting.
_Avoid_: timeout, expiry, fallback

### The demo

**Scene**:
One screen of either journey, reachable from the panel beside the phone. Scenes
exist because a phone cannot show a different morning or a different person's
phone on its own.
_Avoid_: step, page, slide

**Journey**:
One of the two end-to-end stories the prototype must carry: the cold start (speak
the trip, book, build a group) and the warm start (the companion moves first).
_Avoid_: flow, funnel, path
