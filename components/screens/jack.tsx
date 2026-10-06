"use client";

import { useJourney } from "@/components/journey-provider";
import { Initials, PlusIcon, PrimaryButton } from "@/components/ui/primitives";
import { CheckoutScreen } from "./checkout-screen";
import { ConfirmationScreen } from "./confirmation-screen";
import { countBySource } from "@/lib/assistant/draft";
import { PROFILES } from "@/lib/assistant/profiles";
import { HOLD } from "@/lib/group/group";
import { heroDraft } from "@/lib/demo/hero";

/**
 * Jack's checkout and confirmation: the organiser's side of the booking.
 *
 * Both fall back to the hero trip when opened cold, so a presenter can start
 * the demo at either screen and see the same ticket the home screen builds.
 */
function useJackDraft() {
  const { state, update } = useJourney();
  const profile = PROFILES.find((p) => p.id === state.profileId) ?? PROFILES[0]!;
  const draft = state.draft ?? heroDraft();
  const names = profile.travellers.filter((t) => t.kind !== "infant").map((t) => t.name);
  return { draft, names, state, update };
}

export function JackCheckout() {
  const { draft, names, update } = useJackDraft();
  return (
    <CheckoutScreen
      draft={draft}
      names={names}
      card={{ brand: "VISA", last4: "4471" }}
      backHref="/"
      nextHref="/confirmation"
      onPay={() => update({ draft, booked: true })}
    />
  );
}

export function JackConfirmation() {
  const { draft, names, state } = useJackDraft();
  const counts = countBySource(draft);
  const invited = state.invited.length > 0;
  return (
    <ConfirmationScreen
      draft={draft}
      says={
        <>
          You said {counts.said} things. I remembered {counts.profile} and worked out{" "}
          {counts.predicted}. One screen, no forms, and every one of my guesses was on the
          ticket before you paid.
        </>
      }
    >
      <section aria-label="Group booking" className="pg-card mt-6 flex flex-col gap-2.5 p-5">
        <div className="flex items-center gap-3">
          <div aria-hidden className="flex items-center">
            <Initials
              name={names[0] ?? "Jack Field"}
              size={36}
              className="ring-[3px] ring-white"
            />
            <span className="-ml-2.5 h-9 w-9 rounded-full border-2 border-pg-line bg-pg-surface ring-[3px] ring-white" />
            <span className="-ml-2.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-pg-line bg-pg-surface ring-[3px] ring-white">
              <PlusIcon size={16} />
            </span>
          </div>
          <h2 className="text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
            Travelling with others?
          </h2>
        </div>
        <p className="text-[15px] leading-[22px]" style={{ textWrap: "pretty" }}>
          I can hold these same flights for your friends for {HOLD.hours} hours and build each
          of them their own booking. They pay their own way.
        </p>
        <PrimaryButton href={invited ? "/group" : "/group/people"} className="mt-1.5 w-full">
          {invited ? "See the group" : "Build a group"}
        </PrimaryButton>
      </section>
    </ConfirmationScreen>
  );
}
