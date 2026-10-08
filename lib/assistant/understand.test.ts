import { describe, expect, it } from "vitest";
import { amendDraft, bestWeekIn, buildDraft, extract, stopsFor } from "./understand";
import { WILL_PROMPT } from "@/lib/demo/personas";
import { PROFILES, profileById } from "./profiles";
import { visibleKeys } from "./draft";

/**
 * The sentence is the one input in the app, so what it hears has to be
 * exactly what the ticket prints. These assert the demo's own opening line,
 * word by word, and the cold-start rule that nothing not said is "remembered".
 */
const WILL = profileById("will");
const EMRE = profileById("emre");

describe("extract", () => {
  it("hears the demo's opening sentence", () => {
    const said = extract("Balloons in Cappadocia with 2 mates, backpacking, a week in May");
    expect(said.destination).toBe("ASR");
    expect(said.companions).toBe(2);
    expect(said.tripType).toBe("backpacking");
    expect(said.nights).toBe(7);
    expect(said.month).toBe(4);
    expect(said.departDate).toBeNull();
    expect(said.origin).toBeNull();
  });

  it("picks origin and destination out of a sentence", () => {
    const said = extract("Stansted to Izmir on 19 October, back on the 25th, checking a bag");
    expect(said.origin).toBe("STN");
    expect(said.destination).toBe("ADB");
    expect(said.departDate?.slice(5)).toBe("10-19");
    expect(said.returnDate?.slice(5)).toBe("10-25");
    expect(said.checkedBag).toBe(true);
  });

  it("treats the airport after 'to' as the destination, whichever came first", () => {
    const said = extract("I want to fly to Berlin from London");
    expect(said.origin).toBe("STN");
    expect(said.destination).toBe("BER");
  });

  it("hears mates in words and in digits", () => {
    expect(extract("Istanbul with three friends in June").companions).toBe(3);
    expect(extract("me and the lads to Antalya").companions).toBe(2);
    expect(extract("Berlin alone in March").companions).toBeNull();
  });

  it("rolls a bare return day into the next month when it has passed", () => {
    const said = extract("London to Berlin on 28 November, back on the 2nd");
    expect(said.returnDate?.slice(5)).toBe("12-02");
  });

  it("distinguishes wanting a bag from refusing one", () => {
    expect(extract("hand luggage only to Rome").checkedBag).toBe(false);
    expect(extract("checking a bag to Rome").checkedBag).toBe(true);
    expect(extract("to Rome").checkedBag).toBeNull();
  });

  it("recognises a discovery prompt and keeps the descriptors", () => {
    const said = extract("Somewhere warm in October, under £600, nothing too long");
    expect(said.discovery).toBe(true);
    expect(said.budget).toBe(600);
    expect(said.vibes).toContain("warm");
  });
});

describe("the best week in a month", () => {
  it("starts on the second Saturday", () => {
    const iso = bestWeekIn(4);
    const d = new Date(`${iso}T00:00:00Z`);
    expect(d.getUTCMonth()).toBe(4);
    expect(d.getUTCDay()).toBe(6);
    expect(d.getUTCDate()).toBeGreaterThanOrEqual(8);
    expect(d.getUTCDate()).toBeLessThanOrEqual(14);
  });
});

describe("the route for a week in Cappadocia", () => {
  it("runs in through Istanbul, three nights for the balloons, out via the coast", () => {
    const route = stopsFor("ASR", 7, "backpacking");
    expect(route?.stops).toEqual([
      { code: "SAW", nights: 2 },
      { code: "ASR", nights: 3 },
      { code: "AYT", nights: 2 },
    ]);
  });

  it("re-ranks as a city break: Istanbul first, home from Kayseri", () => {
    const route = stopsFor("ASR", 7, "cityBreak");
    expect(route?.stops).toEqual([
      { code: "SAW", nights: 4 },
      { code: "ASR", nights: 3 },
    ]);
  });

  it("is not a multi-stop trip anywhere else", () => {
    expect(stopsFor("ADB", 7, null)).toBeNull();
    expect(stopsFor("ASR", 3, null)).toBeNull();
  });
});

describe("Will's week, built from the opening sentence", () => {
  const draft = buildDraft("Balloons in Cappadocia, backpacking, a week in May", WILL);

  it("is Stansted to Cappadocia for a week, in May, with the route predicted", () => {
    expect(draft.origin.value).toBe("STN");
    expect(draft.origin.source).toBe("predicted");
    expect(draft.destination.source).toBe("said");
    expect(draft.departDate.value.slice(5, 7)).toBe("05");
    expect(draft.stops.value.map((s) => s.code)).toEqual(["SAW", "ASR", "AYT"]);
    expect(draft.returnDate.source).toBe("said");
  });

  it("puts the bag in the fare because of the backpack, with a reason", () => {
    expect(draft.package.value).toBe("saver");
    expect(draft.package.why).toContain("40L backpack");
    expect(draft.checkedKg.value).toBe(25);
  });

  it("predicts the window with a reason that names the departure", () => {
    expect(draft.seating.value).toBe("window");
    expect(draft.seating.why).toContain("06:10");
    expect(draft.seating.uncertain).toBe(true);
  });

  it("remembers nothing on a cold start: everything not said is predicted", () => {
    for (const key of visibleKeys(draft)) {
      expect(["said", "predicted"]).toContain(draft[key].source);
    }
  });

  it("explains itself in a full sentence on every inferred field", () => {
    for (const profile of PROFILES) {
      const d = buildDraft("Izmir in October", profile);
      for (const key of visibleKeys(d)) {
        if (d[key].source === "said") continue;
        expect(d[key].why.length).toBeGreaterThan(10);
        expect(d[key].why.endsWith(".")).toBe(true);
      }
    }
  });
});

describe("a warm start", () => {
  it("remembers the fare, bag and seat rather than guessing them", () => {
    const draft = buildDraft("Trabzon on 12 June, back on the 14th", EMRE);
    expect(draft.package.source).toBe("profile");
    expect(draft.checkedKg.source).toBe("profile");
    expect(draft.flexibility.source).toBe("profile");
    expect(draft.flexibility.why).toBe(EMRE.habits.flexibilityReason);
  });

  it("never lets a profile override something the passenger said", () => {
    const draft = buildDraft("Trabzon on 12 June, hand luggage only", EMRE);
    expect(draft.checkedKg.value).toBe(0);
    expect(draft.checkedKg.source).toBe("said");
  });
});

describe("a change said in a sentence", () => {
  const amend = amendDraft;
  const week = () => buildDraft(WILL_PROMPT, WILL);

  it("moves the dates and keeps the week, the route and the bag", () => {
    const out = amend(week(), "Make it the 20th instead");
    expect(out?.changed).toEqual(["departDate", "returnDate"]);
    expect(out?.draft.departDate.value.slice(8)).toBe("20");
    expect(out?.draft.departDate.source).toBe("said");
    expect(out?.draft.stops.value).toEqual(week().stops.value);
    expect(out?.draft.checkedKg.value).toBe(25);
  });

  it("drops the bag and the fare with it, leaving everything else alone", () => {
    const out = amend(week(), "no bag, aisle seat");
    expect(out?.changed).toEqual(["checkedKg", "package", "seating"]);
    expect(out?.draft.package.value).toBe("light");
    expect(out?.draft.seating.value).toBe("aisle");
    expect(out?.draft.departDate).toEqual(week().departDate);
  });

  it("is a new trip, not a change, when a place is named", () => {
    expect(amend(week(), "Istanbul for the weekend")).toBeNull();
    expect(amend(week(), "somewhere warm")).toBeNull();
  });
});
