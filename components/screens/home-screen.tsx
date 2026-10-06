"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppHeader, AppShell, TotalFooter } from "@/components/ui/app-shell";
import { Avatar, Mark, Says, ThinkingAvatar } from "@/components/ui/avatar";
import { DestinationPhoto } from "@/components/ui/destination-photo";
import { PrimaryButton, Sparkle, TextButton } from "@/components/ui/primitives";
import { SentenceBox } from "@/components/ui/sentence-box";
import { useJourney } from "@/components/journey-provider";
import { SeatSheet } from "./seat-sheet";
import { Ticket, cityOf } from "./ticket";
import { Suggestions } from "./suggestions";
import { buildDraft, extract, stopsFor } from "@/lib/assistant/understand";
import { suggest, type Suggestion } from "@/lib/assistant/discover";
import { countBySource, type TripDraft } from "@/lib/assistant/draft";
import { itineraryFor, nights } from "@/lib/assistant/itinerary";
import { breakdown, naivePath, withLines, type PriceLine } from "@/lib/assistant/price";
import { AIRPORTS, formatFare } from "@/lib/journey/flights";
import { SQUAD } from "@/lib/journey/script";
import { FRIENDS, firstName } from "@/lib/group/group";
import { GIFTS, MOMENT } from "@/lib/moments/moments";
import {
  EMRE,
  WILL,
  WILL_PROMPT,
  dateSpan,
  dayLongMonth,
  emreDraft,
  shift,
  shortDate,
  weekdayName,
  type Persona,
} from "@/lib/demo/personas";

/**
 * Home: the greeting, the thinking beat, and the ticket.
 *
 * One screen, in the order a passenger moves through it. There is no funnel to
 * walk. A passenger says what they want and the trip assembles underneath,
 * rather than being walked through nine screens of questions the app could
 * mostly have answered itself.
 *
 * Two people use it. Will has never been here: everything he did not say is a
 * prediction, and the first thing under his sentence is what the companion
 * heard, as editable chips. Emre arrives from a nudge with his usual trip
 * already rebuilt, and the first question is whether it got it right.
 */

const TRY: { code: string; title: string; prompt: string }[] = [
  { code: "ASR", title: "Cappadocia", prompt: WILL_PROMPT },
  {
    code: "AYT",
    title: "Somewhere warm",
    prompt: "Somewhere warm in October, under £600, nothing too long",
  },
  {
    code: "BER",
    title: "Berlin",
    prompt: "Two nights in Berlin next month, hand luggage only",
  },
];

type Phase = "idle" | "thinking" | "discovery" | "trip";

export function HomeScreen({ persona }: { persona: Persona }) {
  const router = useRouter();
  const { state, update } = useJourney();
  const profile = persona === "emre" ? EMRE : WILL;
  const draft = persona === "emre" ? (state.emre.draft ?? emreDraft()) : state.draft;
  const [beat, setBeat] = useState<"thinking" | "discovery" | null>(null);
  const phase: Phase = beat ?? (draft === null ? "idle" : "trip");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [seatSheet, setSeatSheet] = useState(false);
  const [thumbsDown, setThumbsDown] = useState(false);
  const greeting = useSyncExternalStore(
    () => () => {},
    () => {
      const hour = new Date().getHours();
      return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    },
    () => "Good morning",
  );

  const names = profile.travellers.map((t) => t.name);
  const first = firstName(names[0] ?? "");

  function setDraft(next: TripDraft | null): void {
    if (persona === "emre") update((prev) => ({ emre: { ...prev.emre, draft: next } }));
    else update({ draft: next });
  }

  function run(text: string): void {
    update({ prompt: text, thumbs: null });
    setBeat("thinking");
    setThumbsDown(false);
    window.setTimeout(() => {
      const said = extract(text);
      if (said.discovery) {
        const when =
          said.departDate ??
          (() => {
            const d = new Date();
            d.setDate(d.getDate() + 21);
            return d.toISOString().slice(0, 10);
          })();
        setSuggestions(suggest(said, profile, when, profile.homeAirport));
        setDraft(null);
        setBeat("discovery");
        return;
      }
      setDraft(buildDraft(text, profile));
      if (persona === "will") update({ booked: false });
      setSuggestions([]);
      setBeat(null);
    }, 900);
  }

  function choose(code: string): void {
    setDraft(buildDraft(`${state.prompt ?? ""} to ${code}`, profile));
    setSuggestions([]);
    setBeat(null);
  }

  function reset(): void {
    setDraft(null);
    update({ prompt: null, booked: false, thumbs: null });
    setSuggestions([]);
    setBeat(null);
  }

  if (phase === "idle") {
    return (
      <AppShell bodyClassName="pt-2 pb-8">
        <div className="flex flex-col items-center gap-3">
          <Avatar size={120} className="drop-shadow-[0_10px_18px_rgba(229,167,12,0.28)]" />
          <span className="flex h-[26px] items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-bold tracking-[0.08em] shadow-[0_1px_2px_rgba(31,42,55,0.06)]">
            <Sparkle />
            YOUR AI COMPANION
          </span>
          <h1 className="mt-1 text-center text-[28px] leading-[34px] font-extrabold tracking-[-0.02em]">
            {greeting}, {first}
          </h1>
        </div>

        <div className="mt-5">
          <SentenceBox
            placeholder="Where are we going? Or tell me the whole trip at once."
            action="Plan it"
            onSubmit={run}
          />
        </div>

        <p className="mt-3 px-1 text-[13px] leading-[18px] text-pg-ink">
          {profile.coldStart
            ? "First time here? Just tell me the trip. I'll fill in the rest and show you where each guess came from."
            : `${profile.remembers.join(" · ")} · remembered from your trips home`}
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <h2 className="caps px-1">Try</h2>
          {TRY.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => run(item.prompt)}
              className="pg-card relative block h-28 w-full overflow-hidden text-left"
            >
              <DestinationPhoto code={item.code} className="absolute inset-0" scrim={false} />
              <span
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(31,42,55,0.05) 0%, rgba(31,42,55,0.78) 100%)",
                }}
              />
              <span className="absolute inset-x-[18px] bottom-3.5 flex flex-col gap-0.5 text-white">
                <span className="text-[20px] leading-6 font-extrabold tracking-[-0.01em]">
                  {item.title}
                </span>
                <span className="text-[13px] leading-[18px] font-medium">{item.prompt}</span>
              </span>
            </button>
          ))}
        </div>
      </AppShell>
    );
  }

  const heard = state.prompt === null ? null : extract(state.prompt);
  const youSaid = (
    <div className="pg-card mt-4 flex flex-col px-5 pt-1.5 pb-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-pg-ink">You said:</span>
        <TextButton onClick={reset} className="pl-4">
          Start over
        </TextButton>
      </div>
      <p className="text-[17px] leading-[25px] font-semibold" style={{ textWrap: "pretty" }}>
        {state.prompt ?? "Your usual trip home"}
      </p>
      {heard !== null && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="caps mr-1">Heard</span>
          {heard.companions !== null && (
            <Heard label="Travellers" value={String(heard.companions + 1)} />
          )}
          {heard.month !== null && (
            <Heard label="Month" value={MONTH_NAMES[heard.month] ?? ""} />
          )}
          {heard.destination !== null && (
            <Heard label="To" value={cityOf(heard.destination)} />
          )}
          {heard.nights !== null && (
            <Heard
              label="Nights"
              value={heard.nights === 7 ? "a week" : String(heard.nights)}
            />
          )}
          {heard.tripType !== null && (
            <Heard
              label="Trip"
              value={heard.tripType === "backpacking" ? "backpacking" : "city break"}
            />
          )}
          {heard.origin === null && draft !== null && (
            <Heard label="From" value={cityOf(draft.origin.value)} guessed />
          )}
        </div>
      )}
    </div>
  );

  if (phase === "thinking") {
    return (
      <AppShell header={<AppHeader user={names[0]} withAvatar />}>
        {youSaid}
        <div role="status" className="flex flex-col items-center gap-7 pt-20 pb-10">
          <ThinkingAvatar />
          <p className="text-center text-[17px] leading-6 font-semibold">
            {profile.coldStart ? "Building your week…" : "Rebuilding your usual…"}
          </p>
        </div>
      </AppShell>
    );
  }

  if (phase === "discovery" || draft === null) {
    return (
      <AppShell header={<AppHeader user={names[0]} withAvatar />} bodyClassName="pb-8">
        {youSaid}
        <div className="mt-5">
          <Says>
            You did not name anywhere, so here is what I would pick: priced for{" "}
            {(heard?.companions ?? 0) + 1}, with nothing you did not ask for.
          </Says>
        </div>
        <div className="mt-4">
          <Suggestions
            suggestions={suggestions}
            travellers={(heard?.companions ?? 0) + 1}
            onChoose={choose}
          />
        </div>
        <SentenceSection onSubmit={run} />
      </AppShell>
    );
  }

  const itinerary = itineraryFor(draft, names[0]);
  const gifts: PriceLine[] =
    persona === "emre" && state.emre.gifts
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
  const price = withLines(breakdown(draft), gifts);
  const away = nights(draft);
  const people = draft.party.value.adults + draft.party.value.children;
  const counts = countBySource(draft);
  const saving = naivePath(draft);
  const seatLegs = itinerary.legs.length;

  const willIntro = (
    <>
      <Says>
        Here&rsquo;s your week. You told me {counts.said} things; the{" "}
        {counts.predicted + counts.profile} with a{" "}
        <span className="mine font-semibold">dotted line underneath</span> are mine. Tap one to
        see why.{" "}
        {saving !== null && (
          <>
            <Mark>The bag is in the fare: {formatFare(saving.saved)} GBP cheaper</Mark> than
            adding it at the airport.
          </>
        )}
      </Says>
      {draft.stops.value.length > 0 && (
        <div className="pg-card mt-4 flex flex-col gap-2 px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[16px] font-extrabold">
              Your week · {dateSpan(draft.departDate.value, draft.returnDate.value)}
            </span>
            <span className="text-[13px] font-semibold text-pg-ink">
              for {(heard?.companions ?? 0) + 1}
            </span>
          </div>
          <ol className="flex flex-col gap-1 text-[14px] leading-5">
            {itinerary.legs.map((leg, i) => (
              <li key={leg.flight.id} className="flex items-baseline justify-between gap-3">
                <span className="font-bold">
                  {leg.from} → {leg.to}{" "}
                  <span className="font-medium text-pg-ink">
                    {i < itinerary.legs.length - 1
                      ? `${cityOf(leg.to)} · ${draft.stops.value[i]?.nights ?? ""} nights`
                      : "Home"}
                  </span>
                </span>
                <span className="tabular text-[13px] text-pg-ink">{shortDate(leg.date)}</span>
              </li>
            ))}
          </ol>
          <p className="text-[13px] leading-[18px] text-pg-ink">
            Why {MONTH_NAMES[Number(draft.departDate.value.slice(5, 7)) - 1]}: balloons fly
            most mornings, before peak fares. Your mates book their own, with the seats beside
            you held.
          </p>
        </div>
      )}
      <Thumbs
        question="Did we get your trip right?"
        value={state.thumbs}
        onPick={(v) => {
          update({ thumbs: v });
          setThumbsDown(v === "down");
        }}
        open={thumbsDown}
        options={[
          {
            label: "Actually: a city break",
            onPick: () => {
              const route = stopsFor(draft.destination.value, away ?? 7, "cityBreak");
              if (route !== null) {
                setDraft({
                  ...draft,
                  stops: { value: route.stops, source: "said", why: "You said so." },
                  package: {
                    value: "light",
                    source: "predicted",
                    why: "A city break with a small bag: the cheapest fare.",
                  },
                  checkedKg: {
                    value: 0,
                    source: "predicted",
                    why: "No hold bag for a city break.",
                  },
                  cabinBag: {
                    value: true,
                    source: "predicted",
                    why: "A cabin bag, 17.00 a leg.",
                  },
                });
              }
              setThumbsDown(false);
            },
          },
          {
            label: "Wrong month",
            onPick: () => setThumbsDown(false),
          },
        ]}
        reply={
          thumbsDown
            ? null
            : draft.stops.source === "said"
              ? "Re-ranked: Istanbul first, then the balloons, home from Kayseri."
              : null
        }
      />
    </>
  );

  const birthday = MOMENT.occasion;
  const emreIntro = (
    <>
      <Says>
        Your usual, rebuilt from last June: the Friday {itinerary.out?.flight.departs}, SAVER,
        seat {itinerary.out?.seats[0]}, back on the {weekdayName(draft.returnDate.value ?? "")}
        . <Mark>All in, {formatFare(price.total)} GBP.</Mark> Mum&rsquo;s birthday is{" "}
        {dayLongMonth(birthday)}.
      </Says>
      <Thumbs
        question="Did we get it right?"
        value={state.emre.corrected === null ? null : "down"}
        onPick={(v) => setThumbsDown(v === "down")}
        open={thumbsDown}
        prefix="Not quite:"
        options={[
          {
            label: "return date",
            onPick: () => {
              const back = shift(birthday, 1);
              setDraft({
                ...draft,
                returnDate: {
                  value: back,
                  source: "said",
                  why: `You're staying for the birthday. Next time I'll ask.`,
                },
              });
              update((prev) => ({ emre: { ...prev.emre, corrected: "return date" } }));
              setThumbsDown(false);
            },
          },
          { label: "seat", onPick: () => setThumbsDown(false) },
          { label: "bags", onPick: () => setThumbsDown(false) },
          { label: "flight time", onPick: () => setThumbsDown(false) },
        ]}
        reply={
          state.emre.corrected !== null && !thumbsDown
            ? `Changed: back on ${shortDate(draft.returnDate.value ?? "")}, the day after the birthday. Next time I'll ask about the return.`
            : null
        }
      />
    </>
  );

  const giftsOffer =
    persona === "emre" && !state.emre.gifts ? (
      <section aria-label="Room for presents" className="pg-card mt-3 flex flex-col gap-3 p-5">
        <h2 className="text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
          Room for presents?
        </h2>
        <div className="flex flex-col gap-2.5">
          <OfferLine
            title="Taking gifts home? Add 15 kg to your bag."
            price={GIFTS.extraWeight.perLeg}
          />
          <OfferLine
            title="Turkish delight for Mum 🎂"
            detail="Pre-order from Pegasus Café, ready at your seat."
            price={GIFTS.delight.perLeg}
          />
        </div>
        <PrimaryButton
          className="w-full"
          onClick={() => update((prev) => ({ emre: { ...prev.emre, gifts: true } }))}
        >
          Add both · +{formatFare(GIFTS.extraWeight.perLeg + GIFTS.delight.perLeg)} GBP
        </PrimaryButton>
        <p className="text-[12px] leading-[18px] text-pg-ink">
          Offered because it&rsquo;s a birthday trip. Ignore it and I won&rsquo;t ask again.
        </p>
      </section>
    ) : null;

  const seatLetter = itinerary.out?.seats[0]?.slice(-1) ?? "A";
  const squadRow = itinerary.out?.seats[0]?.slice(0, -1) ?? String(SQUAD.row);

  return (
    <AppShell
      header={<AppHeader user={names[0]} withAvatar />}
      bodyClassName="pt-4 pb-7"
      footer={
        <TotalFooter
          line={`${people} travelling${away === null ? "" : `, ${away} nights`}`}
          total={`${formatFare(price.total)} GBP`}
        >
          <PrimaryButton
            onClick={() => router.push(persona === "emre" ? "/emre/checkout" : "/checkout")}
          >
            {persona === "emre" ? "Confirm" : "Checkout"}
          </PrimaryButton>
        </TotalFooter>
      }
      overlay={
        seatSheet && itinerary.out !== null ? (
          <SeatSheet
            title={persona === "will" ? "Grab the window?" : `Keep ${itinerary.out.seats[0]}?`}
            row={Number(squadRow)}
            seats={
              persona === "will"
                ? [
                    { letter: "A", name: names[0] ?? null },
                    { letter: "B", name: FRIENDS[0]?.name ?? null, held: true },
                    { letter: "C", name: FRIENDS[1]?.name ?? null, held: true },
                    { letter: "D", name: null },
                    { letter: "E", name: null },
                    { letter: "F", name: null },
                  ]
                : ["A", "B", "C", "D", "E", "F"].map((letter) => ({
                    letter,
                    name: letter === seatLetter ? (names[0] ?? null) : null,
                  }))
            }
            you={seatLetter}
            perLeg={7}
            legs={seatLegs}
            included={draft.seating.value !== "none"}
            says={
              persona === "will"
                ? `${itinerary.out.flight.departs} departure. Grab the window and sleep; ${FRIENDS.map((f) => firstName(f.name)).join(" and ")} will see the seats next to you when they book.`
                : "Your usual. Say if you'd rather sit anywhere this time."
            }
            cta={
              draft.seating.value === "none"
                ? `Take ${squadRow}${seatLetter} · +${formatFare(7 * seatLegs)} GBP`
                : `Keep ${squadRow}${seatLetter}`
            }
            onTake={() => {
              if (draft.seating.value === "none") {
                setDraft({
                  ...draft,
                  seating: { value: "window", source: "said", why: "You took the window." },
                });
              }
              setSeatSheet(false);
            }}
            onAnywhere={() => {
              setDraft({
                ...draft,
                seating: { value: "none", source: "said", why: "You'll sit anywhere." },
              });
              setSeatSheet(false);
            }}
            onClose={() => setSeatSheet(false)}
          />
        ) : undefined
      }
    >
      {persona === "will" ? youSaid : null}
      <div className={persona === "will" ? "mt-5" : ""}>
        {persona === "emre" ? emreIntro : willIntro}
      </div>
      <Ticket
        draft={draft}
        onChange={setDraft}
        names={names}
        owner={names[0]}
        onSeat={() => setSeatSheet(true)}
        seatLabel={draft.seating.value === "none" ? "At check-in" : undefined}
        seatDotted={draft.seating.source !== "said"}
        between={giftsOffer}
        extraLines={gifts}
      />
      <SentenceSection onSubmit={run} />
    </AppShell>
  );
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** One thing the companion heard, as a chip. Dotted when it had to guess. */
function Heard({
  label,
  value,
  guessed = false,
}: {
  label: string;
  value: string;
  guessed?: boolean;
}) {
  return (
    <span className="flex h-7 items-center gap-1.5 rounded-full bg-pg-surface pr-2.5 pl-2.5 text-[12px]">
      <span className="font-semibold text-pg-ink">{label}</span>
      <span className={`font-extrabold ${guessed ? "mine" : ""}`}>{value}</span>
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#6B7684"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 20h4l10-10-4-4L4 16v4Z" />
      </svg>
    </span>
  );
}

function OfferLine({
  title,
  detail,
  price,
}: {
  title: string;
  detail?: string;
  price: number;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[14px] bg-pg-surface px-4 py-3">
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] leading-5 font-bold">{title}</span>
        {detail !== undefined && (
          <span className="text-[13px] leading-[18px] text-pg-ink">{detail}</span>
        )}
      </span>
      <span className="tabular shrink-0 text-[15px] font-bold">{formatFare(price)}</span>
    </div>
  );
}

/**
 * One-tap feedback, Uber-style. The thumbs tell the companion exactly what it
 * got wrong, so each prediction improves. A down vote opens a short list of
 * what it could have been; nothing here is a text box.
 */
export function Thumbs({
  question,
  value,
  onPick,
  open,
  prefix,
  options,
  reply,
}: {
  question: string;
  value: "up" | "down" | null;
  onPick: (v: "up" | "down") => void;
  open: boolean;
  prefix?: string;
  options: { label: string; onPick: () => void }[];
  reply: string | null;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2 px-1">
      <div className="flex items-center gap-2.5">
        <span className="text-[13px] font-semibold text-pg-ink">{question}</span>
        {(["up", "down"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-label={v === "up" ? "Yes, that's right" : "Not quite"}
            aria-pressed={value === v}
            onClick={() => onPick(v)}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] ${
              value === v
                ? "bg-pg-navy text-white"
                : "bg-white shadow-[0_1px_2px_rgba(31,42,55,0.08)]"
            }`}
          >
            {v === "up" ? "👍" : "👎"}
          </button>
        ))}
        {value === "up" && (
          <span className="text-[12px] font-semibold text-pg-ink">Thanks. Noted.</span>
        )}
      </div>
      {open && (
        <div className="fade flex flex-wrap items-center gap-1.5">
          {prefix !== undefined && (
            <span className="text-[13px] font-semibold text-pg-ink">{prefix}</span>
          )}
          {options.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={o.onPick}
              className="h-8 rounded-full bg-white px-3 text-[13px] font-bold shadow-[0_1px_2px_rgba(31,42,55,0.08)]"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {reply !== null && (
        <p className="fade text-[13px] leading-[18px] font-semibold">{reply}</p>
      )}
    </div>
  );
}

/** The input under a ticket. The ask is no longer "where", it is "what else". */
export function SentenceSection({ onSubmit }: { onSubmit: (text: string) => void }) {
  return (
    <div className="mt-7 flex flex-col gap-3">
      <h2 className="caps px-1">Change it in a sentence</h2>
      <SentenceBox
        label="Change the trip in a sentence"
        placeholder="Make it the 20th instead. Or add a bag. Or start again somewhere else."
        action="Redo it"
        onSubmit={onSubmit}
      />
    </div>
  );
}

export function cityName(code: string): string {
  return AIRPORTS[code as keyof typeof AIRPORTS]?.city ?? code;
}

export type { ReactNode };
