# pegasus-companion

A mock of the Pegasus mobile app with an AI companion that acts inside it on its
own initiative. The whole repo exists to answer one question for the hackathon
jury: can an agent make the purchase decision easier without becoming a chatbot?

## Language

### The agents

**Companion**:
The one face the passenger sees. Behind it, four agents, each named for what it
does. The passenger never sees the seams.
_Avoid_: assistant, chatbot, bot

**Trip agent**:
Turns a wish into a full itinerary on Pegasus's network, and rebuilds repeat
trips. Jess's week is its work, before and after she says yes.
_Avoid_: planner, search

**Offer agent**:
Predicts which bag, seat or bundle each traveller will buy, and when to ask. It
acts only where the predicted need is high, and stays quiet where it is low.
_Avoid_: upsell engine, recommender

**Group agent**:
Turns one booking into a group: suggests who to send it to, pre-fills each
friend's booking in the organiser's name, and nudges the last straggler once.
_Avoid_: sharing, referral

**Moments agent**:
Picks the moment and the channel: a free week it noticed, check-in opening, a
cancellation, a fare drop. Everything it sends arrives on a lock screen.
_Avoid_: notifications, marketing

### The trip

**Sentence**:
The one input in the app. A passenger says a trip in one go, typed or spoken, and
the companion answers with a ticket rather than with text. There is no transcript
and no reply bubble, which is what keeps this from being a chatbot.
_Avoid_: prompt, query, message, chat

**Heard**:
What the companion took from the sentence, shown as chips under it: travellers,
month, place, nights, trip type. Every chip is editable, because a misheard
word must cost one tap, not a fresh search.
_Avoid_: parsed, entities

**Draft**:
The trip as the companion has assembled it, field by field, with where each
value came from. It becomes a Ticket when printed and a booking when paid for.
A draft has a route: a simple return, or stops with nights at each.
_Avoid_: search, form, itinerary

**Provenance**:
Where a value on the draft came from, as one of a closed set: **you said**
(navy), **remembered** from past bookings (surface, hairline), **predicted** from
the rest of the trip (dotted), or **from** the organiser of a group (white, with
their initials). On the pass, anything not said carries a dotted underline. A
value loses its tag the moment the passenger changes it.
_Avoid_: source, confidence, inferred

**Cold start**:
A passenger with no history. Nothing is remembered, so everything not said is a
prediction and is tagged as one. Jess.
_Avoid_: new user, anonymous

**Warm start**:
A passenger whose past bookings fill most of the ticket. Not in this demo; the
libraries still know how (`usualTrip`).
_Avoid_: returning user, profile

**Thumbs**:
One-tap feedback, Uber-style: did we get it right? A down vote opens a short list
of what it could have been (the return date, the seat, the bags). It tells the
agents exactly what they got wrong, so each prediction improves.
_Avoid_: rating, survey, feedback form

### The group

**Organiser**:
The passenger who booked first and sent the trip on. Sees names, status and
seat only; never anybody else's fare. Jess.
_Avoid_: host, leader, admin

**Invitee**:
Someone the organiser invited. With the app, the companion builds their booking
from what Pegasus knows about them and sends a push in the organiser's name.
Without it, a WhatsApp link opens the same booking on the web. Archie and Will.
_Avoid_: guest, member

**Suggested friends**:
The two people the companion proposes sending the trip to, from the phone's
contacts with permission, each with the reason. The organiser unticks or sends
to nobody; it is never assumed who a mate is.
_Avoid_: invite list, share sheet

**Squad**:
The group, once it exists: a card in My Flights that fills in as people book, a
Live Activity on the lock screen while they do, and one offer for all of them
once they have.
_Avoid_: party, booking group

**Seat beside**:
The seat next to the organiser's, offered to a friend in the organiser's name.
Computed off the organiser's block, offered once, priced per leg. Never held or
frozen: an offer, not a reservation.
_Avoid_: upsell, add-on

### The moment

**Moment**:
A trip the companion sees coming and brings up at the right time, before anyone
searches. In this demo, a free week in May and two searches for Cappadocia.
_Avoid_: alert, saved search, watch

**Usual trip**:
The trip rebuilt from last time: flights, seat, bundle, with an all-in price up
front. The one thing it cannot know, the return date, it offers as two options.
A year on, it starts from the option he took and leaves out the extras he left.
_Avoid_: default, template

**Nudge**:
The companion speaking first, on the lock screen, with Why I spoke. One tap
builds the week; "Not this time" keeps it quiet until the next free week it
finds, "Don't suggest trips" for good. One unasked message a quarter.
_Avoid_: reminder, push, campaign

**The three gates**:
What keeps a morning silent, each alone sufficient: it is not the moment; the
passenger said not this year, or never; the interruption budget is spent.
Restraint is a property of the system, not a claim in a slide.
_Avoid_: thresholds, rules engine

**Interruption budget**:
Three. How many times the companion may speak about one moment. When it is gone
the companion is silent regardless of what the fares do.
_Avoid_: rate limit, throttle, quota

**Why I spoke**:
The pale-yellow block on every nudge, in the first person, with the figures a
passenger can check. Every number in it is computed in code and handed over as a
sentence. Restraint nobody can see reads as no restraint at all, and a proposal
nobody can check reads as a push.
_Avoid_: explanation, rationale

**Keep Dad posted**:
A parent follows the trip because the passenger said so: the dates, who she's
with, when she lands, told the same second if a flight moves, never an offer.
A card on the confirmation, honoured by every message after; STOP ends it.
_Avoid_: sharing, notifications

### The demo

**Scene**:
One beat of the journey, reachable from the panel beside the phone. Scenes
exist because a phone cannot show a different morning or a different person's
phone on its own.
_Avoid_: step, page, slide

**Trace**:
The Agent view of the panel: what each agent read, thought and did to reach the
screen on the phone, one step at a time, computed from the same calls the screen
made. A step is read, thought, did, held back or waiting. Held back is a step.
_Avoid_: log, debug panel, chain of thought

**Run**:
A trace arriving live. A screen asks for one, the steps stream onto the panel,
and the phone shows its result when the last step lands. One run per phone.
_Avoid_: loading state, spinner

**Second phone**:
The phone that appears on the left when the story moves to Archie's, Will's or
Dad's device, and goes away when their part is done.
_Avoid_: modal, popup, aside

**Journey**:
The end-to-end story the prototype carries: three mates go to Cappadocia, from
the companion speaking first to the next trip.
_Avoid_: flow, funnel, path
