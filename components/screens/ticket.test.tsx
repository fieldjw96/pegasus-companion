import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Ticket } from "./ticket";
import { heroDraft } from "@/lib/demo/hero";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { breakdown } from "@/lib/assistant/price";

/**
 * Does the ticket render, and does what it prints match what the libraries
 * underneath it computed? Typecheck, lint and build cannot see whether a
 * component renders at all; a render test is the cheapest thing that can.
 */
const NAMES = ["Jack Field", "Ayşe Field", "Mila Field"];

function mount() {
  const draft = heroDraft();
  const onChange = vi.fn();
  render(<Ticket draft={draft} onChange={onChange} names={NAMES} />);
  return { draft, onChange };
}

describe("Ticket", () => {
  it("prints the reference, seats and total the libraries computed", () => {
    const { draft } = mount();
    const itinerary = itineraryFor(draft);
    expect(screen.getByText(itinerary.reference)).toBeTruthy();
    expect(screen.getByText(itinerary.out!.seats.join(" "))).toBeTruthy();
    expect(screen.getAllByText(breakdown(draft).total.toFixed(2)).length).toBeGreaterThan(0);
    expect(screen.getByText("PC 1474")).toBeTruthy();
    expect(screen.getByText("Jack Field +2")).toBeTruthy();
    cleanup();
  });

  it("marks the companion's values dotted and the passenger's not", () => {
    mount();
    // Seat, fare and changes are the companion's on the hero trip.
    expect(screen.getByRole("button", { name: /^Seat 19D 19E 19F/ }).className).toContain(
      "mine",
    );
    expect(screen.getByRole("button", { name: /^Fare SAVER PLUS/ }).className).toContain(
      "mine",
    );
    expect(screen.queryByRole("button", { name: /^Baggage/ })).toBeNull();
    cleanup();
  });

  it("opens the breakdown and the change panel from the stub", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Full breakdown" }));
    expect(screen.getByText(/What makes up/)).toBeTruthy();
    expect(screen.getByText("SAVER PLUS flight fare")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Change anything" }));
    expect(screen.getByText(/4 from you · 3 remembered · 3 predicted/)).toBeTruthy();
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
