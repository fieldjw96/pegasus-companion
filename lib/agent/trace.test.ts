import { describe, expect, it } from "vitest";
import { ACTS } from "./scenes";
import { traceFor, type TraceState } from "./trace";
import { MOMENT, momentDates } from "@/lib/moments/moments";
import { WILL, WILL_PROMPT } from "@/lib/demo/personas";
import { amendDraft, buildDraft } from "@/lib/assistant/understand";

/**
 * The agent panel narrates the screens from the same calls the screens make.
 * These tests pin that: the figures in a trace are the figures on the ticket,
 * every scene has something to say, and the three gates read as gates.
 */
const COLD: TraceState = {
  prompt: null,
  draft: null,
  edit: null,
  booked: false,
  thumbs: null,
  invited: [],
  shared: [],
  sent: false,
  inviteesBooked: {},
  hostel: null,
  emre: {
    draft: null,
    booked: false,
    corrected: null,
    gifts: false,
    surprise: true,
    nextYear: false,
    giftsLastYear: false,
  },
  moment: { set: true, declined: false, never: false, approved: false, spoken: 0 },
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

  it("prices Will's week to the same penny as the ticket", () => {
    const home = traceFor("/", { ...COLD, prompt: WILL_PROMPT });
    const priced = home.steps.find((s) => s.did.startsWith("Priced it"));
    expect(priced?.did).toBe("Priced it at 409.40 GBP");
    expect(priced?.thought).toContain("112.00 GBP cheaper");
    const routed = home.steps.find((s) => s.did === "Routed it on the network");
    expect(routed?.facts).toHaveLength(4);
    expect(routed?.facts?.[0]).toContain("PC 1164 06:10");
    expect(home.steps.map((s) => s.agent)).toContain("Offer");
  });

  it("does not offer the presents next year when he left them last year", () => {
    const ignored = {
      ...COLD,
      emre: { ...COLD.emre, booked: true, nextYear: true, giftsLastYear: false },
    };
    const offer = traceFor("/emre", ignored).steps.find((s) => s.agent === "Offer");
    expect(offer?.kind).toBe("quiet");
    const taken = {
      ...COLD,
      emre: { ...COLD.emre, booked: true, nextYear: true, giftsLastYear: true },
    };
    expect(traceFor("/emre", taken).steps.find((s) => s.agent === "Offer")?.kind).toBe(
      "think",
    );
  });

  it("tells Dad about a cancellation the same second", () => {
    const dad = traceFor("/moment/dad/cancelled", COLD);
    expect(dad.title).toBe("Unhappy path: the flight is cancelled");
    expect(dad.steps[dad.steps.length - 1]?.thought).toContain("Mum still hears nothing");
  });

  it("carries Why I spoke onto the nudge, word for word", () => {
    const nudge = traceFor("/moment/nudge", COLD);
    const spoke = nudge.steps.find((s) => s.kind === "act");
    expect(spoke?.facts).toHaveLength(3);
    expect(spoke?.facts?.[2]).toContain(`seat 3A`);
    expect(momentDates().nudge.slice(5)).toBe("04-14");
    expect(nudge.when).toMatch(/^[A-Z][a-z]+day 14 April, 08:30$/);
  });

  it("stays quiet next year when told never", () => {
    const never = traceFor("/moment/next-year", {
      ...COLD,
      moment: { ...COLD.moment, never: true },
    });
    const last = never.steps[never.steps.length - 1];
    expect(last?.kind).toBe("quiet");
    expect(last?.thought).toContain("Told never to suggest this.");
  });

  it("speaks next year when nothing was said against it", () => {
    const again = traceFor("/moment/next-year", COLD);
    const asked = again.steps.find((s) => s.kind === "act");
    expect(asked?.did).toBe("Asked, once");
    expect(asked?.facts?.[0]).toBe(`Budget 1 of ${MOMENT.interruptionBudget}`);
    expect(again.steps[again.steps.length - 1]?.agent).toBe("Offer");
  });

  it("reads the demo's state: the squad fills in as people book", () => {
    expect(text("/invite/archie/confirmation")).toContain("2 of 3 booked");
    expect(text("/invite/archie/confirmation")).toContain("No offer yet");
    const complete = { ...COLD, inviteesBooked: { "Archie Bell": "14B" } };
    expect(text("/invite/tom/confirmation", complete)).toContain("3 of 3 booked");
    expect(text("/invite/tom/confirmation", complete)).toContain("Squad complete");
    expect(
      text("/group", {
        ...complete,
        inviteesBooked: { ...complete.inviteesBooked, "Tom Baker": "14C" },
      }),
    ).toContain("22.50 GBP");
  });
});

describe("a change said in a sentence", () => {
  it("narrates what moved and rebuilds the rest from the same draft", () => {
    const week = buildDraft(WILL_PROMPT, WILL);
    const amended = amendDraft(week, "Make it the 20th instead");
    const changed = traceFor("/", {
      ...COLD,
      prompt: WILL_PROMPT,
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
