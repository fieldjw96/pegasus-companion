"use client";

import { useState } from "react";
import { useJourney } from "@/components/journey-provider";
import { Initials, PlusIcon, PrimaryButton } from "@/components/ui/primitives";
import { CheckoutScreen } from "./checkout-screen";
import { ConfirmationScreen } from "./confirmation-screen";
import { Thumbs } from "./home-screen";
import { countBySource } from "@/lib/assistant/draft";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { formatFare } from "@/lib/journey/flights";
import { FREEZE, FRIENDS, firstName } from "@/lib/group/group";
import { WILL, willDraft, shortDate } from "@/lib/demo/personas";

/**
 * Will's checkout and confirmation: the organiser's side of the booking.
 *
 * Both fall back to the week the opening sentence builds when opened cold, so
 * a presenter can start the demo at either screen and see the same ticket.
 *
 * The confirmation is where the group starts. Today Will would screenshot his
 * booking into WhatsApp and his friends would search days later at a higher
 * fare. Here he freezes today's fare for them and sends the invite in one tap.
 */
function useWill() {
  const { state, update } = useJourney();
  const draft = state.draft ?? willDraft();
  const names = WILL.travellers.map((t) => t.name);
  return { draft, names, state, update };
}

export function WillCheckout() {
  const { draft, names, update } = useWill();
  return (
    <CheckoutScreen
      draft={draft}
      names={names}
      owner={names[0]}
      onFile={WILL.onFile}
      backHref="/"
      nextHref="/confirmation"
      onPay={() => update({ draft, booked: true })}
    />
  );
}

export function WillConfirmation() {
  const { draft, names, state, update } = useWill();
  const counts = countBySource(draft);
  const itinerary = itineraryFor(draft, names[0]);
  const [thumbsDown, setThumbsDown] = useState(false);
  const mates = FRIENDS.map((f) => firstName(f.name));
  const invited = state.invited.length > 0;
  const first = itinerary.out;

  return (
    <ConfirmationScreen
      draft={draft}
      owner={names[0]}
      headline={`You're going, ${firstName(names[0] ?? "")}`}
      says={
        <>
          {first !== null && (
            <>
              {first.from} → {first.to} · {shortDate(first.date)} ·{" "}
              {first.seats[0] ?? "any seat"}.{" "}
            </>
          )}
          You said {counts.said} things. I worked out {counts.predicted} and showed you every
          one before you paid.
        </>
      }
    >
      <section
        aria-label="Freeze and invite"
        className="pg-card mt-6 flex flex-col gap-2.5 p-5"
      >
        <div className="flex items-center gap-3">
          <div aria-hidden className="flex items-center">
            <Initials name={names[0] ?? "Will"} size={36} className="ring-[3px] ring-white" />
            {FRIENDS.map((f) => (
              <span
                key={f.name}
                className="-ml-2.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-pg-navy bg-pg-surface ring-[3px] ring-white"
              >
                <Initials name={f.name} size={28} tone="surface" />
              </span>
            ))}
            <span className="-ml-2.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-pg-line bg-pg-surface ring-[3px] ring-white">
              <PlusIcon size={16} />
            </span>
          </div>
          <h2 className="text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
            Freeze this fare for {mates.join(" and ")}?
          </h2>
        </div>
        <p className="text-[15px] leading-[22px]" style={{ textWrap: "pretty" }}>
          Prices on this flight are rising. I can hold today&rsquo;s fare for {FREEZE.hours}{" "}
          hours, keep {first?.seats[0] === undefined ? "the seats" : "14B and 14C"} beside you,
          and build each of them their own booking in your name. They pay their own way.
        </p>
        <p className="text-[13px] leading-[18px] text-pg-ink">
          Price Freeze, {formatFare(FREEZE.feePerFriend)} GBP a friend. Pegasus sells it today.
        </p>
        <PrimaryButton href={invited ? "/group" : "/group/people"} className="mt-1.5 w-full">
          {invited ? "See the squad" : "Freeze and invite"}
        </PrimaryButton>
      </section>
      <Thumbs
        question="Did we get your trip right?"
        value={state.thumbs}
        onPick={(v) => {
          update({ thumbs: v });
          setThumbsDown(v === "down");
        }}
        open={thumbsDown}
        options={[
          { label: "The route", onPick: () => setThumbsDown(false) },
          { label: "The bag", onPick: () => setThumbsDown(false) },
          { label: "The seat", onPick: () => setThumbsDown(false) },
        ]}
        reply={
          state.thumbs === "down" && !thumbsDown ? "Noted. That feeds the next guess." : null
        }
      />
    </ConfirmationScreen>
  );
}
