import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Ticket } from "./ticket";
import { JESS, jessDraft } from "@/lib/demo/personas";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { breakdown } from "@/lib/assistant/price";

/**
 * Does the ticket render, and does what it prints match what the libraries
 * underneath it computed? Typecheck, lint and build cannot see whether a
 * component renders at all; a render test is the cheapest thing that can.
 */
const NAMES = JESS.travellers.map((t) => t.name);

function mount() {
  const draft = jessDraft();
  const onChange = vi.fn();
  render(<Ticket draft={draft} onChange={onChange} names={NAMES} owner={NAMES[0]} />);
  return { draft, onChange };
}

describe("Ticket", () => {
  it("prints the reference, every leg, the seat and the total the libraries computed", () => {
    const { draft } = mount();
    const itinerary = itineraryFor(draft, NAMES[0]);
    expect(screen.getByText(itinerary.reference)).toBeTruthy();
    for (const leg of itinerary.legs) {
      expect(screen.getByText(leg.flight.flightNo)).toBeTruthy();
    }
    expect(screen.getAllByText(breakdown(draft).total.toFixed(2)).length).toBeGreaterThan(0);
    expect(screen.getByText("Jess Carter")).toBeTruthy();
    cleanup();
  });

  it("marks the companion's values dotted", () => {
    mount();
    expect(screen.getByRole("button", { name: /^Seat 14A/ }).className).toContain("mine");
    expect(screen.getByRole("button", { name: /^Fare SAVER/ }).className).toContain("mine");
    cleanup();
  });

  it("opens the breakdown and the change panel from the stub", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Full breakdown" }));
    expect(screen.getByText(/What makes up/)).toBeTruthy();
    expect(screen.getByText("SAVER flight fares")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Change anything" }));
    expect(screen.getByText(/2 from you · 9 predicted/)).toBeTruthy();
    expect(screen.getByText(/Istanbul 2 · Cappadocia 3 · Antalya 2/)).toBeTruthy();
    cleanup();
  });

  it("writes a change straight back, marked as said", () => {
    const { onChange } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Change anything" }));
    fireEvent.click(screen.getByRole("button", { name: "Change Fare" }));
    fireEvent.click(screen.getByRole("button", { name: "COMFORT FLEX" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0];
    expect(next.package.value).toBe("comfortFlex");
    expect(next.package.source).toBe("said");
    cleanup();
  });
});
