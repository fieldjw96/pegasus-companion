import { describe, expect, it } from "vitest";
import { ACTS } from "./scenes";
import { traceFor, type TraceState } from "./trace";
import { JESS, JESS_PROMPT } from "@/lib/demo/personas";
import { amendDraft, buildDraft } from "@/lib/assistant/understand";
import { nudgeDraft } from "@/lib/group/trip-nudge";

/**
 * The agent panel narrates the screens from the same calls the screens make.
 * These tests pin that: the figures in a trace are the figures on the ticket,
 * every scene has something to say, and the three gates read as gates.
 */
const COLD: TraceState = {
  prompt: null,
  draft: null,
  edit: null,
  origin: null,
  booked: false,
  thumbs: null,
  invited: [],
  shared: [],
  sent: false,
  inviteesBooked: {},
  hostel: null,
  dadTold: false,
  mealsDropped: [],
  nudge: { declined: false, never: false, spoken: 0 },
};

const text = (path: string, state: TraceState = COLD) =>
  traceFor(path, state)
    .steps.map((s) => [s.did, s.thought, ...(s.facts ?? [])].join(" "))
    .join("\n");

describe("the agent trace", () => {
  it("has steps for every scene, cold", () => {
    for (const act of ACTS) {
      for (const scene of act.scenes) {
        const trace = traceFor(scene.href, COLD);
        expect(trace.steps.length, scene.href).toBeGreaterThanOrEqual(3);
        for (const step of trace.steps) {
          expect(step.did.length, scene.href).toBeGreaterThan(0);
          expect(step.thought.length, scene.href).toBeGreaterThan(0);
        }
      }
    }
  });

  it("pitches three trips on a first open, from named inputs, none of them Cappadocia", () => {
    const first = traceFor("/", COLD);
    expect(first.title).toBe("A wish becomes a week");
    expect(first.steps.filter((s) => s.kind === "read")).toHaveLength(4);
    const picked = first.steps.find((s) => s.did === "Picked three");
    expect(picked?.facts).toHaveLength(3);
    expect(picked?.facts?.join(" ")).not.toContain("Cappadocia");
    expect(first.steps.filter((s) => s.kind === "quiet").length).toBeGreaterThanOrEqual(3);
    expect(first.steps[first.steps.length - 1]?.kind).toBe("wait");
  });

  it("answers a sentence with no place in it with places", () => {
    const found = traceFor("/", { ...COLD, prompt: "Somewhere warm in October, under £600" });
    expect(found.steps.some((s) => s.did === "No place named")).toBe(true);
    expect(found.steps.find((s) => s.did.startsWith("Offered"))?.thought).toContain("Antalya");
  });

  it("prices Jess's week to the same penny as the ticket", () => {
    const home = traceFor("/", { ...COLD, prompt: JESS_PROMPT });
    const priced = home.steps.find((s) => s.did.startsWith("Priced it"));
    expect(priced?.did).toBe("Priced it at 409.40 GBP");
    expect(priced?.thought).toContain("112.00 GBP cheaper");
    const routed = home.steps.find((s) => s.did === "Routed it on the network");
    expect(routed?.facts).toHaveLength(4);
    expect(routed?.facts?.[0]).toContain("PC 1164 06:10");
    expect(home.steps.map((s) => s.agent)).toContain("Offer");
  });

  it("speaks first, once, with Why I spoke, and stays quiet when told", () => {
    const nudge = traceFor("/nudge", COLD);
    expect(nudge.title).toBe("The companion speaks first");
    const spoke = nudge.steps.find((s) => s.kind === "act");
    expect(spoke?.did).toBe("Spoke, once, on the lock screen");
    expect(spoke?.facts).toHaveLength(3);
    expect(spoke?.facts?.[2]).toContain("89.40 GBP LIGHT");
    expect(
      nudge.steps.find((s) => s.did === "Built the week before asking")?.thought,
    ).toContain("409.40 GBP each");
    const never = traceFor("/nudge", {
      ...COLD,
      nudge: { declined: false, never: true, spoken: 1 },
    });
    expect(never.steps[never.steps.length - 1]?.kind).toBe("quiet");
    expect(never.steps[never.steps.length - 1]?.thought).toContain("never to suggest trips");
    const declined = traceFor("/nudge", {
      ...COLD,
      nudge: { declined: true, never: false, spoken: 1 },
    });
    expect(declined.steps.some((s) => s.kind === "act")).toBe(false);
  });

  it("tells Dad about a cancellation the same second, once Jess said keep him posted", () => {
    const dad = traceFor("/follow/dad/cancelled", { ...COLD, dadTold: true });
    expect(dad.title).toBe("Unhappy path: flight cancelled");
    expect(dad.steps[dad.steps.length - 1]?.did).toBe("Told him the same second as Jess");
    expect(text("/squad/cancelled", { ...COLD, dadTold: true })).toContain(
      "and Dad the same second",
    );
    expect(text("/confirmation", COLD)).toContain("sent nothing");
    expect(text("/confirmation", { ...COLD, dadTold: true })).toContain(
      "the dates and the landing time",
    );
  });

  it("reads the demo's state: the squad fills in as people book", () => {
    expect(text("/invite/archie/confirmation")).toContain("2 of 3 booked");
    expect(text("/invite/archie/confirmation")).toContain("No offer yet");
    const complete = { ...COLD, inviteesBooked: { "Archie Bell": "14B" } };
    expect(text("/invite/will/confirmation", complete)).toContain("3 of 3 booked");
    expect(text("/invite/will/confirmation", complete)).toContain("Squad complete");
    expect(
      text("/group", {
        ...complete,
        inviteesBooked: { ...complete.inviteesBooked, "Will Parker": "14C" },
      }),
    ).toContain("22.50 GBP");
  });
});

describe("a change said in a sentence", () => {
  it("narrates what moved and rebuilds the rest from the same draft", () => {
    const week = buildDraft(JESS_PROMPT, JESS);
    const amended = amendDraft(week, "Make it the 20th instead");
    const changed = traceFor("/", {
      ...COLD,
      prompt: JESS_PROMPT,
      draft: amended?.draft ?? null,
      edit: { said: "Make it the 20th instead", changed: amended?.changed ?? [] },
    });
    const heard = changed.steps[0];
    expect(heard?.did).toBe("Heard a change");
    expect(heard?.facts?.[0]).toMatch(/^Out: [A-Z][a-z]{2} 20 May$/);
    expect(changed.steps[1]?.did).toBe("Kept the rest");
    expect(changed.steps.some((s) => s.did === "Heard the sentence")).toBe(false);
    expect(changed.steps.find((s) => s.did.startsWith("Priced it"))?.did).toBe(
      "Priced it at 409.40 GBP",
    );
  });
});

describe("the week built from the nudge", () => {
  it("traces every field to a signal, not to a sentence", () => {
    const yes = {
      ...COLD,
      prompt: JESS_PROMPT,
      draft: nudgeDraft(),
      origin: "nudge" as const,
    };
    const home = traceFor("/", yes);
    expect(home.when).toBe("Home, after the yes");
    expect(home.steps[0]?.did).toBe("Took the yes");
    expect(home.steps.some((s) => s.did === "Heard the sentence")).toBe(false);
    expect(home.steps.find((s) => s.did === "Picked the dates")?.thought).toContain(
      "free in your calendar",
    );
    expect(home.steps.find((s) => s.did === "Printed the ticket")?.thought).toContain(
      "from the nudge she said yes to",
    );
    expect(home.steps.find((s) => s.did.startsWith("Priced it"))?.did).toBe(
      "Priced it at 409.40 GBP",
    );
    expect(text("/confirmation", { ...yes, booked: true })).toContain("The nudge named them");
    expect(text("/checkout", yes)).toContain("Checked the passport before payment");
    expect(text("/invite/will/ticket", yes)).toContain("Will pays his own way");
  });
});
