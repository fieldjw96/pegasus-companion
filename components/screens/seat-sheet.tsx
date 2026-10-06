"use client";

import { Says } from "@/components/ui/avatar";
import { PrimaryButton } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { formatFare } from "@/lib/journey/flights";
import { firstName } from "@/lib/group/group";

/**
 * The seat sheet: one row, who is in it, the price, and honest exits.
 *
 * For Will it gives a reason to buy: the early flight, the window, and the two
 * seats beside him shown to his friends. For a friend it is the one question
 * the companion will not answer on their behalf: whether to pay to sit next to
 * the organiser.
 */
export type RowSeat = { letter: string; name: string | null; held?: boolean };

export function SeatSheet({
  title,
  row,
  seats,
  you,
  perLeg,
  legs,
  says,
  cta,
  onTake,
  onClose,
  onAnywhere,
  included = false,
}: {
  title: string;
  row: number;
  seats: RowSeat[];
  /** The letter of the seat on offer. */
  you: string;
  perLeg: number;
  legs: number;
  says: string;
  cta: string;
  onTake: () => void;
  onClose: () => void;
  /** "Sit anywhere, free at check-in". */
  onAnywhere: () => void;
  /** The seat is already on the ticket: the sheet confirms rather than sells. */
  included?: boolean;
}) {
  const total = perLeg * legs;
  return (
    <Sheet label={title} onClose={onClose} className="pb-[26px]">
      <h2 className="mt-[18px] text-[28px] leading-[34px] font-extrabold tracking-[-0.02em]">
        {title}
      </h2>
      <div className="mt-4 flex flex-col items-center gap-3 rounded-[20px] bg-pg-surface px-3 pt-4 pb-3.5">
        <div className="flex items-start justify-center gap-1.5">
          {seats.map((seat, i) => {
            const isYou = seat.letter === you;
            const taken = seat.name !== null && !isYou;
            const tile = (
              <div key={seat.letter} className="flex w-[46px] flex-col items-center gap-1.5">
                <span
                  className={`display text-[12px] leading-[14px] font-extrabold ${
                    taken || isYou ? "text-pg-navy" : "text-pg-ink"
                  }`}
                >
                  {seat.letter}
                </span>
                <span
                  className={`relative flex h-[54px] w-[46px] items-center justify-center font-extrabold ${
                    isYou
                      ? "bg-pg-yellow text-[14px] text-pg-navy"
                      : taken
                        ? seat.held
                          ? "border-2 border-dashed border-pg-navy bg-white text-[14px] text-pg-navy"
                          : "bg-pg-navy text-[16px] text-white"
                        : "bg-pg-surface shadow-[inset_0_0_0_1.5px_#E3E8EF]"
                  }`}
                  style={{
                    borderRadius: "13px 13px 9px 9px",
                    boxShadow: isYou ? "inset 0 -4px 0 #E5A70C" : undefined,
                  }}
                >
                  {isYou && (
                    <span
                      aria-hidden
                      className="seatpulse absolute -inset-[5px] border-2 border-pg-yellow"
                      style={{ borderRadius: "17px 17px 13px 13px" }}
                    />
                  )}
                  {isYou ? "You" : (seat.name?.[0] ?? "")}
                </span>
                <span className="text-[12px] leading-4 font-semibold">
                  {seat.name === null || isYou ? " " : firstName(seat.name)}
                </span>
              </div>
            );
            if (i === 3) {
              return (
                <div key="aisle" className="contents">
                  <div
                    aria-hidden
                    className="flex w-[30px] flex-col items-center gap-0.5 pt-5"
                  >
                    <span className="caps" style={{ fontSize: 9.5 }}>
                      Row
                    </span>
                    <span className="display text-[18px] leading-5 font-extrabold">{row}</span>
                  </div>
                  {tile}
                </div>
              );
            }
            return tile;
          })}
        </div>
        <p className="text-[14px] leading-5 font-semibold">
          {seats.some((s) => s.held)
            ? "Dashed seats are the ones your mates will be offered."
            : `${row}${you} is free on every leg.`}
        </p>
      </div>
      <p className="tabular mt-4 text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
        {formatFare(perLeg)} GBP per leg · {formatFare(total)} total
        {included ? ", already in your price" : ""}
      </p>
      <Says className="mt-3.5">{says}</Says>
      <PrimaryButton size="lg" className="mt-[18px]" onClick={onTake}>
        {cta}
      </PrimaryButton>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAnywhere}
          className="min-h-12 text-center text-[13.5px] leading-[18px] font-bold"
          style={{ textWrap: "balance" }}
        >
          Sit anywhere — free at check-in
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 border-l border-pg-line text-center text-[13.5px] leading-[18px] font-bold"
        >
          Pick a different seat
        </button>
      </div>
    </Sheet>
  );
}
