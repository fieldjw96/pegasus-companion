"use client";

import { useJourney } from "@/components/journey-provider";
import { PrimaryButton } from "@/components/ui/primitives";
import { CheckoutScreen } from "./checkout-screen";
import { ConfirmationScreen } from "./confirmation-screen";
import { traceFor } from "@/lib/agent/trace";
import { countBySource } from "@/lib/assistant/draft";
import type { PriceLine } from "@/lib/assistant/price";
import { GIFTS } from "@/lib/moments/moments";
import { EMRE, emreDraft, dayLongMonth, shortDate } from "@/lib/demo/personas";
import { MOMENT } from "@/lib/moments/moments";
import { Initials } from "@/components/ui/primitives";

/**
 * Emre's checkout and confirmation: the warm start's ending.
 *
 * The checkout catches the passport before payment, with time to sort it. The
 * confirmation sets up the surprise: Dad follows the flight, Mum finds out
 * when Emre walks in.
 */
function useEmre() {
  const { state, update } = useJourney();
  const draft = state.emre.draft ?? emreDraft();
  const names = EMRE.travellers.map((t) => t.name);
  const gifts: PriceLine[] = state.emre.gifts
    ? [
        {
          label: GIFTS.extraWeight.label,
          detail: `${GIFTS.extraWeight.perLeg.toFixed(2)} on the way home`,
          amount: GIFTS.extraWeight.perLeg,
        },
        {
          label: GIFTS.delight.label,
          detail: `${GIFTS.delight.perLeg.toFixed(2)}, ready at your seat`,
          amount: GIFTS.delight.perLeg,
        },
      ]
    : [];
  return { state, update, draft, names, gifts };
}

export function EmreCheckout() {
  const { draft, names, gifts, state, update } = useEmre();
  return (
    <CheckoutScreen
      draft={draft}
      names={names}
      owner={names[0]}
      onFile={EMRE.onFile}
      extraLines={gifts}
      backHref="/emre"
      nextHref="/emre/confirmation"
      cta="Confirm"
      thinking={{
        key: `checkout:emre:${state.emre.gifts}`,
        trace: () => traceFor("/emre/checkout", state),
        label: "Checking the passport…",
      }}
      note={
        <>
          <strong className="font-extrabold">Heads up:</strong> your passport expires in
          August. Fine for this domestic trip, but you&rsquo;ll need it renewed for your
          September flight.
        </>
      }
      onPay={() =>
        update((prev) => ({
          emre: { ...prev.emre, draft, booked: true },
          moment: { ...prev.moment, set: true, approved: true },
        }))
      }
    />
  );
}

export function EmreConfirmation() {
  const { state, update, draft, names, gifts } = useEmre();
  const counts = countBySource(draft);
  return (
    <ConfirmationScreen
      draft={draft}
      owner={names[0]}
      extraLines={gifts}
      thinking={{
        key: "confirmation:emre",
        trace: () => traceFor("/emre/confirmation", state),
        label: "Booking…",
      }}
      says={
        <>
          Your usual,{" "}
          {counts.said > 0
            ? `${counts.said} thing${counts.said === 1 ? "" : "s"} changed, `
            : ""}
          booked two months out. {dayLongMonth(MOMENT.occasion)}: see you at the gate on{" "}
          {shortDate(draft.departDate.value)}.
        </>
      }
    >
      <section aria-label="Surprise mode" className="pg-card mt-6 flex flex-col gap-2.5 p-5">
        <div className="flex items-center gap-3">
          <Initials name="Dad" size={36} />
          <h2 className="text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
            Dad&rsquo;s in on the surprise?
          </h2>
        </div>
        <p className="text-[15px] leading-[22px]" style={{ textWrap: "pretty" }}>
          Dad gets your flight and the landing time by SMS, so he&rsquo;s at arrivals on time.
          Mum gets nothing from anyone&rsquo;s booking; she finds out when you walk in.
        </p>
        <PrimaryButton
          className="mt-1 w-full"
          onClick={() => update({ aside: { who: "dad", route: "/moment/dad" } })}
        >
          See what Dad gets
        </PrimaryButton>
      </section>
    </ConfirmationScreen>
  );
}
