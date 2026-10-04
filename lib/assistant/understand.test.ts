import { describe, expect, it } from "vitest";
import { buildDraft, extract } from "./understand";
import { PROFILES, profileById } from "./profiles";
import { FIELD_ORDER } from "./draft";

const family = profileById("family")!;
const business = profileById("business")!;
const weekend = profileById("weekend")!;

describe("reading a prompt", () => {
  it("picks origin and destination out of a sentence", () => {
    const said = extract("Stansted to Izmir on 19 October");
    expect(said.origin).toBe("STN");
    expect(said.destination).toBe("ADB");
  });

  it("treats the airport after 'to' as the destination, whichever came first", () => {
    const said = extract("I want to fly to Berlin from London");
    expect(said.destination).toBe("BER");
    expect(said.origin).toBe("STN");
  });

  it("accepts bare IATA codes", () => {
    const said = extract("STN to AYT");
    expect(said.origin).toBe("STN");
    expect(said.destination).toBe("AYT");
  });

  it("reads two dates as out and back", () => {
    const said = extract("19 October to 25 October");
    expect(said.departDate?.endsWith("-10-19")).toBe(true);
    expect(said.returnDate?.endsWith("-10-25")).toBe(true);
  });

  it("derives the return from a night count", () => {
    const said = extract("Berlin on 3 November for 2 nights");
    expect(said.nights).toBe(2);
    expect(said.returnDate?.endsWith("-11-05")).toBe(true);
  });

  it("hears a budget", () => {
    expect(extract("somewhere warm under £600").budget).toBe(600);
    expect(extract("max 250 please").budget).toBe(250);
  });

  it("distinguishes wanting a bag from refusing one", () => {
    expect(extract("checking a bag").checkedBag).toBe(true);
    expect(extract("hand luggage only").checkedBag).toBe(false);
    expect(extract("just a flight").checkedBag).toBeNull();
  });

  it("recognises a discovery prompt and keeps the descriptors", () => {
    const said = extract("somewhere warm and cheap in October");
    expect(said.discovery).toBe(true);
    expect(said.vibes).toContain("warm");
    expect(said.vibes).toContain("cheap");
  });

  it("does not treat a named destination as discovery", () => {
    expect(extract("warm week in Antalya").discovery).toBe(false);
  });
});

describe("filling the gaps", () => {
  it("marks what the passenger said as said", () => {
    const draft = buildDraft("Stansted to Izmir on 19 October", family);
    expect(draft.origin.source).toBe("said");
    expect(draft.destination.source).toBe("said");
    expect(draft.departDate.source).toBe("said");
  });

  it("takes the party from the profile, never from the prompt", () => {
    const draft = buildDraft("Stansted to Izmir", family);
    expect(draft.party.source).toBe("profile");
    expect(draft.party.value).toEqual({ adults: 2, children: 1, infants: 0 });
  });

  it("never lets a profile override something the passenger said", () => {
    // Family normally checks a bag; saying otherwise must win.
    const draft = buildDraft("Izmir, hand luggage only", family);
    expect(draft.checkedKg.source).toBe("said");
    expect(draft.checkedKg.value).toBe(0);
  });

  it("gives every predicted field a reason", () => {
    const draft = buildDraft("Izmir", business);
    for (const key of ["package", "seating", "flexibility", "checkedKg"] as const) {
      expect(draft[key].why.length, key).toBeGreaterThan(15);
    }
  });

  it("flags the fields it is least sure about", () => {
    const draft = buildDraft("somewhere nice", family);
    expect(draft.departDate.uncertain).toBe(true);
    expect(draft.destination.uncertain).toBe(true);
  });
});

describe("the prediction that saves money", () => {
  /*
   * The weekend profile habitually books LIGHT. Someone who says they are
   * checking a bag must not be predicted into LIGHT, because adding the bag
   * afterwards costs up to 59.00 against 30.00 for SAVER on the same screen.
   */
  it("upgrades off LIGHT when a hold bag was mentioned", () => {
    const draft = buildDraft("Berlin, checking a bag", weekend);
    expect(draft.package.value).not.toBe("light");
    expect(draft.package.value).toBe("saver");
    expect(draft.package.why).toContain("59.00");
  });

  it("leaves LIGHT alone when no bag is needed", () => {
    const draft = buildDraft("Berlin for the weekend", weekend);
    expect(draft.package.value).toBe("light");
  });

  it("says why the baggage is in the fare rather than added later", () => {
    const draft = buildDraft("Izmir, checking a bag", weekend);
    expect(draft.notes.join(" ")).toContain("30.00");
  });

  it("reserves a seat beside an adult when a child is travelling", () => {
    const draft = buildDraft("Izmir in October", family);
    expect(draft.seating.value).toBe("together");
    expect(draft.notes.join(" ")).toContain("Mila");
  });
});

describe("every profile produces a usable draft", () => {
  it("fills every field whatever the prompt", () => {
    for (const profile of PROFILES) {
      const draft = buildDraft("a trip", profile);
      expect(draft.origin.value.length).toBe(3);
      expect(draft.destination.value.length).toBe(3);
      expect(draft.party.value.adults).toBeGreaterThanOrEqual(1);
      expect(draft.departDate.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("reasons belong to the trip they are shown on", () => {
  /**
   * A shipped bug, caught only by looking at a screenshot: every profile that
   * chose a changeable fare explained it with one hardcoded sentence about work
   * trips, so a family holiday justified itself with "your work trips get
   * changed often enough". On a screen whose whole claim is that it shows its
   * reasoning, a reason belonging to somebody else's trip is worse than silence.
   */
  it("gives each profile its own flexibility reason", () => {
    for (const profile of PROFILES) {
      const draft = buildDraft("Izmir in October", profile);
      expect(draft.flexibility.why).toBe(profile.habits.flexibilityReason);
    }
  });

  it("never mentions work on a trip that is not for work", () => {
    for (const profile of PROFILES.filter((p) => p.id !== "business")) {
      const draft = buildDraft("Izmir in October", profile);
      expect(draft.flexibility.why.toLowerCase()).not.toContain("work");
    }
  });

  it("explains itself in a full sentence on every inferred field", () => {
    // An empty reason renders as a blank line under a value the passenger did
    // not choose, which is the worst of both: visibly inferred, unexplained.
    for (const profile of PROFILES) {
      const draft = buildDraft("Izmir in October", profile);
      for (const key of FIELD_ORDER) {
        if (draft[key].source === "said") continue;
        expect(draft[key].why.length).toBeGreaterThan(10);
        expect(draft[key].why.endsWith(".")).toBe(true);
      }
    }
  });
});
