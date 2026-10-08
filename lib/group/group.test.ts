import { describe, expect, it } from "vitest";
import {
  FRIENDS,
  buildInviteeDraft,
  groupMembers,
  inviteeExtras,
  listNames,
  searchContacts,
  seatBeside,
} from "./group";
import { countBySource } from "@/lib/assistant/draft";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { breakdown, priceOf, withLines } from "@/lib/assistant/price";
import { WILL, willDraft } from "@/lib/demo/personas";

/**
 * The invitee's booking is the claim of the group beats: built from the
 * organiser's flights and whatever Pegasus already knows about the invitee,
 * priced for one, with the seat beside the organiser held.
 */
describe("Archie's booking", () => {
  const will = willDraft();
  const me = WILL.travellers[0]!.name;
  const archie = FRIENDS[0]!;
  const draft = buildInviteeDraft(will, archie, me);

  it("carries Will's route, stops and dates, tagged as his", () => {
    for (const key of [
      "origin",
      "destination",
      "stops",
      "departDate",
      "returnDate",
    ] as const) {
      expect(draft[key].value).toEqual(will[key].value);
      expect(draft[key].source).toBe("shared");
      expect(draft[key].from).toBe(me);
    }
  });

  it("counts 5 from Will, 2 remembered, 4 predicted", () => {
    expect(countBySource(draft)).toEqual({ shared: 5, profile: 2, predicted: 4, said: 0 });
  });

  it("is held in 14B, next to Will, on every leg", () => {
    expect(seatBeside(will, archie, me)).toBe("14B");
    const itinerary = itineraryFor(draft, archie.name);
    expect(itinerary.legs.map((l) => l.seats[0])).toEqual(["14B", "14B", "14B", "14B"]);
    expect(itinerary.reference).toBe("M2PR8V");
  });

  it("has the hot meal already in the basket, and pays only for himself", () => {
    const extras = inviteeExtras(will, archie, me);
    expect(extras.map((e) => e.label)).toEqual(["Hot meal, Pegasus Café"]);
    const total = withLines(breakdown(draft), extras).total;
    expect(total).toBe(priceOf(will) + 26);
  });
});

describe("Jess's booking", () => {
  const will = willDraft();
  const me = WILL.travellers[0]!.name;
  const jess = FRIENDS[1]!;

  it("is built from Will alone, with nothing remembered", () => {
    const draft = buildInviteeDraft(will, jess, me);
    expect(countBySource(draft).profile).toBe(0);
    expect(seatBeside(will, jess, me)).toBe("14C");
    expect(inviteeExtras(will, jess, me)).toEqual([]);
    expect(itineraryFor(draft, jess.name).reference).toBe("X7K2PQ");
  });
});

describe("the squad", () => {
  const invited = FRIENDS.map((f) => f.name);

  it("starts with only Will booked, Archie opened, Jess unopened", () => {
    const members = groupMembers("Will Parker", "14A", invited, {});
    expect(members.map((m) => m.status)).toEqual(["booked", "opened", "unopened"]);
  });

  it("fills in as people pay, with their seats", () => {
    const members = groupMembers("Will Parker", "14A", invited, {
      "Archie Bell": "14B",
      "Jess Carter": "14C",
    });
    expect(members.every((m) => m.status === "booked")).toBe(true);
    expect(members.map((m) => m.seat)).toEqual(["14A", "14B", "14C"]);
  });
});

describe("the contact search", () => {
  it("finds by the start of a name, never the two suggestions, and nothing for nothing", () => {
    expect(searchContacts("").length).toBe(0);
    expect(searchContacts("sa").map((c) => c.name)).toEqual(["Sam Reed"]);
    expect(searchContacts("re").map((c) => c.name)).toEqual(["Sam Reed"]);
    expect(searchContacts("arch").length).toBe(0);
    expect(listNames(["Archie Bell", "Jess Carter", "Sam Reed"])).toBe("Archie, Jess and Sam");
  });
});
