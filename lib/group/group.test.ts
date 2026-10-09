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
import { JESS, jessDraft } from "@/lib/demo/personas";

/**
 * The invitee's booking is the claim of the group beats: built from the
 * organiser's flights and whatever Pegasus already knows about the invitee,
 * priced for one, with the seat beside the organiser held.
 */
describe("Archie's booking", () => {
  const jess = jessDraft();
  const me = JESS.travellers[0]!.name;
  const archie = FRIENDS[0]!;
  const draft = buildInviteeDraft(jess, archie, me);

  it("carries Jess's route, stops and dates, tagged as hers", () => {
    for (const key of [
      "origin",
      "destination",
      "stops",
      "departDate",
      "returnDate",
    ] as const) {
      expect(draft[key].value).toEqual(jess[key].value);
      expect(draft[key].source).toBe("shared");
      expect(draft[key].from).toBe(me);
    }
  });

  it("counts 5 from Jess, 2 remembered, 4 predicted", () => {
    expect(countBySource(draft)).toEqual({ shared: 5, profile: 2, predicted: 4, said: 0 });
  });

  it("is held in 14B, next to Jess, on every leg", () => {
    expect(seatBeside(jess, archie, me)).toBe("14B");
    const itinerary = itineraryFor(draft, archie.name);
    expect(itinerary.legs.map((l) => l.seats[0])).toEqual(["14B", "14B", "14B", "14B"]);
    expect(itinerary.reference).toBe("M2PR8V");
  });

  it("has the hot meal already in the basket, and pays only for himself", () => {
    const extras = inviteeExtras(jess, archie, me);
    expect(extras.map((e) => e.label)).toEqual(["Hot meal, Pegasus Café"]);
    const total = withLines(breakdown(draft), extras).total;
    expect(total).toBe(priceOf(jess) + 26);
  });
});

describe("Will's booking", () => {
  const jess = jessDraft();
  const me = JESS.travellers[0]!.name;
  const will = FRIENDS[1]!;

  it("is built from Jess alone, with nothing remembered", () => {
    const draft = buildInviteeDraft(jess, will, me);
    expect(countBySource(draft).profile).toBe(0);
    expect(seatBeside(jess, will, me)).toBe("14C");
    expect(inviteeExtras(jess, will, me)).toEqual([]);
    expect(itineraryFor(draft, will.name).reference).toBe("X7K2PQ");
  });
});

describe("the squad", () => {
  const invited = FRIENDS.map((f) => f.name);

  it("starts with only Jess booked, Archie opened, Will unopened", () => {
    const members = groupMembers("Jess Carter", "14A", invited, {});
    expect(members.map((m) => m.status)).toEqual(["booked", "opened", "unopened"]);
  });

  it("fills in as people pay, with their seats", () => {
    const members = groupMembers("Jess Carter", "14A", invited, {
      "Archie Bell": "14B",
      "Will Parker": "14C",
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
    expect(listNames(["Archie Bell", "Will Parker", "Sam Reed"])).toBe("Archie, Will and Sam");
  });
});
