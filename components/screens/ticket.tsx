"use client";

import { useState, type ReactNode } from "react";
import { DestinationPhoto } from "@/components/ui/destination-photo";
import { ChevronDown, PlaneIcon, Tick, Wordmark } from "@/components/ui/primitives";
import { ChangePanel } from "./change-panel";
import type { TripDraft } from "@/lib/assistant/draft";
import { itineraryFor, nights, type Leg } from "@/lib/assistant/itinerary";
import {
  breakdown,
  naivePath,
  withLine,
  type PriceBreakdown,
  type PriceLine,
} from "@/lib/assistant/price";
import { AIRPORTS, FARE_RULES, formatDuration, formatFare } from "@/lib/journey/flights";
import { shortDate } from "@/lib/demo/hero";

/**
 * The assembled trip, printed as a ticket.
 *
 * A finished booking is an object, not a summary. A list of key-value rows
 * reads as "here is the form I filled in for you"; a ticket reads as "you are
 * going". Same data, and only one of them makes a person feel booked.
 *
 * A dotted underline on the pass means the companion filled that value in.
 * Tapping it opens the change panel. That is the only legend this screen
 * needs. Everything the companion wants to justify lives one tap down, behind
 * the two controls on the stub.
 */
export type Panel = "none" | "breakdown" | "change";

export function Ticket({
  draft,
  onChange,
  names,
  owner,
  pending = false,
  seatLabel,
  seatDotted = true,
  onSeat,
  between,
  extraBreakdownNote,
  extraLine = null,
  initialPanel = "none",
}: {
  draft: TripDraft;
  onChange: (next: TripDraft) => void;
  /** Passenger names, in order. The first is printed; the rest are "+n". */
  names: string[];
  /** Set for an invitee, which changes the reference and the dotted marks. */
  owner?: string;
  /** "pending" in place of the reference, before the invitee pays. */
  pending?: boolean;
  /** Overrides the seat printed on the pass, e.g. "Choose below". */
  seatLabel?: string;
  /** With a seat override: whether it is still the companion's to explain. */
  seatDotted?: boolean;
  /** Tapping the seat on the pass. Defaults to opening the change panel. */
  onSeat?: () => void;
  /** Drawn between the ticket and the panels: the seat offer row. */
  between?: ReactNode;
  /** One more line at the foot of the breakdown. */
  extraBreakdownNote?: ReactNode;
  /** A seat bought on top of the fare, printed in the total and the breakdown. */
  extraLine?: PriceLine | null;
  initialPanel?: Panel;
}) {
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const itinerary = itineraryFor(draft, owner);
  const price = withLine(breakdown(draft), extraLine);
  const away = nights(draft);
  const people = draft.party.value.adults + draft.party.value.children;
  const city =
    AIRPORTS[draft.destination.value as keyof typeof AIRPORTS]?.city ??
    draft.destination.value;

  function toggle(next: Exclude<Panel, "none">): void {
    setPanel((current) => (current === next ? "none" : next));
  }
  const mine = (key: keyof Omit<TripDraft, "notes">) => draft[key].source !== "said";

  return (
    <>
      <section aria-label="Your ticket" className="pg-hero-card print mt-5 overflow-hidden">
        <div className="relative h-[156px]">
          <DestinationPhoto
            code={draft.destination.value}
            className="absolute inset-0"
            scrim={false}
            priority
          />
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(31,42,55,0.42) 0%, rgba(31,42,55,0) 38%, rgba(31,42,55,0.72) 100%)",
            }}
          />
          <Wordmark size={17} className="absolute top-4 left-5 text-white" />
          <span className="absolute top-[15px] right-5 flex items-baseline gap-1.5 text-white">
            <span className="caps text-white" style={{ fontSize: 10.5 }}>
              Booking
            </span>
            <span className="display text-[15px] font-extrabold tracking-[0.08em]">
              {pending ? "pending" : itinerary.reference}
            </span>
          </span>
          <span className="absolute bottom-3.5 left-5 flex flex-col gap-0.5 text-white">
            <span className="caps text-white">
              {away === null ? "One way" : `${away} night${away === 1 ? "" : "s"}`}
            </span>
            <span className="text-[32px] leading-[34px] font-extrabold tracking-[-0.02em]">
              {city}
            </span>
          </span>
        </div>

        {itinerary.out === null ? (
          <p className="px-5 py-6 text-[14px] text-pg-ink">
            No flight on this route that day. Change the date below.
          </p>
        ) : (
          <div className="flex flex-col gap-4 px-5 pt-5 pb-[18px]">
            <div className="caps">
              Outbound · {shortDate(itinerary.out.flight.date)} ·{" "}
              {itinerary.out.flight.aircraft}
            </div>
            <LegRow
              leg={itinerary.out}
              from={draft.origin.value}
              to={draft.destination.value}
              dotted={mine("origin") || mine("destination")}
              big
            />
            <div className="flex justify-between gap-3 text-[13px] leading-[18px] text-pg-ink">
              <span>{nameOf(draft.origin.value)}</span>
              <span className="text-right">{nameOf(draft.destination.value)}</span>
            </div>

            <dl className="grid grid-cols-6 gap-x-3 gap-y-4 border-t border-pg-line pt-4">
              <Slot label="Passenger" span={3}>
                {names[0] ?? "Passenger"}
                {people > 1 && ` +${people - 1}`}
              </Slot>
              <Slot
                label="Seat"
                span={3}
                dotted={seatLabel !== undefined ? seatDotted : mine("seating")}
                onTap={onSeat ?? (() => setPanel("change"))}
                why="chosen by your companion"
              >
                {seatLabel ??
                  (itinerary.out.seats.length === 0
                    ? "At check-in"
                    : itinerary.out.seats.join(" "))}
              </Slot>
              <Slot label="Gate" span={2}>
                {itinerary.out.gate}
              </Slot>
              <Slot label="Boards" span={2}>
                {itinerary.out.boards}
              </Slot>
              <Slot
                label="Fare"
                span={2}
                dotted={mine("package")}
                onTap={() => setPanel("change")}
                why="chosen by your companion"
              >
                {FARE_RULES[draft.package.value].label}
              </Slot>
              <Slot
                label="Baggage"
                span={3}
                dotted={mine("checkedKg") && draft.checkedKg.source === "predicted"}
                onTap={() => setPanel("change")}
                why="chosen by your companion"
              >
                {baggageOf(draft)}
              </Slot>
              <Slot
                label="Changes"
                span={3}
                dotted={mine("flexibility")}
                onTap={() => setPanel("change")}
                why="chosen by your companion"
              >
                {FLEXIBILITY[draft.flexibility.value]}
              </Slot>
            </dl>
          </div>
        )}

        {itinerary.back !== null && (
          <div className="flex flex-col gap-3.5 border-t border-pg-line px-5 py-[18px]">
            <div className="caps">Return · {shortDate(itinerary.back.flight.date)}</div>
            <LegRow
              leg={itinerary.back}
              from={draft.destination.value}
              to={draft.origin.value}
              dotted={mine("returnDate")}
            />
          </div>
        )}

        <div aria-hidden className="relative flex h-6 items-center">
          <span
            className="notch -left-3"
            style={{ boxShadow: "inset -3px 0 5px rgba(31,42,55,0.08)" }}
          />
          <span className="mx-[22px] flex-1 border-t-2 border-dashed border-pg-line" />
          <span
            className="notch -right-3"
            style={{ boxShadow: "inset 3px 0 5px rgba(31,42,55,0.08)" }}
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-5 pt-3.5 pb-4">
          <Barcode reference={itinerary.reference} />
          <span className="flex flex-col items-end gap-0.5">
            <span className="caps" style={{ fontSize: 10.5 }}>
              Total
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="display text-[26px] leading-[30px] font-extrabold">
                {formatFare(price.total)}
              </span>
              <span className="text-[13px] font-bold">GBP</span>
            </span>
          </span>
        </div>

        <div className="grid grid-cols-2 border-t border-pg-line">
          <Control on={panel === "breakdown"} onClick={() => toggle("breakdown")} divider>
            Full breakdown
          </Control>
          <Control on={panel === "change"} onClick={() => toggle("change")}>
            Change anything
          </Control>
        </div>
      </section>

      {between}

      {panel === "breakdown" && (
        <BreakdownPanel draft={draft} price={price} extra={extraBreakdownNote} />
      )}
      {panel === "change" && (
        <ChangePanel
          draft={draft}
          onChange={onChange}
          names={names}
          seatLabel={seatLabel}
          seatSaid={seatLabel !== undefined && !seatDotted}
        />
      )}
    </>
  );
}

/** One leg: codes in Archivo, times under them, the flight across the middle. */
function LegRow({
  leg,
  from,
  to,
  big = false,
  dotted = false,
}: {
  leg: Leg;
  from: string;
  to: string;
  big?: boolean;
  dotted?: boolean;
}) {
  const code = big
    ? "display text-[34px] leading-[34px] font-extrabold tracking-[-0.01em]"
    : "display text-[26px] leading-[26px] font-extrabold tracking-[-0.01em]";
  const time = big
    ? "tabular text-[20px] leading-6 font-bold"
    : "tabular text-[17px] leading-[22px] font-bold";
  const underline = dotted ? "mine" : "";
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-start gap-1">
        <span className={`${code} ${underline}`}>{from}</span>
        <span className={time}>{leg.flight.departs}</span>
      </div>
      <div className="flex flex-1 flex-col items-center gap-1.5">
        {big && (
          <span className="text-[12px] leading-4 font-semibold text-pg-ink">
            {formatDuration(leg.flight.durationMinutes)}
          </span>
        )}
        <div className="flex w-full items-center gap-1.5">
          <span className="h-[7px] w-[7px] rounded-full border-2 border-pg-navy" />
          <span className="h-0.5 flex-1 bg-pg-line" />
          <span className="text-pg-navy">
            <PlaneIcon />
          </span>
          <span className="h-0.5 flex-1 bg-pg-line" />
          <span className="h-[7px] w-[7px] rounded-full bg-pg-navy" />
        </div>
        <span className="text-[12px] leading-4 font-bold tracking-[0.04em]">
          {leg.flight.via === null ? leg.flight.flightNo : `via ${leg.flight.via}`}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`${code} ${underline}`}>{to}</span>
        <span className={time}>
          {leg.flight.arrives}
          {leg.flight.arrivesNextDay && <sup className="text-[10px] text-pg-ink">+1</sup>}
        </span>
      </div>
    </div>
  );
}

/** One printed field. A dotted underline, and only that, says the companion chose it. */
function Slot({
  label,
  children,
  span,
  dotted = false,
  onTap,
  why,
}: {
  label: string;
  children: ReactNode;
  span: 2 | 3;
  dotted?: boolean;
  onTap?: () => void;
  why?: string;
}) {
  return (
    <div
      className={`flex flex-col items-start gap-1 ${span === 3 ? "col-span-3" : "col-span-2"}`}
    >
      <dt className="caps" style={{ fontSize: 10.5 }}>
        {label}
      </dt>
      <dd className="m-0 min-w-0 max-w-full">
        {dotted && onTap !== undefined ? (
          <button
            type="button"
            onClick={onTap}
            aria-label={`${label} ${textOf(children)}, ${why ?? "see why"}`}
            className="mine block max-w-full truncate text-left text-[15px] leading-5 font-bold"
          >
            {children}
          </button>
        ) : (
          <span className="block max-w-full truncate text-[15px] leading-[22px] font-bold">
            {children}
          </span>
        )}
      </dd>
    </div>
  );
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

function Control({
  children,
  on,
  onClick,
  divider = false,
}: {
  children: ReactNode;
  on: boolean;
  onClick: () => void;
  divider?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={on}
      className={`flex h-[52px] items-center justify-center gap-1.5 text-[14.5px] ${
        on ? "font-extrabold" : "font-bold"
      } ${divider ? "border-r border-pg-line" : ""}`}
      style={on ? { boxShadow: "inset 0 -3px 0 #FF5C00" } : undefined}
    >
      <span>{children}</span>
      <ChevronDown up={on} />
    </button>
  );
}

/**
 * Decorative and deliberately not a real symbology: a scannable code on a mock
 * ticket is an invitation to scan it and find out it books nothing.
 */
function Barcode({ reference }: { reference: string }) {
  const bars: number[] = [];
  for (let i = 0; i < 40; i += 1) {
    const code = reference.charCodeAt(i % reference.length) + i * 7;
    bars.push(1 + (code % 3));
  }
  return (
    <span
      role="img"
      aria-label="Barcode"
      className="flex h-12 w-[132px] items-stretch gap-px overflow-hidden"
    >
      {bars.map((w, i) => (
        <span key={i} className="shrink-0 bg-pg-navy" style={{ width: w }} />
      ))}
    </span>
  );
}

export function BreakdownPanel({
  draft,
  price,
  extra,
}: {
  draft: TripDraft;
  price: PriceBreakdown;
  extra?: ReactNode;
}) {
  const saving = naivePath(draft);
  return (
    <section
      aria-label="Full breakdown"
      className="pg-card rise mt-3 flex flex-col px-5 pt-[22px] pb-5"
    >
      <h2 className="mb-1.5 text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
        What makes up {formatFare(price.total)} GBP
      </h2>
      {price.lines.map((line, i) => (
        <div
          key={line.label}
          className={`flex items-start justify-between gap-4 py-3.5 ${
            i < price.lines.length - 1 ? "border-b border-pg-line" : ""
          }`}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] leading-[22px] font-bold">{line.label}</span>
            <span className="text-[13px] leading-[18px] text-pg-ink">{line.detail}</span>
          </div>
          <span className="tabular text-[16px] leading-[22px] font-bold">
            {formatFare(line.amount)}
          </span>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 border-t-2 border-pg-navy pt-3.5">
        <span className="text-[15px] leading-[22px] font-extrabold">Total</span>
        <span className="flex items-baseline gap-1.5">
          <span className="display text-[22px] leading-7 font-extrabold">
            {formatFare(price.total)}
          </span>
          <span className="text-[13px] font-bold">GBP</span>
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-[14px] bg-pg-surface p-4">
        <h3 className="caps text-pg-navy">
          Already in your {FARE_RULES[draft.package.value].label} fare
        </h3>
        <ul className="flex flex-col gap-2.5 text-[14px] leading-5 font-medium">
          {price.included.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <Tick />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {saving !== null && (
        <p className="mt-[18px] text-[14px] leading-[21px]" style={{ textWrap: "pretty" }}>
          The same trip bought the long way — cheapest fare first, then this bag on the baggage
          screen — comes to{" "}
          <strong className="tabular font-extrabold">{formatFare(saving.paid)} GBP</strong>.
          The allowance costs less inside the fare than it does on its own, and the app only
          ever tells you the second price.
        </p>
      )}
      {extra}
    </section>
  );
}

const FLEXIBILITY: Record<TripDraft["flexibility"]["value"], string> = {
  none: "Fixed",
  change: "Changeable",
  full: "Fully flex",
};

export function baggageOf(draft: TripDraft): string {
  const kg = draft.checkedKg.value;
  if (kg === 0) return draft.cabinBag.value ? "Cabin bag" : "Underseat";
  return `${kg} kg${draft.cabinBag.value ? " + cabin" : ""}`;
}

export function nameOf(code: string): string {
  const airport = AIRPORTS[code as keyof typeof AIRPORTS];
  return airport === undefined ? code : `${airport.city} ${airport.name}`;
}
