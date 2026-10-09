import { describe, expect, it } from "vitest";
import {
  MOMENT,
  QUIET_STATE,
  buildMoment,
  checkMorning,
  fridayBefore,
  mornings,
  nudgeDate,
  reminderDate,
  usualTrip,
} from "./moments";
import { profileById } from "@/lib/assistant/profiles";
import { shift } from "@/lib/demo/personas";

/**
 * The gates. Each alone keeps the companion quiet, and a change that makes it
 * speak more often is a regression unless the brief says otherwise.
 */
describe("the moment", () => {
  it("is the Friday before the birthday, two nights", () => {
    const m = buildMoment("2027-06-14");
    expect(m.out).toBe("2027-06-11");
    expect(m.back).toBe("2027-06-13");
    expect(fridayBefore("2027-06-11")).toBe("2027-06-04");
  });

  it("nudges on 14 April, two months out", () => {
    expect(nudgeDate(buildMoment("2027-06-14"))).toBe("2027-04-14");
    expect(reminderDate(buildMoment("2027-06-14"))).toBe("2027-05-28");
  });
});

describe("a morning's check", () => {
  it("is silent on an ordinary morning", () => {
    const m = checkMorning(MOMENT, shift(nudgeDate(MOMENT), -3));
    expect(m.verdict).toBe("silent");
    expect(m.quiet).toBe("Not the moment.");
  });

  it("speaks two months out, with reasons a passenger can check", () => {
    const m = checkMorning(MOMENT, nudgeDate(MOMENT));
    expect(m.verdict).toBe("nudge");
    expect(m.why[0]).toContain("last year and the year before");
    expect(m.why[1]).toContain("rising from late May");
    expect(m.why[2]).toContain("seat 3A");
  });

  it("stays silent the morning after, because it already spoke", () => {
    expect(checkMorning(MOMENT, shift(nudgeDate(MOMENT), 1)).verdict).toBe("silent");
  });

  it("reminds once in late May if nothing is booked, and not if it is", () => {
    expect(checkMorning(MOMENT, reminderDate(MOMENT)).verdict).toBe("remind");
    expect(
      checkMorning(MOMENT, reminderDate(MOMENT), { ...QUIET_STATE, booked: true }).verdict,
    ).toBe("silent");
  });

  it("is silent for the year after 'not this year', and for good after 'never'", () => {
    expect(
      checkMorning(MOMENT, nudgeDate(MOMENT), { ...QUIET_STATE, declined: true }).verdict,
    ).toBe("silent");
    expect(
      checkMorning(MOMENT, nudgeDate(MOMENT), { ...QUIET_STATE, never: true }).quiet,
    ).toBe("Told never to suggest this.");
  });

  it("is silent once the interruption budget is spent", () => {
    expect(
      checkMorning(MOMENT, nudgeDate(MOMENT), { ...QUIET_STATE, spoken: 3 }).verdict,
    ).toBe("silent");
  });

  it("speaks once between 1 March and the day after the nudge", () => {
    const history = mornings(MOMENT, shift(nudgeDate(MOMENT), 1));
    expect(history.filter((m) => m.verdict !== "silent").map((m) => m.date)).toEqual([
      nudgeDate(MOMENT),
    ]);
  });
});

describe("the usual trip", () => {
  it("remembers everything but the return, which it flags", () => {
    const draft = usualTrip(profileById("emre"));
    expect(draft.returnDate.source).toBe("predicted");
    expect(draft.returnDate.uncertain).toBe(true);
    expect(draft.departDate.value).toBe(MOMENT.out);
    expect(draft.package.source).toBe("profile");
  });
});
