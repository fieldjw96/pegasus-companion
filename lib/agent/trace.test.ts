import { describe, expect, it } from "vitest";
import { ACTS } from "./scenes";
import { traceFor, type TraceState } from "./trace";
import { MOMENT, momentDates } from "@/lib/moments/moments";
import { WILL_PROMPT } from "@/lib/demo/personas";

/**
 * The agent panel narrates the screens from the same calls the screens make.
 * These tests pin that: the figures in a trace are the figures on the ticket,
 * every scene has something to say, and the three gates read as gates.
 */
const COLD: TraceState = {
  prompt: null,
  draft: null,
  booked: false,
  thumbs: null,
  invited: [],
  frozen: false,
  inviteesBooked: {},
  declined: false,
  emre: { draft: null, booked: false, corrected: null, gifts: false, surprise: true },
  moment: { set: false, declined: false, never: false, approved: false, spoken: 0 },
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

  it("explains a quiet morning with the gate that held", () => {
    const quiet = traceFor("/moment/quiet", COLD);
    const gates = quiet.steps.filter((s) => s.did.startsWith("Gate"));
    expect(gates).toHaveLength(3);
    expect(gates[0]?.kind).toBe("quiet");
    expect(quiet.steps[quiet.steps.length - 1]?.thought).toContain("Not the moment");
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
    expect(again.steps[again.steps.length - 1]?.kind).toBe("act");
    expect(again.steps[again.steps.length - 1]?.facts?.[0]).toBe(
      `Budget 1 of ${MOMENT.interruptionBudget}`,
    );
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
