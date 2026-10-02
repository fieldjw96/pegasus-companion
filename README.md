# pegasus-companion

A mock of the Pegasus Airlines mobile booking journey, as a web app, with an
agentic **Companion** layer built into it.

Built for the Pegasus × Berkeley Haas **AI Travel Companion Hackathon**.
**Not affiliated with Pegasus Airlines.** Every fare, flight and price here is
invented.

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

The phone frame is the mock. The panel beside it is the **demo controls**, and it
is where the point lands:

- **Two days later — the fare moved.** The Companion speaks, because a fact changed
  that reverses the comparison the passenger was weighing.
- **Two days later — nothing changed.** The Companion stays silent. This is the
  harder half, and the one that answers the brief's "beyond a chatbot" pillar.

Every Intervention carries a **"Why it spoke"** disclosure. Restraint nobody can
see reads as no restraint at all.

## The idea in one paragraph

Airline apps model booking as a session: you arrive, you search, you convert or you
abandon, and next visit you start cold. Nobody books a flight that way. Airline
booking abandonment runs near 88%, the highest of any e-commerce sector, and around
87% of those people intend to come back. Abandonment is mostly not rejection — it
is an unfinished decision. The Companion holds that decision open, watches only the
specific question the passenger has not resolved, and speaks when the answer to
_that_ changes.

## Architecture

```
app/                     Screens. Server components. One per Step.
  api/companion/decide/  The Companion's only endpoint.
components/
  companion/             Provider, surfaces, the ReportStep island.
  phone-frame.tsx        The device frame every screen renders inside.
  demo-controls.tsx      Stages the gap between visits.
lib/
  journey/flights.ts     Deterministic mock inventory. No network.
  companion/types.ts     CompanionState, Judgement, Intervention. Read this first.
  companion/jev.ts       Jev client, plus the deterministic stub.
  companion/decide.ts    The three gates, and what to say once they pass.
```

**Jev decides; something else speaks.** [Jev](https://thejevai.com/docs) is a
decision-only model: it returns typed values (Choice, Score, Noul) in 70–500 ms and
cannot generate text at all. That split is deliberate — a cheap fast judgement
layer gating anything expensive.

It runs **without a Jev key**: `lib/companion/jev.ts` falls back to a deterministic
stub, so the app works offline, in CI, and on a hotel wifi on Build Day. Set
`JEV_API_KEY` to decide with Jev instead; the demo panel shows which one answered
and how long it took.

## Deliberate differences from the sibling repos

This repo copies `caddie` and `rolodeck-ai` conventions almost exactly — same CI
gate order, same `.gitattributes`, same tsconfig strictness, same Tailwind v4
setup. Three deliberate departures:

1. **Next is pinned to `16.3.8`, not caddie's `16.3.3`.** 16.2.0–16.3.5 carry a
   critical RCE in `next/og` (GHSA-vcvr-r3jv-pc5j). `npm audit --audit-level=high`
   in CI is what keeps this honest. **caddie is currently on a vulnerable pin.**
2. **Vercel's Git integration stays on.** `rolodeck-ai` disables it because a push
   would race its database migration. This repo has no database, so the simple path
   is the correct one: no deploy workflow, no `VERCEL_TOKEN`, no secrets.
3. **No Playwright.** One engineer, one build day. Unit tests on the decision logic
   are where the value is; an e2e suite is not.
