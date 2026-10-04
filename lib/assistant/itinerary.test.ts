import { describe, expect, it } from "vitest";
import { itineraryFor, minusMinutes, nights, referenceFor, seatsFor } from "./itinerary";
import { inventory } from "@/lib/journey/flights";
import type { TripDraft } from "./draft";

/**
 * The pass prints a seat, a gate, a boarding time and a reference. None of those
 * may change between renders, because the one on the screenshot in the deck has
 * to be the one on stage.
 */

function draftOf(over: Partial<TripDraft> = {}): TripDraft {
  const field = <T>(value: T) => ({ value, source: "said" as const, why: "" });
  return {
    origin: field("STN"),
    destination: field("ADB"),
    departDate: field("2026-10-19"),
    returnDate: field<string | null>("2026-10-25"),
    party: field({ adults: 2, children: 1, infants: 0 }),
    package: field("saver" as const),
    checkedKg: field(25 as const),
    cabinBag: field(true),
    seating: field("together" as const),
    flexibility: field("none" as const),
    notes: [],
    ...over,
  };
}

describe("referenceFor", () => {
  it("is six characters and stable for the same trip", () => {
    const a = referenceFor(draftOf());
    const b = referenceFor(draftOf());
    expect(a).toHaveLength(6);
    expect(a).toBe(b);
  });

  it("leaves out the characters airlines leave out", () => {
    // I, O, 0 and 1 are too easy to read back wrong over the phone.
    for (const date of ["2026-10-19", "2026-11-02", "2027-01-30", "2026-12-24"]) {
      const ref = referenceFor(
        draftOf({ departDate: { value: date, source: "said", why: "" } }),
      );
      expect(ref).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });

  it("differs between a one way and a return of the same route", () => {
    const oneWay = referenceFor(
      draftOf({ returnDate: { value: null, source: "said", why: "" } }),
    );
    expect(oneWay).not.toBe(referenceFor(draftOf()));
  });
});

describe("seatsFor", () => {
  const flight = inventory("STN", "ADB", "2026-10-19")[0]!;

  it("gives nothing when no preference was expressed", () => {
    expect(seatsFor(flight, 3, "none")).toEqual([]);
  });

  it("seats a party together in one row, in consecutive letters", () => {
    const seats = seatsFor(flight, 3, "together");
    expect(seats).toHaveLength(3);
    const rows = new Set(seats.map((s) => s.slice(0, -1)));
    expect(rows.size).toBe(1);
    const letters = seats.map((s) => s.slice(-1).charCodeAt(0));
    expect(letters[1]! - letters[0]!).toBe(1);
    expect(letters[2]! - letters[1]!).toBe(1);
  });

  it("puts a window traveller at a window", () => {
    expect(seatsFor(flight, 1, "window")[0]!.slice(-1)).toMatch(/[AF]/);
  });

  it("puts an aisle traveller on an aisle", () => {
    expect(seatsFor(flight, 1, "aisle")[0]!.slice(-1)).toMatch(/[CD]/);
  });

  it("returns exactly one seat per traveller", () => {
    for (const people of [1, 2, 3, 4]) {
      expect(seatsFor(flight, people, "together")).toHaveLength(people);
    }
  });
});

describe("minusMinutes", () => {
  it("backs off the clock", () => {
    expect(minusMinutes("07:40", 30)).toBe("07:10");
    expect(minusMinutes("07:00", 30)).toBe("06:30");
  });

  it("wraps backwards through midnight rather than going negative", () => {
    expect(minusMinutes("00:10", 30)).toBe("23:40");
    expect(minusMinutes("00:00", 30)).toBe("23:30");
  });
});

describe("itineraryFor", () => {
  it("is identical on a second call", () => {
    expect(itineraryFor(draftOf())).toEqual(itineraryFor(draftOf()));
  });

  it("boards thirty minutes before departure", () => {
    const { out } = itineraryFor(draftOf());
    expect(out).not.toBeNull();
    expect(out!.boards).toBe(minusMinutes(out!.flight.departs, 30));
  });

  it("prices and prints the same flight", () => {
    // The pricer takes inventory(...)[0]; the pass must not take a different one
    // or the total belongs to a flight nobody can see.
    const { out } = itineraryFor(draftOf());
    expect(out!.flight.id).toBe(inventory("STN", "ADB", "2026-10-19")[0]!.id);
  });

  it("has no return leg for a one way", () => {
    const { back } = itineraryFor(
      draftOf({ returnDate: { value: null, source: "said", why: "" } }),
    );
    expect(back).toBeNull();
  });

  it("flies the return leg the other way round", () => {
    const { back } = itineraryFor(draftOf());
    expect(back).not.toBeNull();
    expect(back!.flight.origin).toBe("ADB");
    expect(back!.flight.destination).toBe("STN");
    expect(back!.flight.date).toBe("2026-10-25");
  });

  it("gives a gate that looks like a gate", () => {
    expect(itineraryFor(draftOf()).out!.gate).toMatch(/^[AB]\d{1,2}$/);
  });
});

describe("nights", () => {
  it("counts the nights away", () => {
    expect(nights(draftOf())).toBe(6);
  });

  it("is null for a one way", () => {
    expect(
      nights(draftOf({ returnDate: { value: null, source: "said", why: "" } })),
    ).toBeNull();
  });
});
