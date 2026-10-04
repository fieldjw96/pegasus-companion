"use client";

import { useState } from "react";
import { DestinationPhoto } from "./destination-photo";
import { PegasusSays } from "./pegasus-avatar";
import { TripCard } from "./trip-card";
import { countBySource, type TripDraft } from "@/lib/assistant/draft";
import { itineraryFor, nights, type Leg } from "@/lib/assistant/itinerary";
import { breakdown, naivePath } from "@/lib/assistant/price";
import { AIRPORTS, FARE_RULES, formatDuration, formatFare } from "@/lib/journey/flights";

/**
 * The assembled trip, printed as a ticket.
 *
 * The argument of this screen is that a finished booking is an object, not a
 * summary. A list of key-value rows reads as "here is the form I filled in for
 * you"; a ticket reads as "you are going". Same data, and only one of them
 * makes a person feel booked.
 *
 * So the pass shows what a pass shows — flight number, times, gate, seat,
 * boarding, reference, a barcode — and nothing else. Everything the assistant
 * wants to justify lives one tap down, behind two controls on the stub:
 *
 * - **Full breakdown** itemises the price, including what the fare already
 *   covered, so no line on the ticket is a number without an origin.
 * - **Change anything** is the provenance list, every field editable in place.
 *
 * A dotted underline on the pass means the assistant filled that value in.
 * Tapping it opens the change panel. That is the only legend this screen needs,
 * and it is the one idea worth carrying over from the boarding-pass direction.
 */

type Panel = "none" | "breakdown" | "change";

export function Ticket({
  draft,
  onChange,
  travellerNames,
  onCheckout,
}: {
  draft: TripDraft;
  onChange: (next: TripDraft) => void;
  travellerNames: string[];
  onCheckout: () => void;
}) {
  const [panel, setPanel] = useState<Panel>("none");

  const itinerary = itineraryFor(draft);
  const price = breakdown(draft);
  const saving = naivePath(draft);
  const counts = countBySource(draft);
  const inferred = counts.profile + counts.predicted;
  const away = nights(draft);

  const people = draft.party.value.adults + draft.party.value.children;
  const named = travellerNames.slice(0, people);
  const extra = people - named.length;

  function toggle(next: Exclude<Panel, "none">): void {
    setPanel((current) => (current === next ? "none" : next));
  }

  return (
    <div>
      <PegasusSays>
        {inferred === 0 ? (
          <>Here is your ticket. Everything on it came from you.</>
        ) : (
          <>
            Here is your ticket. You told me {counts.said}{" "}
            {counts.said === 1 ? "thing" : "things"}; the {inferred} with a dotted line
            underneath are mine. Tap one to see why.
          </>
        )}
        {saving !== null && (
          <>
            {" "}
            <span className="font-semibold">
              Buying it this way is {formatFare(saving.saved)} GBP cheaper
            </span>{" "}
            than taking the cheapest fare and adding the same bag later.
          </>
        )}
      </PegasusSays>

      <section className="pg-ticket mt-4">
        <div className="relative h-32 overflow-hidden rounded-t-[1.25rem]">
          <DestinationPhoto
            code={draft.destination.value}
            className="absolute inset-0 h-full w-full"
            priority
          />
          <div className="relative flex h-full flex-col justify-between p-4">
            <div className="flex items-start justify-between">
              <span className="wordmark text-[17px] text-white">PEGASUS</span>
              <span className="text-right">
                <span className="block text-[9px] font-bold tracking-widest text-white/70 uppercase">
                  Booking
                </span>
                <span className="block font-mono text-[14px] font-bold text-white">
                  {itinerary.reference}
                </span>
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold tracking-widest text-white/80 uppercase">
                {away === null ? "One way" : `${away} night${away === 1 ? "" : "s"}`}
              </span>
              <span className="block text-[27px] leading-none font-bold text-white drop-shadow">
                {cityOf(draft.destination.value)}
              </span>
            </div>
          </div>
        </div>

        {itinerary.out === null ? (
          <p className="px-5 py-6 text-[14px] text-pg-ink">
            No flight on this route that day. Change the date below.
          </p>
        ) : (
          <>
            <RouteRow
              leg={itinerary.out}
              from={draft.origin.value}
              to={draft.destination.value}
            />

            <dl className="grid grid-cols-3 gap-x-3 gap-y-3.5 px-5 pt-4">
              <Slot label="Passenger" wide>
                <span className="block truncate">
                  {named[0] ?? "Passenger"}
                  {named.length + extra > 1 && (
                    <span className="font-normal text-pg-ink">
                      {" "}
                      +{named.length + extra - 1}
                    </span>
                  )}
                </span>
              </Slot>
              <Slot
                label="Seat"
                inferred={draft.seating.source !== "said"}
                onEdit={() => setPanel("change")}
              >
                {itinerary.out.seats.length === 0
                  ? "At check-in"
                  : itinerary.out.seats.join(" ")}
              </Slot>
              <Slot label="Gate">{itinerary.out.gate}</Slot>
              <Slot label="Boards">{itinerary.out.boards}</Slot>
              <Slot
                label="Fare"
                inferred={draft.package.source !== "said"}
                onEdit={() => setPanel("change")}
              >
                {FARE_RULES[draft.package.value].label}
              </Slot>
              {/* Two columns wide: "25 kg + cabin" does not fit in one, and a
                  truncated baggage allowance on a ticket is worse than none. */}
              <Slot
                label="Baggage"
                wide
                inferred={draft.checkedKg.source !== "said"}
                onEdit={() => setPanel("change")}
              >
                {baggageOf(draft)}
              </Slot>
              <Slot
                label="Changes"
                inferred={draft.flexibility.source !== "said"}
                onEdit={() => setPanel("change")}
              >
                {FLEXIBILITY[draft.flexibility.value]}
              </Slot>
            </dl>

            {itinerary.back !== null && (
              <div className="mt-4 border-t border-dashed border-pg-line">
                <RouteRow
                  leg={itinerary.back}
                  from={draft.destination.value}
                  to={draft.origin.value}
                  returning
                />
              </div>
            )}
          </>
        )}

        {/* Perforation. The notches are punched out of the card in the colour of
            the surface behind it, which is the cheapest convincing trick there
            is for making a rectangle read as a ticket. */}
        <div className="relative mt-5">
          <span className="pg-notch -left-[13px]" />
          <span className="pg-notch -right-[13px]" />
          <span className="block border-t-2 border-dashed border-pg-line" />
        </div>

        <div className="flex items-center gap-4 px-5 pt-4">
          <span className="pg-barcode" aria-hidden>
            {bars(itinerary.reference).map((width, i) => (
              <span key={i} style={{ width: `${width}px` }} />
            ))}
          </span>
          <span className="ml-auto text-right">
            <span className="block text-[10px] font-bold tracking-widest text-pg-ink uppercase">
              Total
            </span>
            <span className="block text-[21px] leading-tight font-bold">
              {formatFare(price.total)}
              <span className="text-[13px] font-semibold text-pg-ink"> GBP</span>
            </span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-b-[1.25rem] bg-pg-line">
          <Control on={panel === "breakdown"} onClick={() => toggle("breakdown")}>
            Full breakdown
          </Control>
          <Control on={panel === "change"} onClick={() => toggle("change")}>
            Change anything
          </Control>
        </div>
      </section>

      {panel === "breakdown" && (
        <section className="pg-card mt-3 p-5">
          <h3 className="text-[16px] font-bold">
            What makes up {formatFare(price.total)} GBP
          </h3>
          <ul className="mt-3 divide-y divide-pg-line">
            {price.lines.map((line) => (
              <li key={line.label} className="flex items-start gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold">{line.label}</span>
                  <span className="block text-[12px] text-pg-ink">{line.detail}</span>
                </span>
                <span className="shrink-0 pt-0.5 text-[15px] font-semibold tabular-nums">
                  {formatFare(line.amount)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex items-baseline justify-between border-t-2 border-pg-navy/15 pt-3">
            <span className="text-[15px] font-bold">Total</span>
            <span className="text-[19px] font-bold tabular-nums">
              {formatFare(price.total)} GBP
            </span>
          </div>

          <div className="mt-5 rounded-2xl bg-pg-surface p-4">
            <p className="text-[12px] font-bold tracking-wider text-pg-ink uppercase">
              Already in your {FARE_RULES[draft.package.value].label} fare
            </p>
            <ul className="mt-2 space-y-1.5">
              {price.included.map((item) => (
                <li key={item} className="flex gap-2 text-[13px] leading-snug">
                  <span className="text-[#19A34A]">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {saving !== null && (
            <p className="mt-4 text-[13px] leading-snug text-pg-navy">
              The same trip bought the long way — cheapest fare first, then this bag on the
              baggage screen — comes to{" "}
              <span className="font-semibold">{formatFare(saving.paid)} GBP</span>. The
              allowance costs less inside the fare than it does on its own, and the app only
              ever tells you the second price.
            </p>
          )}
        </section>
      )}

      {panel === "change" && (
        <div className="mt-3">
          <TripCard draft={draft} onChange={onChange} total={price.total} showHeader={false} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-pg-line bg-white/95 px-4 pt-3 pb-5 backdrop-blur">
        <div className="mx-auto flex max-w-[358px] items-center gap-3">
          <span className="flex-1">
            <span className="block text-[12px] text-pg-ink">
              {people} travelling{away === null ? "" : `, ${away} nights`}
            </span>
            <span className="block text-[20px] font-bold">{formatFare(price.total)} GBP</span>
          </span>
          <button
            type="button"
            onClick={onCheckout}
            className="rounded-full bg-pg-yellow px-7 py-3.5 text-[16px] font-bold text-pg-navy"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

/** One leg: codes, times, duration, and the flight that operates it. */
function RouteRow({
  leg,
  from,
  to,
  returning = false,
}: {
  leg: Leg;
  from: string;
  to: string;
  returning?: boolean;
}) {
  return (
    <div className="px-5 pt-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[26px] leading-none font-bold">{from}</span>
          <span className="mt-1 block text-[15px] leading-none font-semibold">
            {leg.flight.departs}
          </span>
          <span className="mt-1 block truncate text-[11px] text-pg-ink">{nameOf(from)}</span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col items-center pt-1.5">
          <span className="text-[11px] whitespace-nowrap text-pg-ink">
            {formatDuration(leg.flight.durationMinutes)}
          </span>
          <span className="mt-1 flex w-full items-center gap-1">
            <span className="h-1 w-1 shrink-0 rounded-full bg-pg-line" />
            <span className="h-px flex-1 border-t border-dashed border-pg-line" />
            <span
              className={`shrink-0 text-[13px] text-pg-yellow ${returning ? "pg-flip" : ""}`}
            >
              ✈
            </span>
          </span>
          <span className="mt-1 text-[11px] whitespace-nowrap text-pg-ink">
            {leg.flight.via === null ? leg.flight.flightNo : `via ${leg.flight.via}`}
          </span>
        </span>

        <span className="min-w-0 text-right">
          <span className="block text-[26px] leading-none font-bold">{to}</span>
          <span className="mt-1 block text-[15px] leading-none font-semibold">
            {leg.flight.arrives}
            {leg.flight.arrivesNextDay && (
              <span className="align-super text-[10px] text-pg-ink">+1</span>
            )}
          </span>
          <span className="mt-1 block truncate text-[11px] text-pg-ink">{nameOf(to)}</span>
        </span>
      </div>
      <p className="mt-2.5 text-[11px] font-semibold tracking-wide text-pg-ink uppercase">
        {returning ? "Return" : "Outbound"} · {pretty(leg.flight.date)} · {leg.flight.aircraft}
      </p>
    </div>
  );
}

/**
 * One printed field.
 *
 * A dotted underline, and only that, says the assistant chose the value. No
 * badge, no colour-coded legend: the mark is on the value itself and tapping it
 * opens the panel that explains it.
 */
function Slot({
  label,
  children,
  inferred = false,
  wide = false,
  onEdit,
}: {
  label: string;
  children: React.ReactNode;
  inferred?: boolean;
  wide?: boolean;
  onEdit?: () => void;
}) {
  const value = (
    <span
      className={`block truncate text-[15px] font-bold ${
        inferred
          ? "underline decoration-pg-yellow decoration-dotted decoration-2 underline-offset-4"
          : ""
      }`}
    >
      {children}
    </span>
  );

  return (
    <div className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-[9px] font-bold tracking-widest text-pg-ink uppercase">{label}</dt>
      <dd className="mt-0.5 min-w-0">
        {onEdit === undefined ? (
          value
        ) : (
          <button type="button" onClick={onEdit} className="block w-full min-w-0 text-left">
            {value}
          </button>
        )}
      </dd>
    </div>
  );
}

function Control({
  children,
  on,
  onClick,
}: {
  children: React.ReactNode;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={on}
      className={`py-3.5 text-[13px] font-bold transition ${
        on ? "bg-pg-navy text-white" : "bg-white text-pg-navy"
      }`}
    >
      {children}
      <span className="ml-1.5 text-[10px] opacity-60">{on ? "▲" : "▼"}</span>
    </button>
  );
}

function cityOf(code: string): string {
  return AIRPORTS[code as keyof typeof AIRPORTS]?.city ?? code;
}

function nameOf(code: string): string {
  const airport = AIRPORTS[code as keyof typeof AIRPORTS];
  return airport === undefined ? code : `${airport.city} ${airport.name}`;
}

const FLEXIBILITY: Record<TripDraft["flexibility"]["value"], string> = {
  none: "Fixed",
  change: "Changeable",
  full: "Fully flex",
};

function baggageOf(draft: TripDraft): string {
  const kg = draft.checkedKg.value;
  if (kg === 0) return draft.cabinBag.value ? "Cabin only" : "Underseat";
  return `${kg} kg${draft.cabinBag.value ? " + cabin" : ""}`;
}

function pretty(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Barcode bar widths, from the booking reference.
 *
 * Decorative and deliberately not a real symbology — a scannable code on a mock
 * ticket is an invitation to scan it and find out it books nothing.
 */
function bars(reference: string): number[] {
  const widths: number[] = [];
  for (let i = 0; i < 34; i += 1) {
    const code = reference.charCodeAt(i % reference.length) + i * 7;
    widths.push(1 + (code % 2));
  }
  return widths;
}
