import { dayMonth, longDate, shift, shortDate } from "@/lib/demo/personas";

/**
 * Jamie version: when Will books and the squad's evenings happen, worked out
 * from the trip rather than pinned to a March that only fits a May trip.
 *
 * Will books about nine weeks out (66 days, which puts the scripted May week's
 * booking on 3 March), or today if the trip is sooner. The waiting window is
 * the next evening and Tom stalls the morning after.
 */
export const BOOKING_LEAD_DAYS = 66;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function inviteWhen(departIso: string) {
  const lead = shift(departIso, -BOOKING_LEAD_DAYS);
  const today = todayIso();
  const sent = lead > today ? lead : today < departIso ? today : shift(departIso, -3);
  const waiting = shift(sent, 1);
  const stalls = shift(sent, 2);
  return {
    sentIso: sent,
    sentAt: `${shortDate(sent)}, 18:30`,
    sentLong: longDate(sent),
    waitingIso: waiting,
    waitingLong: longDate(waiting),
    waitingShort: `${dayMonth(waiting)}, 20:14`,
    stallsIso: stalls,
    stallsLong: longDate(stalls),
    stallsShort: `${dayMonth(stalls)}, 09:15`,
  };
}
