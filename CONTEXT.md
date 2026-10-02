# pegasus-companion

A mock of the Pegasus mobile booking journey, and a companion layer that acts
inside it on its own initiative. The whole repo exists to answer one question for
the hackathon jury: can an agent make the purchase decision easier without
becoming a chatbot?

## Language

### The journey

**Journey**:
The whole booking purchase experience, from the first search to the confirmation.
It is the brief's in-scope area. Pre-booking inspiration and post-booking service
are explicitly out of scope and provide context only.
_Avoid_: funnel, flow, checkout

**Step**:
One named screen of the Journey: `search`, `results`, `fare`, `passengers`,
`seats`, `extras`, `payment`, `confirmation`. A Step is what a screen reports to
the Companion, and the set is closed: adding one means changing
`companionStateSchema`.
_Avoid_: page, route, stage

**Deliberation**:
Everything one passenger does while deciding on one trip, across visits and across
days. This is the unit the Companion reasons about, and the reason it exists: an
airline app models a session, but nobody books a flight in one sitting. Visits,
findings and the interruption budget all belong to the Deliberation, not the
session.
_Avoid_: session, visit, journey

**Fare Family**:
One of `Essentials`, `Advantage`, `Extra`. What is bundled differs, and that
difference is what the Companion can usefully reason about: a checked bag added to
Essentials can cost more than Advantage, which includes one.
_Avoid_: fare class, tier, bundle

### The companion

**Companion**:
The agentic layer. It watches the Deliberation, decides whether to speak, and when
it speaks it says exactly one thing and offers exactly one action. It has no text
box: a passenger never asks it anything. Deliberately not called an assistant,
which implies being asked, nor an agent, which `foreman` already owns.
_Avoid_: assistant, agent, chatbot, bot

**Judgement**:
The five typed answers the Companion gets back about the current state:
`isFamilyTrip`, `needsCheckedBag`, `upgradePropensity`, `openQuestion`,
`worthInterrupting`. Each is a bounded value, never prose. A Judgement is an input
to a decision and is never shown to a passenger as-is.
_Avoid_: prediction, score, inference, classification

**Open Question**:
What the passenger appears to be stuck on, as one of a closed set. This is the
Companion's central idea: it does not watch the market, it watches the specific
question this passenger has not resolved. `none` is a valid and common answer.
_Avoid_: intent, goal, problem

**Finding**:
A fact about what has changed since the passenger last looked, written as a
sentence and computed in code. Findings exist because the Judgement layer cannot
do arithmetic or compare dates reliably, so every comparison is resolved before it
is handed over.
_Avoid_: signal, event, delta, update

**Intervention**:
One act of speaking: a channel, a headline, a detail, one action, and a rationale.
The rationale is not decoration — it is displayed in the demo, because restraint
nobody can see reads as no restraint at all.
_Avoid_: notification, message, nudge, prompt

**Interruption Budget**:
The fixed allowance of a passenger's attention the Companion may spend in one
Deliberation. Three. When it is gone the Companion is silent regardless of how
interesting the state is. It makes restraint a property of the system rather than a
claim in a slide.
_Avoid_: rate limit, throttle, quota

### Provenance

**Judged by**:
Whether a Judgement came from Jev or from the deterministic stub. Always surfaced
in the demo panel, because a judgement's source changes how much it should be
trusted and the stub is deliberately cruder than the model.
_Avoid_: model, provider, backend
