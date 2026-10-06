# pegasus-companion

A mock of the Pegasus Airlines mobile app with an agentic companion built into it,
as a web app. Four agents behind one face (Trip, Offer, Group, Moments), two
storyboarded journeys (the lads go to Cappadocia; home for Mum's birthday). Built
by Team Winging It for the Pegasus x Berkeley Haas **AI Travel Companion
Hackathon** (Build Day 3 October 2026).

See [[CONTEXT]] for this repo's vocabulary.

## Scope, and what this is not

**This is a mock, not a product, and not affiliated with Pegasus Airlines.** It
reproduces enough of the booking journey to demonstrate a companion layer. Nothing
here books anything, takes payment, or talks to a real airline system.

**The companion must act on its own initiative.** The hackathon brief rules out "a
basic chatbot feature list" and "a standalone assistant disconnected from the
Pegasus ecosystem". The one input is a sentence that is answered with a ticket,
never with text: there is no transcript and no reply bubble, and adding either
would fail the brief. Everywhere else the companion decides when to speak.

**Staying quiet is a feature.** `lib/moments/moments.ts` has three gates, each of
which alone silences the companion. Ignored offers are not repeated; "not this
year" holds for a year; "don't suggest again" holds for good. A change that makes
it speak more often is a regression unless the Ticket says otherwise.

**Every number the companion says is computed.** "112.00 GBP cheaper", "14B next
to him is yours", "down to 7 seats": all arithmetic in `lib/`, handed to the
screen as a finished sentence. The demo's routes are pinned in
`lib/journey/script.ts`, keyed by route so the figures hold whichever month the
demo runs in, and asserted in its test so every screen agrees.

**Build to the design canvas, screen for screen.** Figtree and Archivo, self-hosted
under `public/fonts`. White cards on `#F2F6FA`, yellow for the one primary action
per screen, orange for text links and the dotted "mine" underline and never as a
fill. The panel beside the phone is for the presenter, not the passenger: Agent shows
the work behind the screen, Scenes jumps between beats.

**The Agent view narrates from the same calls the screen made.** `lib/agent/trace.ts`
builds every step from `lib/`; it never carries a figure of its own. A step that
stays quiet is shown as held back, because restraint nobody can see reads as no
restraint at all. The steps stream in live (`components/agent-provider.tsx`) and
the phone waits for the last one before it shows the result: a screen that needs
the agents' work asks for a run with `useAgentRun` and renders `Thinking` until
it is done. Do not show a result the run has not reached.

**Both journeys run by tapping inside the phones.** A beat on someone else's
device opens the second phone (`components/companion-phone.tsx`); a beat on a
later day is on the time strip under the main phone. Screens navigate with
`useNav()`, never `next/navigation` directly, so they work in either phone.

**Every screen must open cold.** There is no server state. A screen opened
directly falls back to the persona's starting trip (Will's week, Emre's usual), so
a presenter can start the demo anywhere.

## Stack

TypeScript everywhere, `strict` plus `noUncheckedIndexedAccess`. Next.js App Router
on Vercel. Tailwind v4, no config file. Zod at every external boundary. Vitest,
tests colocated. **No database, no auth, no secrets.** Mock data is deterministic
and lives in `lib/journey/`.

## Rules

**No new dependencies without a Ticket that says so.** The dependency list is
deliberately tiny: next, react, zod. A hackathon prototype that cannot `npm ci` on
Build Day morning is worth nothing.

**Never ask a model for arithmetic, counting, or date comparison.** Compute every
comparison in code and hand over the _result_ as a sentence. This is the single
easiest way to break the companion while appearing to improve it.

**Format dates and money by hand, never through `Intl`.** Node and Chromium ship
different ICU builds and disagree on en-GB output, which is a hydration error on
every screen that prints a date. `lib/demo/personas.ts` has the formatters.

**Pegasus brand orange is `#FF5C00`.** Taken from Pegasus's own hackathon site, so
it is exact. Do not eyedrop a replacement from a screenshot.

**Pages are server components; screens are client islands.** A route under `app/`
renders one screen from `components/screens/`. What the passenger has done so far
lives in `components/journey-provider.tsx`, in session storage, never in a URL.

**Load the dev server over `localhost`, never `127.0.0.1`.** Next refuses its own
dev chunks on the latter and the page renders with no interactivity, which looks
exactly like a broken build and is not one.

## Definition of done

`npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build`
all pass, and CI is green on the pull request. Agents open pull requests; they do
not merge.

Work happens in a worktree under `C:\agent-runs`, never in the OneDrive clone, and
`node_modules` must never reach OneDrive sync.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
