# pegasus-companion

A mock of the Pegasus Airlines mobile booking journey, built as a web app, used as
a harness for an agentic companion layer. It exists for the Pegasus x Berkeley Haas
**AI Travel Companion Hackathon** (Build Day 3 October 2026).

See [[CONTEXT]] for this repo's vocabulary.

## Scope, and what this is not

**This is a mock, not a product, and not affiliated with Pegasus Airlines.** It
reproduces enough of the booking journey to demonstrate a companion layer. Nothing
here books anything, takes payment, or talks to a real airline system.

**The companion must act on its own initiative.** The hackathon brief rules out "a
basic chatbot feature list" and "a standalone assistant disconnected from the
Pegasus ecosystem". There is no text box and no chat transcript in this app, and
adding one would fail the brief. The companion decides when to speak.

**Staying quiet is a feature.** `lib/companion/decide.ts` has three gates, each of
which alone silences the companion. A change that makes it speak more often is a
regression unless the Ticket says otherwise.

**The journey must work with the companion dead.** Every companion call is
best-effort. If the API route 500s or Jev is rate-limited, the booking screens
still work and the companion simply says nothing.

## Stack

TypeScript everywhere, `strict` plus `noUncheckedIndexedAccess`. Next.js App Router
on Vercel. Tailwind v4, no config file. Zod at every external boundary. Vitest,
tests colocated. **No database, no auth, no secrets.** Mock data is deterministic
and lives in `lib/journey/`.

## Rules

**No new dependencies without a Ticket that says so.** The dependency list is
deliberately tiny: next, react, zod. A hackathon prototype that cannot `npm ci` on
Build Day morning is worth nothing.

**Never ask Jev for arithmetic, counting, or date comparison.** Those are its
documented failure modes: it recognises answer shapes rather than tallying, and
treats dates as text rather than ordered values. Compute comparisons in code and
pass the _result_ into `state.findings` as a sentence. This is the single easiest
way to break the companion while appearing to improve it.

**`CompanionState` is curated, never a dump.** Jev degrades on large noisy state,
and a payload carrying everything the app knows is a payload that leaks everything
the app knows. Every field must be justifiable as something the agent needs in
order to decide whether to speak. Adding a field is a deliberate act.

**Pegasus brand orange is `#FF5C00`.** Taken from Pegasus's own hackathon site, so
it is exact. Do not eyedrop a replacement from a screenshot.

**Screens are server components; the companion is a client island.** A screen
reports its step with `<ReportStep />`. A screen should not become a client
component merely to talk to the companion.

**Load the dev server over `localhost`, never `127.0.0.1`.** Next refuses its own
dev chunks on the latter and the page renders with no interactivity, which looks
exactly like a broken build and is not one.

## Definition of done

`npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build`
all pass, and CI is green on the pull request. Agents open pull requests; they do
not merge.

Work happens in a worktree under `C:\agent-runs`, never in the OneDrive clone, and
`node_modules` must never reach OneDrive sync.
