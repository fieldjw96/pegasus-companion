"use client";

import { useState } from "react";
import { useNav } from "@/components/phone-nav";
import { useJourney } from "@/components/journey-provider";
import { Initials, PrimaryButton, SearchIcon, TextButton } from "@/components/ui/primitives";
import { shortDate } from "@/lib/demo/personas";
import { CheckoutScreen } from "./checkout-screen";
import { ConfirmationScreen } from "./confirmation-screen";
import { traceFor } from "@/lib/agent/trace";
import {
  FRIENDS,
  firstName,
  friendByName,
  listNames,
  searchContacts,
} from "@/lib/group/group";
import { JESS, jessDraft } from "@/lib/demo/personas";

/**
 * Jess's checkout and confirmation: the organiser's side of the booking.
 *
 * Both fall back to the week the opening sentence builds when opened cold, so
 * a presenter can start the demo at either screen and see the same ticket.
 *
 * The confirmation is where the group starts. The sentence said mates, not
 * who, so the companion asks whether to send the trip on and suggests two
 * people from her contacts, by name only: the reasons are the panel's. Each
 * gets a nudge in Jess's name with the seat next to hers offered, and a voucher
 * to claim when they book. Nothing is frozen or held. Under it, her dad: one
 * button, and he gets the dates and the landing time, told if a flight moves.
 */
function useWill() {
  const { state, update } = useJourney();
  const draft = state.draft ?? jessDraft();
  const names = JESS.travellers.map((t) => t.name);
  return { draft, names, state, update };
}

export function JessCheckout() {
  const { draft, names, state, update } = useWill();
  return (
    <CheckoutScreen
      draft={draft}
      names={names}
      owner={names[0]}
      onFile={JESS.onFile}
      backHref="/"
      nextHref="/confirmation"
      note={
        <>
          <strong className="font-extrabold">Passport checked:</strong> valid to Mar 2032, well
          past the 150 days Türkiye asks for after{" "}
          {shortDate(draft.returnDate.value ?? draft.departDate.value)}. Nothing to renew.
        </>
      }
      onPay={() => update({ draft, booked: true })}
      thinking={{
        key: "checkout:jess",
        trace: () => traceFor("/checkout", state),
        label: "Filling in the form…",
      }}
    />
  );
}

export function JessConfirmation() {
  const router = useNav();
  const { draft, names, state, update } = useWill();
  const me = names[0] ?? "Jess Carter";
  const [picked, setPicked] = useState<string[]>(
    state.invited.length > 0 ? state.invited : FRIENDS.map((f) => f.name),
  );
  const chosen = FRIENDS.filter((f) => picked.includes(f.name));
  const [query, setQuery] = useState("");
  const [extras, setExtras] = useState<string[]>(state.shared);
  const found = searchContacts(query).filter((c) => !extras.includes(c.name));
  const everyone = [...chosen.map((f) => f.name), ...extras];

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
        key: `confirmation:jess:${state.sent}`,
        trace: () => traceFor("/confirmation", state),
        label: "Booking…",
      }}
    >
      <section
        aria-label="Send to your friends"
        className="pg-card mt-6 flex flex-col gap-3 p-5"
      >
        <h2 className="text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
          Send this to your friends to claim a voucher?
        </h2>
        {state.sent ? (
          <>
            <p className="text-[14px] font-bold">
              Sent to {listNames(state.invited)}.
              {state.shared.length > 0
                ? ` The link went to ${listNames(state.shared)} too.`
                : ""}
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
                    <span className="min-w-0 flex-1 text-[15px] leading-5 font-bold">
                      {friend.name}
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
            <h3 className="caps mt-2">Anyone else</h3>
            <div className="flex h-11 items-center gap-2.5 rounded-[14px] bg-pg-surface px-3.5">
              <SearchIcon />
              <input
                type="search"
                aria-label="Search your contacts"
                placeholder="Search your contacts"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-pg-ink"
              />
            </div>
            {found.length > 0 && (
              <ul className="fade flex flex-col gap-1" aria-label="Contacts found">
                {found.map((c) => (
                  <li key={c.name}>
                    <button
                      type="button"
                      onClick={() => {
                        setExtras((prev) => [...prev, c.name]);
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-left hover:bg-pg-surface"
                    >
                      <Initials name={c.name} size={32} tone="surface" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[15px] leading-5 font-bold">{c.name}</span>
                        <span className="text-[12px] leading-4 text-pg-ink">{c.note}</span>
                      </span>
                      <span
                        aria-hidden
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-pg-ink shadow-[0_1px_2px_rgba(31,42,55,0.08)]"
                      >
                        +
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query.trim() !== "" && found.length === 0 && (
              <p className="px-1 text-[13px] text-pg-ink">
                Nobody called that in your contacts.
              </p>
            )}
            {extras.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label="Also sending to">
                {extras.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={() => setExtras((prev) => prev.filter((n) => n !== name))}
                    className="flex h-8 items-center gap-1.5 rounded-full bg-pg-navy pr-2.5 pl-1 text-[13px] font-bold text-white"
                  >
                    <Initials name={name} size={24} tone="surface" />
                    {firstName(name)}
                    <span aria-hidden className="text-white/70">
                      ×
                    </span>
                  </button>
                ))}
              </div>
            )}
            <PrimaryButton
              className="mt-1 w-full"
              disabled={everyone.length === 0}
              onClick={() => {
                const invited = chosen.map((f) => f.name);
                const lead = friendByName(invited[0] ?? "");
                update({
                  invited,
                  shared: extras,
                  sent: true,
                  aside:
                    lead === null
                      ? null
                      : lead.account
                        ? { who: "archie", route: "/invite/archie" }
                        : { who: "will", route: "/invite/will" },
                });
                router.push("/group");
              }}
            >
              {everyone.length === 0 ? "Pick someone" : `Send to ${listNames(everyone)}`}
            </PrimaryButton>
          </>
        )}
      </section>
      {JESS.parent !== null && (
        <section
          aria-label="Keep Dad posted"
          className="pg-card mt-4 flex flex-col gap-2.5 p-5"
        >
          <div className="flex items-center gap-3">
            <Initials name={JESS.parent.name} size={36} />
            <h2 className="text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
              Keep {JESS.parent.name} posted?
            </h2>
          </div>
          {state.dadTold ? (
            <TextButton
              onClick={() => update({ aside: { who: "dad", route: "/follow/dad" } })}
              className="min-h-0"
            >
              See what {JESS.parent.name} got
            </TextButton>
          ) : (
            <PrimaryButton
              className="mt-1 w-full"
              onClick={() =>
                update({ dadTold: true, aside: { who: "dad", route: "/follow/dad" } })
              }
            >
              Notify {JESS.parent.name}
            </PrimaryButton>
          )}
        </section>
      )}
    </ConfirmationScreen>
  );
}
