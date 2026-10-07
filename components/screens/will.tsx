"use client";

import { useState } from "react";
import { useNav } from "@/components/phone-nav";
import { useJourney } from "@/components/journey-provider";
import { Initials, PrimaryButton, TextButton } from "@/components/ui/primitives";
import { CheckoutScreen } from "./checkout-screen";
import { ConfirmationScreen } from "./confirmation-screen";
import { traceFor } from "@/lib/agent/trace";
import { FRIENDS, firstName, friendByName, seatBeside } from "@/lib/group/group";
import { WILL, willDraft } from "@/lib/demo/personas";

/**
 * Will's checkout and confirmation: the organiser's side of the booking.
 *
 * Both fall back to the week the opening sentence builds when opened cold, so
 * a presenter can start the demo at either screen and see the same ticket.
 *
 * The confirmation is where the group starts. The sentence said mates, not
 * who, so the companion asks whether to send the trip on and suggests two
 * people from his contacts. Each gets a nudge in Will's name with the seat
 * next to his offered. Nothing is frozen or held.
 */
function useWill() {
  const { state, update } = useJourney();
  const draft = state.draft ?? willDraft();
  const names = WILL.travellers.map((t) => t.name);
  return { draft, names, state, update };
}

export function WillCheckout() {
  const { draft, names, state, update } = useWill();
  return (
    <CheckoutScreen
      draft={draft}
      names={names}
      owner={names[0]}
      onFile={WILL.onFile}
      backHref="/"
      nextHref="/confirmation"
      onPay={() => update({ draft, booked: true })}
      thinking={{
        key: "checkout:will",
        trace: () => traceFor("/checkout", state),
        label: "Filling in the form…",
      }}
    />
  );
}

export function WillConfirmation() {
  const router = useNav();
  const { draft, names, state, update } = useWill();
  const me = names[0] ?? "Will Parker";
  const [picked, setPicked] = useState<string[]>(
    state.invited.length > 0 ? state.invited : FRIENDS.map((f) => f.name),
  );
  const chosen = FRIENDS.filter((f) => picked.includes(f.name));

  function toggle(name: string): void {
    setPicked((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  return (
    <ConfirmationScreen
      draft={draft}
      owner={me}
      headline={`You're going, ${firstName(me)}`}
      thinking={{
        key: `confirmation:will:${state.sent}`,
        trace: () => traceFor("/confirmation", state),
        label: "Booking…",
      }}
    >
      <section
        aria-label="Send to your friends"
        className="pg-card mt-6 flex flex-col gap-3 p-5"
      >
        <h2 className="text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
          Send this to your friends?
        </h2>
        {state.sent ? (
          <>
            <p className="text-[14px] font-bold">
              Sent to {state.invited.map(firstName).join(" and ")}.
            </p>
            <TextButton onClick={() => router.push("/group")} className="min-h-0">
              See the squad
            </TextButton>
          </>
        ) : (
          <>
            <h3 className="caps mt-1">Suggested from your contacts</h3>
            <div className="flex flex-col gap-2">
              {FRIENDS.map((friend) => {
                const on = picked.includes(friend.name);
                const seat = seatBeside(draft, friend, me);
                return (
                  <button
                    key={friend.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(friend.name)}
                    className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${
                      on ? "bg-pg-surface shadow-[inset_0_0_0_2px_#1F2A37]" : "bg-pg-surface"
                    }`}
                  >
                    <Initials name={friend.name} tone={on ? "navy" : "surface"} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] leading-5 font-bold">{friend.name}</span>
                      <span className="text-[13px] leading-[18px] text-pg-ink">
                        {friend.because}
                        {seat === null ? "" : ` Seat ${seat} is free next to you.`}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        on ? "bg-pg-navy text-white" : "bg-white text-pg-ink"
                      }`}
                    >
                      {on ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
            <PrimaryButton
              className="mt-1 w-full"
              disabled={chosen.length === 0}
              onClick={() => {
                const invited = chosen.map((f) => f.name);
                const lead = friendByName(invited[0] ?? "");
                update({
                  invited,
                  sent: true,
                  aside:
                    lead === null
                      ? null
                      : lead.account
                        ? { who: "archie", route: "/invite/archie" }
                        : { who: "tom", route: "/invite/tom" },
                });
                router.push("/group");
              }}
            >
              {chosen.length === 0
                ? "Pick someone"
                : `Send to ${chosen.map((f) => firstName(f.name)).join(" and ")}`}
            </PrimaryButton>
          </>
        )}
      </section>
    </ConfirmationScreen>
  );
}
