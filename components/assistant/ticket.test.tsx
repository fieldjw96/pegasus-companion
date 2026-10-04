import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Ticket } from "./ticket";
import { Checkout } from "./checkout";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { breakdown } from "@/lib/assistant/price";
import type { TripDraft } from "@/lib/assistant/draft";

/**
 * Does the ticket actually render, and does what it prints match what the
 * libraries underneath it computed?
 *
 * This test exists because of a specific failure. Three design directions were
 * shipped on the strength of green typecheck, lint, tests and build, and not one
 * of those gates can see whether a component renders at all — an earlier round
 * had two pages of static markup where the radio buttons were `<span>`s, and
 * every gate passed. A render test is the cheapest thing that would have caught
 * it.
 *
 * It still cannot see layout. Nothing here will tell you the barcode fits beside
 * the total on a 390px screen. It will tell you the seat on the pass is the seat
 * the itinerary allocated, which is the class of bug that survives a careful
 * look.
 */

const NAMES = ["Jack Field", "Ayşe Field", "Mila Field"];

function draftOf(over: Partial<TripDraft> = {}): TripDraft {
  const said = <T,>(value: T) => ({ value, source: "said" as const, why: "" });
  return {
    origin: said("STN"),
    destination: said("ADB"),
    departDate: said("2026-10-19"),
    returnDate: said<string | null>("2026-10-25"),
    party: said({ adults: 2, children: 1, infants: 0 }),
    // Inferred, so these three must come out dotted.
    package: {
      value: "saver",
      source: "predicted",
      why: "You are checking a bag, and SAVER includes 25 kg.",
    },
    checkedKg: { value: 25, source: "predicted", why: "Included with SAVER." },
    seating: { value: "together", source: "profile", why: "Mila is 4." },
    cabinBag: said(true),
    flexibility: said("none" as const),
    notes: [],
    ...over,
  };
}

function mount(over: Partial<TripDraft> = {}) {
  const draft = draftOf(over);
  const onChange = vi.fn();
  const onCheckout = vi.fn();
  render(
    <Ticket
      draft={draft}
      onChange={onChange}
      travellerNames={NAMES}
      onCheckout={onCheckout}
    />,
  );
  return { draft, onChange, onCheckout };
}

const breakdownButton = () => screen.getByRole("button", { name: /Full breakdown/ });
const changeButton = () => screen.getByRole("button", { name: /Change anything/ });

describe("Ticket", () => {
  it("prints the route, the times and the flight the pricer used", () => {
    const { draft } = mount();
    const { out } = itineraryFor(draft);

    expect(screen.getAllByText("STN").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ADB").length).toBeGreaterThan(0);
    expect(screen.getAllByText(out!.flight.departs).length).toBeGreaterThan(0);
    expect(screen.getByText(new RegExp(out!.flight.flightNo))).toBeDefined();
  });

  it("prints the gate, boarding time and reference the itinerary allocated", () => {
    const { draft } = mount();
    const itinerary = itineraryFor(draft);

    expect(screen.getByText(itinerary.reference)).toBeDefined();
    expect(screen.getByText(itinerary.out!.gate)).toBeDefined();
    expect(screen.getAllByText(itinerary.out!.boards).length).toBeGreaterThan(0);
  });

  it("prints the seats the party was actually given", () => {
    const { draft } = mount();
    const { out } = itineraryFor(draft);
    expect(out!.seats).toHaveLength(3);
    expect(screen.getByText(out!.seats.join(" "))).toBeDefined();
  });

  it("prints the total the breakdown computed, not a second opinion", () => {
    const { draft } = mount();
    const total = breakdown(draft).total.toFixed(2);
    expect(screen.getAllByText(total).length).toBeGreaterThan(0);
  });

  it("names the lead passenger and counts the rest", () => {
    mount();
    expect(screen.getByText(/Jack Field/)).toBeDefined();
    expect(screen.getByText("+2")).toBeDefined();
  });

  it("marks inferred values with a dotted underline and leaves yours plain", () => {
    mount();
    expect(screen.getByText("SAVER").className).toContain("decoration-dotted");

    // The gate is not a decision anybody made, so it carries no mark.
    const gate = screen.getByText(itineraryFor(draftOf()).out!.gate);
    expect(gate.className).not.toContain("decoration-dotted");
  });

  it("shows the return leg both ways round for a return trip", () => {
    const { draft } = mount();
    const { back } = itineraryFor(draft);
    expect(screen.getByText(/^Return ·/)).toBeDefined();
    expect(screen.getAllByText(back!.flight.departs).length).toBeGreaterThan(0);
  });

  it("says one way, and prints no return leg, for a one way", () => {
    mount({ returnDate: { value: null, source: "said", why: "" } });
    expect(screen.getByText("One way")).toBeDefined();
    expect(screen.queryByText(/^Return ·/)).toBeNull();
  });

  it("opens the breakdown, and shows every line the pricer computed", () => {
    const { draft } = mount();
    const price = breakdown(draft);
    expect(price.lines.length).toBeGreaterThan(1);

    expect(screen.queryByText(/What makes up/)).toBeNull();
    fireEvent.click(breakdownButton());

    expect(screen.getByText(/What makes up/)).toBeDefined();
    for (const line of price.lines) {
      expect(screen.getByText(line.label)).toBeDefined();
      expect(screen.getByText(line.detail)).toBeDefined();
    }
    expect(screen.getAllByText(`${price.total.toFixed(2)} GBP`).length).toBeGreaterThan(0);
  });

  it("names what the fare already covered, so no zero is unexplained", () => {
    mount();
    fireEvent.click(breakdownButton());
    expect(screen.getByText(/Already in your SAVER fare/)).toBeDefined();
    expect(screen.getByText(/25 Kg Check-in Baggage/)).toBeDefined();
  });

  it("opens the change panel with every field and its reason", () => {
    mount();
    expect(screen.queryByRole("heading", { name: "Change anything" })).toBeNull();
    fireEvent.click(changeButton());

    expect(screen.getByRole("heading", { name: "Change anything" })).toBeDefined();
    expect(screen.getByText(/Mila is 4/)).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Change" }).length).toBeGreaterThan(5);
  });

  it("opens the change panel when an inferred value on the pass is tapped", () => {
    mount();
    fireEvent.click(screen.getByText("SAVER"));
    expect(screen.getByRole("heading", { name: "Change anything" })).toBeDefined();
  });

  it("only ever has one panel open", () => {
    mount();
    fireEvent.click(breakdownButton());
    fireEvent.click(changeButton());
    expect(screen.queryByText(/What makes up/)).toBeNull();
    expect(screen.getByRole("heading", { name: "Change anything" })).toBeDefined();
  });

  it("closes a panel when its own control is tapped again", () => {
    mount();
    fireEvent.click(breakdownButton());
    expect(screen.getByText(/What makes up/)).toBeDefined();
    fireEvent.click(breakdownButton());
    expect(screen.queryByText(/What makes up/)).toBeNull();
  });

  it("checks out", () => {
    const { onCheckout } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    expect(onCheckout).toHaveBeenCalledOnce();
  });

  it("claims the saving against buying the same bag the funnel's way", () => {
    mount();
    expect(screen.getByText(/GBP cheaper/)).toBeDefined();
  });

  it("claims nothing when there is nothing to claim", () => {
    // Nobody is checking a bag, so there is no cheaper path to point at.
    mount({
      checkedKg: { value: 0, source: "said", why: "" },
      cabinBag: { value: false, source: "said", why: "" },
    });
    expect(screen.queryByText(/GBP cheaper/)).toBeNull();
  });
});

describe("the reference survives to the end", () => {
  /**
   * The confirmation screen printed a hardcoded PNR while the ticket printed a
   * derived one, so the two screens disagreed about the booking two taps apart.
   * Nothing but looking at both at once would have found it.
   */
  it("is the same on the ticket and on the confirmation", () => {
    const draft = draftOf();
    const reference = itineraryFor(draft).reference;

    render(
      <Ticket draft={draft} onChange={vi.fn()} travellerNames={NAMES} onCheckout={vi.fn()} />,
    );
    expect(screen.getByText(reference)).toBeDefined();
    cleanup();

    render(<Checkout draft={draft} total={breakdown(draft).total} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^Pay / }));
    expect(screen.getByText(reference)).toBeDefined();
  });
});
