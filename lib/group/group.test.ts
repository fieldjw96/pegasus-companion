import { describe, expect, it } from "vitest";
import { FRIENDS, buildInviteeDraft, groupMembers, seatOffer } from "./group";
import { countBySource } from "@/lib/assistant/draft";
import { priceOf } from "@/lib/assistant/price";
import { FAMILY, heroDraft } from "@/lib/demo/hero";

/**
 * The invitee's booking is the claim of Part 2: built from the organiser's
 * flights and the invitee's own history, priced for one, with exactly one
 * thing the companion had to work out.
 */
describe("an invitee's booking", () => {
  const jack = heroDraft();
  const sam = FRIENDS[0]!;
  const draft = buildInviteeDraft(jack, sam);
  const names = FAMILY.travellers.map((t) => t.name);

  it("carries the organiser's route and dates, tagged as his", () => {
    for (const key of ["origin", "destination", "departDate", "returnDate"] as const) {
      expect(draft[key].value).toBe(jack[key].value);
      expect(draft[key].source).toBe("shared");
      expect(draft[key].from).toBe("Jack Field");
    }
  });

  it("counts 4 from Jack, 4 remembered, 1 predicted, seat aside", () => {
    expect(countBySource(draft, ["seating"])).toEqual({
      shared: 4,
      profile: 4,
      predicted: 1,
      said: 0,
    });
  });

  it("is LIGHT with a cabin bag for one, at 342.22", () => {
    expect(draft.package.value).toBe("light");
    expect(draft.checkedKg.value).toBe(0);
    expect(draft.cabinBag.value).toBe(true);
    expect(draft.cabinBag.uncertain).toBe(true);
    expect(draft.party.value).toEqual({ adults: 1, children: 0, infants: 0 });
    expect(priceOf(draft)).toBe(342.22);
  });

  it("offers the seat beside the family's block, 9.00 a leg", () => {
    const offer = seatOffer(jack, names);
    expect(offer?.seat).toBe("19C");
    expect(offer?.row).toBe(19);
    expect(offer?.perLeg).toBe(9);
    expect(offer?.total).toBe(18);
    expect(offer?.neighbours.map((n) => n.name)).toEqual(names);
    expect(priceOf(draft) + (offer?.total ?? 0)).toBeCloseTo(360.22, 2);
  });

  it("offers nothing when the organiser has no seats", () => {
    const noSeats = {
      ...jack,
      seating: { value: "none" as const, source: "said" as const, why: "" },
    };
    expect(seatOffer(noSeats, names)).toBeNull();
  });

  it("builds a stranger's booking as predictions rather than memories", () => {
    const tom = FRIENDS.find((f) => !f.account)!;
    const tomDraft = buildInviteeDraft(jack, tom);
    expect(tomDraft.package.source).toBe("predicted");
    expect(tomDraft.flexibility.source).toBe("predicted");
  });
});

describe("group status", () => {
  const invited = FRIENDS.map((f) => f.name);

  it("starts with only the organiser booked", () => {
    const members = groupMembers("Jack Field", invited, null);
    expect(members.filter((m) => m.status === "booked").map((m) => m.name)).toEqual([
      "Jack Field",
    ]);
    expect(members.find((m) => m.name === "Tom Baker")?.status).toBe("unopened");
  });

  it("marks the invitee booked, with their seat, once they have paid", () => {
    const members = groupMembers("Jack Field", invited, { name: "Sam Okonkwo", seat: "19C" });
    const sam = members.find((m) => m.name === "Sam Okonkwo");
    expect(sam?.status).toBe("booked");
    expect(sam?.seat).toBe("19C");
    expect(members.filter((m) => m.status === "booked")).toHaveLength(2);
  });
});
