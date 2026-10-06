"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Thinking, useAgentRun } from "@/components/agent-provider";
import { useJourney } from "@/components/journey-provider";
import { AppHeader, AppShell, StatusBar } from "@/components/ui/app-shell";
import { traceFor } from "@/lib/agent/trace";
import { Avatar, Says } from "@/components/ui/avatar";
import { LockCard, LockScreen } from "@/components/ui/lock-screen";
import {
  AppIcon,
  ChevronDown,
  CloseIcon,
  FaceIdIcon,
  Initials,
  PassIcon,
  PlusIcon,
  PrimaryButton,
  SecondaryButton,
  Sparkle,
  Tag,
  TextButton,
} from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { HomeScreen } from "./home-screen";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { priceOf } from "@/lib/assistant/price";
import { AIRPORTS, formatFare } from "@/lib/journey/flights";
import {
  MOMENT,
  checkMorning,
  momentDates,
  mornings,
  nudgeDate,
  watchStart,
  type BuyRule,
  type MomentState,
} from "@/lib/moments/moments";
import {
  EMRE,
  dateSpan,
  dayLongMonth,
  dayMonth,
  dayOfWeek,
  daysBetween,
  emreDraft,
  longDate,
  money,
  shift,
  weekdayName,
} from "@/lib/demo/personas";

/**
 * The Moments agent, in the canvas's Part 3 designs.
 *
 * My Flights holds the trips the companion knows about. Mum's birthday is one:
 * a sheet of tolerances with a provenance tag on each row, and a nudge rule.
 * Two months out, the companion speaks on the lock screen with Why I spoke;
 * one tap approves his usual, Look opens the ticket, Not this year keeps it
 * quiet until next April. The mornings in between it says nothing, and the
 * watch card counts them.
 */
function useMomentState(): MomentState {
  const { state } = useJourney();
  return {
    declined: state.moment.declined,
    never: state.moment.never,
    booked: state.emre.booked || state.moment.approved,
    spoken: state.moment.spoken,
  };
}

const KNOWN = [
  { title: MOMENT.title, when: "every June" },
  { title: "Work in Ankara", when: "about monthly" },
  { title: "Summer in Bodrum", when: "August" },
];

export function MyFlightsScreen({
  mode = "normal",
}: {
  mode?: "normal" | "quiet" | "decline";
}) {
  const router = useRouter();
  const { state, update } = useJourney();
  const momentState = useMomentState();
  const dates = momentDates();
  const [picked, setPicked] = useState<"year" | "never" | null>(null);
  const ready = useAgentRun(
    `flights:${mode}:${state.moment.set}:${momentState.declined}:${momentState.never}:${momentState.booked}`,
    () =>
      traceFor(
        mode === "quiet"
          ? "/moment/quiet"
          : mode === "decline"
            ? "/moment/not-this-year"
            : "/flights",
        state,
      ),
  );

  if (!ready) {
    return (
      <Thinking
        label={mode === "quiet" ? "Checking this morning…" : "Looking at your past trips…"}
        header={<AppHeader user={EMRE.travellers[0]?.name} />}
      />
    );
  }

  if (!state.moment.set && mode === "normal") {
    return (
      <AppShell
        header={<AppHeader user={EMRE.travellers[0]?.name} />}
        active="My Flights"
        bodyClassName="pt-4"
      >
        <h1 className="text-[28px] leading-[34px] font-extrabold tracking-[-0.02em]">
          My Flights
        </h1>
        <section aria-label="Trips I'm watching" className="pg-card mt-4 flex flex-col p-5">
          <h2 className="caps">Trips I&rsquo;m watching</h2>
          <div className="mt-3.5 flex items-start gap-3.5">
            <Avatar size={56} />
            <p
              className="pt-0.5 text-[17px] leading-[25px] font-semibold"
              style={{ textWrap: "pretty" }}
            >
              Tell me about a trip you&rsquo;ll take, even if you don&rsquo;t know when.
              I&rsquo;ll bring it up at the right moment.
            </p>
          </div>
          <div className="mt-[18px] flex flex-col gap-2">
            {KNOWN.map((s) => (
              <button
                key={s.title}
                type="button"
                onClick={() => router.push("/flights/moment")}
                className="flex min-h-12 items-center gap-2.5 rounded-2xl bg-pg-surface pr-3.5 pl-4 text-left"
              >
                <Sparkle />
                <span className="flex-1 text-[15px] leading-5">
                  <strong className="font-extrabold">{s.title}</strong>{" "}
                  <span className="text-pg-ink">· {s.when}</span>
                </span>
                <PlusIcon />
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-[18px] text-pg-ink">
            Learned from your past trips. Tap one to see what I remembered.
          </p>
        </section>
      </AppShell>
    );
  }

  const date = mode === "quiet" ? dates.quiet : watchStart(MOMENT);
  const history = mornings(MOMENT, date, momentState);
  const spoken = history.filter((m) => m.verdict !== "silent").length;
  const days = history.length;
  const until = daysBetween(date, MOMENT.occasion);

  return (
    <AppShell
      header={<AppHeader user={EMRE.travellers[0]?.name} />}
      active="My Flights"
      bodyClassName="pt-4"
      overlay={
        mode === "decline" ? (
          <Sheet
            label="Not this year"
            onClose={() => router.push("/flights")}
            className="pb-11"
          >
            <div className="mt-5 flex items-start gap-3">
              <Avatar size={44} />
              <h2
                className="pt-0.5 text-[20px] leading-[27px] font-extrabold tracking-[-0.01em]"
                style={{ textWrap: "pretty" }}
              >
                Noted. Not this year, or never?
              </h2>
            </div>
            <div className="mt-[18px] flex flex-wrap gap-2">
              {(
                [
                  ["year", "Not this year"],
                  ["never", "Don't suggest again"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={picked === key}
                  onClick={() => {
                    setPicked(key);
                    update((prev) => ({
                      moment: {
                        ...prev.moment,
                        set: true,
                        declined: key === "year",
                        never: key === "never",
                        spoken: prev.moment.spoken + 1,
                      },
                    }));
                  }}
                  className={`flex h-12 items-center gap-1.5 rounded-full text-[15px] ${
                    picked === key
                      ? "bg-pg-navy pr-4 pl-3 font-extrabold text-white"
                      : "bg-pg-surface px-4 font-bold"
                  }`}
                >
                  {picked === key && (
                    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
                      <path
                        d="M4.5 10.5l3.5 3.5 7.5-8"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {label}
                </button>
              ))}
            </div>
            {picked !== null && (
              <p
                className="fade mt-5 border-t border-pg-line pt-[18px] text-[17px] leading-[25px] font-semibold"
                style={{ textWrap: "pretty" }}
              >
                {picked === "year"
                  ? `Noted. You won't hear about ${dayLongMonth(MOMENT.occasion)} again until next April.`
                  : "Done. You won't hear about this again, and it won't come back next year."}
              </p>
            )}
            {picked !== null && (
              <PrimaryButton className="mt-5 w-full" onClick={() => router.push("/flights")}>
                Done
              </PrimaryButton>
            )}
          </Sheet>
        ) : undefined
      }
    >
      <h1 className="text-[28px] leading-[34px] font-extrabold tracking-[-0.02em]">
        My Flights
      </h1>
      <section
        aria-label={`Watching: ${MOMENT.title}`}
        className="pg-card mt-4 flex flex-col p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="caps">{momentState.never ? "Switched off" : "Watching"}</span>
          <TextButton
            href="/flights/moment"
            ariaLabel="Edit this moment"
            className="-my-3.5 pl-4"
          >
            Edit
          </TextButton>
        </div>
        <h2
          className={`mt-1.5 text-[20px] leading-[26px] font-extrabold tracking-[-0.01em] ${momentState.never ? "text-pg-ink line-through" : ""}`}
        >
          {MOMENT.title}
        </h2>
        {mode === "quiet" ? (
          <>
            <p className="tabular mt-3 text-[15px] leading-[22px] text-pg-ink">
              Checked at 06:40. {dayLongMonth(MOMENT.occasion)} is {until} days away
              {momentState.booked
                ? " and booked"
                : momentState.declined
                  ? ", and you said not this year"
                  : "; fares haven't moved"}
              .
            </p>
            <p className="mt-1.5 text-[24px] leading-[30px] font-extrabold tracking-[-0.02em]">
              Nothing to say.
            </p>
            <div className="mt-5 flex flex-col gap-2.5 border-t border-pg-line pt-3.5">
              <div
                role="img"
                aria-label={`${days} days checked, spoken on ${spoken} of them`}
                className="grid gap-[3px]"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(days, 23)}, minmax(0, 1fr))`,
                }}
              >
                {history.slice(-23).map((m) => (
                  <span
                    key={m.date}
                    className={`h-2 rounded-full ${m.verdict !== "silent" ? "bg-pg-navy" : "shadow-[inset_0_0_0_1.5px_#C3CCD8]"}`}
                  />
                ))}
              </div>
              <span className="text-[13px] leading-[18px] font-extrabold">
                Spoken: {spoken} time{spoken === 1 ? "" : "s"} in {days} days.
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-[15px] leading-[22px]">
              {momentState.never
                ? "You said don't suggest again. I won't."
                : momentState.declined
                  ? `Not this year. Back next April, unless you say otherwise.`
                  : momentState.booked
                    ? `Booked for ${dateSpan(MOMENT.out, MOMENT.back)}. I'll check you in and tell Dad.`
                    : `Next: ${dayLongMonth(MOMENT.occasion)}. I'll bring it to you around ${dayMonth(nudgeDate(MOMENT))}, while June fares are lowest.`}
            </p>
            <div className="mt-3 flex justify-between gap-3 border-t border-pg-line pt-3 text-[13px] leading-[18px] text-pg-ink">
              <span>Checked this morning</span>
              <span>
                Spoken: {spoken} time{spoken === 1 ? "" : "s"}
              </span>
            </div>
          </>
        )}
      </section>
      {mode === "normal" && (
        <p className="mt-4 px-1 text-[13px] leading-[18px] text-pg-ink">
          Every morning at 06:40. The strip under the phone jumps to a morning.
        </p>
      )}
    </AppShell>
  );
}

/**
 * The moment sheet. No input boxes: each row is a tolerance with a provenance
 * tag. The dates came from last year, the route and seat from every trip
 * before, the nudge rule from when June fares are lowest.
 */
export function MomentSheetScreen() {
  const router = useRouter();
  const { state, update } = useJourney();
  const [buyRule, setBuyRule] = useState<BuyRule>(MOMENT.buyRule);
  const [must, setMust] = useState<string[]>(MOMENT.mustHave);
  const [editing, setEditing] = useState<"must" | null>(null);
  const week = Array.from({ length: 7 }, (_, i) => shift(MOMENT.out, i - 1));
  const draft = emreDraft();
  const total = priceOf(draft);
  const ready = useAgentRun("flights:moment", () => traceFor("/flights/moment", state));

  if (!ready) return <Thinking label="Reading last June…" header={null} />;

  return (
    <div className="relative flex h-full flex-col bg-[#7E868F] text-pg-navy">
      <StatusBar tone="light" />
      <section
        role="dialog"
        aria-label={MOMENT.title}
        className="rise flex min-h-0 flex-1 flex-col rounded-t-[28px] bg-white"
        style={{ boxShadow: "var(--shadow-sheet)" }}
      >
        <div className="flex flex-col px-5 pt-2.5">
          <span aria-hidden className="h-[5px] w-10 self-center rounded-[3px] bg-pg-line" />
          <div className="mt-3.5 flex items-center justify-between gap-3">
            <h1 className="text-[26px] leading-8 font-extrabold tracking-[-0.02em]">
              {MOMENT.title}
            </h1>
            <button
              type="button"
              aria-label="Close"
              onClick={() => router.push("/flights")}
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pt-2.5">
          <Row label="When" tag="profile">
            <span className="mine text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
              {dateSpan(MOMENT.out, MOMENT.back)}
            </span>
            <div
              role="img"
              aria-label={`${dayMonth(MOMENT.out)} to ${dayMonth(MOMENT.back)}`}
              className="grid grid-cols-7 rounded-[14px] bg-pg-navy px-1.5 text-white"
            >
              {week.map((d) => {
                const { letter, day } = dayOfWeek(d);
                const on = d >= MOMENT.out && d <= MOMENT.back;
                const birthday = d === MOMENT.occasion;
                return (
                  <span
                    key={d}
                    className={`flex flex-col items-center gap-px py-[7px] ${on ? "" : "opacity-40"}`}
                  >
                    <span className="text-[10px] leading-3 font-bold opacity-70">
                      {letter}
                    </span>
                    <span
                      className={`tabular text-[15px] leading-[18px] font-extrabold ${birthday ? "rounded-full bg-pg-yellow px-1.5 text-pg-navy" : ""}`}
                    >
                      {day}
                    </span>
                  </span>
                );
              })}
            </div>
            <Reason>
              Mum&rsquo;s birthday is {weekdayName(MOMENT.occasion)}{" "}
              {dayLongMonth(MOMENT.occasion)}. The Friday before, as last year.
            </Reason>
          </Row>

          <Row label="Where" tag="profile">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-[38px] items-center rounded-full border-2 border-dotted border-pg-orange px-3.5 text-[16px] font-extrabold">
                {AIRPORTS[MOMENT.origin as keyof typeof AIRPORTS]?.city} →{" "}
                {AIRPORTS[MOMENT.destination as keyof typeof AIRPORTS]?.city}
              </span>
            </div>
            <Reason>Home. Every trip so far.</Reason>
          </Row>

          <Row label="Who" tag="profile">
            <div className="flex items-center gap-3">
              <Initials name={MOMENT.who[0] ?? "E"} size={32} className="ring-2 ring-white" />
              <span className="mine text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
                Just you
              </span>
            </div>
          </Row>

          <Row
            label="Usual"
            tag="profile"
            onChange={() => setEditing((e) => (e === "must" ? null : "must"))}
          >
            <div className="flex flex-wrap gap-2">
              {(editing === "must" ? MOMENT.mustHave : must).map((item) => {
                const on = must.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={on}
                    disabled={editing !== "must"}
                    onClick={() =>
                      setMust((m) =>
                        m.includes(item) ? m.filter((x) => x !== item) : [...m, item],
                      )
                    }
                    className={`flex h-9 items-center gap-1.5 rounded-full pr-3.5 pl-2.5 text-[15px] font-bold ${
                      on
                        ? "border-2 border-dotted border-pg-orange"
                        : "bg-pg-surface text-pg-ink"
                    }`}
                  >
                    {on && (
                      <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
                        <path
                          d="M4.5 10.5l3.5 3.5 7.5-8"
                          fill="none"
                          stroke="#1F2A37"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    {item}
                  </button>
                );
              })}
            </div>
            <Reason>
              All-in, {formatFare(total)} GBP last time. The price is up front, not at the end.
            </Reason>
          </Row>

          <Row label="When to buy">
            <div role="radiogroup" aria-label="When to buy" className="flex flex-col gap-2">
              {(
                [
                  ["ask", "Ask me first"],
                  ["book", "Just book it, same as last year"],
                ] as const
              ).map(([value, label]) => {
                const on = buyRule === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setBuyRule(value)}
                    className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left ${
                      on ? "bg-white shadow-[inset_0_0_0_2px_#1F2A37]" : "bg-pg-surface"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-[22px] w-[22px] shrink-0 rounded-full ${on ? "border-[7px] border-pg-navy" : "border-2 border-[#9AA5B4] bg-white"}`}
                    />
                    <span className={`text-[17px] ${on ? "font-extrabold" : "font-semibold"}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Row>

          <Row label="Nudge" tag="predicted">
            <span className="mine self-start text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
              Two months out
            </span>
            <Reason>
              I&rsquo;ll bring it to you around {dayMonth(nudgeDate(MOMENT))}, while June fares
              are lowest, and once more in late May if nothing is booked.
            </Reason>
          </Row>

          <div className="mt-1 border-t border-pg-line pt-[18px] pb-5">
            <Says>
              I&rsquo;ll only speak when it&rsquo;s the moment. Say not this year and you
              won&rsquo;t hear from me till next April. Say never, and never.
            </Says>
          </div>
        </div>
        <div className="shrink-0 border-t border-pg-line px-5 pt-3 pb-[30px]">
          <PrimaryButton
            size="lg"
            onClick={() => {
              update({
                moment: { ...state.moment, set: true, declined: false, never: false },
              });
              router.push("/flights");
            }}
          >
            {state.moment.set ? "Keep it" : "Remember it"}
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  tag,
  onChange,
  children,
}: {
  label: string;
  tag?: "said" | "profile" | "predicted";
  onChange?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-pg-line py-[18px]">
      <div className="flex items-center gap-2">
        <span className="caps leading-5" style={{ fontSize: 10.5 }}>
          {label}
        </span>
        {tag !== undefined && <Tag source={tag} />}
        {onChange !== undefined && (
          <TextButton
            onClick={onChange}
            ariaLabel={`Change ${label}`}
            className="-my-3 ml-auto pl-3"
          >
            Change
          </TextButton>
        )}
      </div>
      {children}
    </div>
  );
}

function Reason({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] leading-[18px] text-pg-ink" style={{ textWrap: "pretty" }}>
      {children}
    </p>
  );
}

/**
 * The nudge, two months out, as a Live Activity. Compact: the trip, the price,
 * one yellow action. Expanded: Why I spoke, approve with Face ID, look, not
 * this year.
 */
type Stage = "compact" | "expanded" | "faceid" | "booked";

export function NudgeScreen({ late = false }: { late?: boolean }) {
  const router = useRouter();
  const { state, update } = useJourney();
  const momentState = useMomentState();
  const dates = momentDates();
  const date = late ? dates.reminder : dates.nudge;
  const [stage, setStage] = useState<Stage>(state.moment.approved ? "booked" : "compact");
  const history = mornings(MOMENT, shift(date, -1), { ...momentState, booked: false });
  const spokenBefore = history.filter((m) => m.verdict !== "silent").length;
  const morning = checkMorning(MOMENT, date, {
    ...momentState,
    spoken: spokenBefore,
    booked: false,
  });
  const draft = state.emre.draft ?? emreDraft();
  const itinerary = itineraryFor(draft, EMRE.travellers[0]?.name);
  const total = priceOf(draft);
  const silent = morning.verdict === "silent" && stage !== "booked";
  const ready = useAgentRun(
    `moment:${late ? "reminder" : "nudge"}:${stage === "booked"}:${silent}`,
    () => traceFor(late ? "/moment/reminder" : "/moment/nudge", state),
  );

  useEffect(() => {
    if (silent && ready) router.replace("/moment/quiet");
  }, [silent, ready, router]);

  useEffect(() => {
    if (stage !== "faceid") return;
    const t = window.setTimeout(() => {
      update((prev) => ({
        emre: { ...prev.emre, draft, booked: true },
        moment: { ...prev.moment, set: true, approved: true, spoken: spokenBefore + 1 },
      }));
      setStage("booked");
    }, 1400);
    return () => window.clearTimeout(t);
    // The draft is deterministic; only the stage matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  if (silent) {
    // The gates held: the phone stays dark while the panel shows why, then
    // the morning moves to My Flights, where the quiet is counted.
    return (
      <LockScreen date={longDate(date)} time="08:30">
        {null}
      </LockScreen>
    );
  }

  const expanded = stage === "expanded";
  const head = (
    <div className="flex items-center gap-2">
      <AppIcon />
      <span className="text-[12px] leading-4 font-extrabold tracking-[0.06em]">PEGASUS</span>
      <span className="ml-auto text-[12px] leading-4 text-pg-ink">now</span>
    </div>
  );
  const title = `${MOMENT.title} · ${dayMonth(MOMENT.occasion)}`;

  if (stage === "booked") {
    return (
      <LockScreen date={longDate(date)} time="08:30">
        {ready && (
          <LockCard label="Pegasus Live Activity, booked">
            {head}
            <div className="mt-3.5 flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-pg-yellow"
                style={{ boxShadow: "inset 0 -3px 0 #E5A70C" }}
              >
                <svg width="26" height="26" viewBox="0 0 20 20">
                  <path
                    d="M4.5 10.5l3.5 3.5 7.5-8"
                    fill="none"
                    stroke="#1F2A37"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[22px] leading-7 font-extrabold tracking-[-0.01em]">
                  Booked ·{" "}
                  <span className="display tracking-[0.06em]">{itinerary.reference}</span>
                </span>
                <span className="tabular text-[14px] leading-5 font-semibold">
                  Trabzon {dateSpan(draft.departDate.value, draft.returnDate.value)} ·{" "}
                  {money(total)} GBP · {itinerary.out?.seats[0]}
                </span>
              </div>
            </div>
            <p
              className="mt-3.5 border-t border-pg-line pt-3 text-[14px] leading-5"
              style={{ textWrap: "pretty" }}
            >
              <Link href="/emre/confirmation" className="font-bold">
                Tap for your ticket.
              </Link>{" "}
              Taking presents?{" "}
              <Link href="/emre" className="font-bold text-pg-orange">
                Room for them is one tap.
              </Link>
            </p>
          </LockCard>
        )}
      </LockScreen>
    );
  }

  return (
    <LockScreen
      date={longDate(date)}
      time={late ? "08:30" : "08:30"}
      dim={expanded}
      bottom={expanded ? 34 : 116}
    >
      {ready && (
        <LockCard
          label={expanded ? "Pegasus Live Activity, expanded" : "Pegasus Live Activity"}
        >
          {head}
          <div className="mt-3.5 flex items-center gap-3">
            <Avatar size={52} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[16px] leading-[22px] font-extrabold">{title}</span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="flex items-baseline gap-1.5">
                  <span className="display text-[24px] leading-7 font-extrabold">
                    {money(total)}
                  </span>
                  <span className="text-[13px] font-bold">GBP</span>
                </span>
                <span className="h-[22px] rounded-full bg-pg-surface px-[9px] text-[12px] leading-[22px] font-semibold whitespace-nowrap">
                  your usual
                </span>
              </span>
            </div>
          </div>
          <p className="mt-3 text-[15px] leading-5 font-extrabold">
            {late ? "Still not booked. Fares are up." : `Your usual Friday flight to Trabzon?`}
          </p>

          {expanded && (
            <>
              <Speech title="Why I spoke" text={morning.why} />
              <p className="mt-3 flex items-start gap-2 px-1 text-[13px] leading-[18px] font-semibold text-pg-ink">
                <span className="mt-px">
                  <PassIcon />
                </span>
                <span>
                  {itinerary.out?.flight.flightNo} {itinerary.out?.flight.departs}{" "}
                  {weekdayName(draft.departDate.value).slice(0, 3)} · back{" "}
                  {weekdayName(draft.returnDate.value ?? "").slice(0, 3)}{" "}
                  {itinerary.back?.flight.flightNo} · seat {itinerary.out?.seats[0]} · SAVER.
                </span>
              </p>
              <PrimaryButton className="mt-3.5 w-full" onClick={() => setStage("faceid")}>
                <FaceIdIcon />
                Approve (Face ID)
              </PrimaryButton>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <SecondaryButton href="/moment/look">Look</SecondaryButton>
                <SecondaryButton href="/moment/not-this-year">Not this year</SecondaryButton>
              </div>
            </>
          )}

          {!expanded && (
            <>
              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <PrimaryButton
                  className="h-12 w-full px-0 text-[16px]"
                  onClick={() => setStage("faceid")}
                >
                  Yes, plan it
                </PrimaryButton>
                <SecondaryButton href="/moment/look" className="w-full">
                  Look
                </SecondaryButton>
              </div>
              <button
                type="button"
                onClick={() => setStage("expanded")}
                aria-expanded={false}
                className="mt-2.5 flex items-center justify-center gap-1 text-[12px] leading-4 font-bold text-pg-ink"
              >
                Why I spoke
                <ChevronDown size={12} />
              </button>
            </>
          )}

          {stage === "faceid" && <FaceId />}
        </LockCard>
      )}
    </LockScreen>
  );
}

/** The pale-yellow block with the tail pointing up at the avatar. */
export function Speech({ title, text }: { title: string; text: string[] }) {
  return (
    <div className="relative mt-4 flex flex-col gap-2 rounded-[20px] bg-pg-speech px-4 pt-4 pb-[18px]">
      <span
        aria-hidden
        className="absolute -top-[7px] left-[18px] h-4 w-4 rotate-45 rounded-[3px] bg-pg-speech"
      />
      <h3 className="relative flex items-center gap-2 text-[19px] leading-6 font-extrabold tracking-[-0.01em]">
        <Sparkle size={16} />
        {title}
      </h3>
      <p className="text-[15px] leading-[22px] font-medium" style={{ textWrap: "pretty" }}>
        {text.map((sentence, i) => (
          <span key={i}>
            {emphasise(sentence)}
            {i < text.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
    </div>
  );
}

/** Bold the figures and dates: anything a passenger would check. */
function emphasise(sentence: string): React.ReactNode {
  const parts = sentence.split(
    /(\d[\d,]*(?:\.\d+)? GBP|\d+%|\d+ seats|\d+ days|\d{1,2} [A-Z][a-z]+|Friday 19:05)/g,
  );
  return parts.map((part, i) =>
    /\d/.test(part) ? (
      <strong key={i} className="font-extrabold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** Face ID resolving to a tick, on system timing. */
function FaceId() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setDone(true), 800);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div
      role="status"
      aria-label={done ? "Face ID recognised" : "Face ID"}
      className="fade absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[28px] bg-white/92"
    >
      <span className="flex h-[88px] w-[88px] items-center justify-center rounded-[26px] bg-pg-navy text-white">
        {done ? (
          <svg width="44" height="44" viewBox="0 0 20 20" aria-hidden>
            <path
              d="M4.5 10.5l3.5 3.5 7.5-8"
              fill="none"
              stroke="#FDB913"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <FaceIdIcon size={48} />
        )}
      </span>
      <span className="text-[15px] font-bold">{done ? "Booked" : "Face ID"}</span>
    </div>
  );
}

/** "Look": Emre's usual trip on the home screen, with the one question that matters. */
export function LookScreen() {
  const { state, update, ready } = useJourney();
  useEffect(() => {
    if (ready && state.emre.draft === null) {
      update((prev) => ({ emre: { ...prev.emre, draft: emreDraft() }, persona: "emre" }));
    }
  }, [ready, state.emre.draft, update]);
  if (!ready || state.emre.draft === null) return null;
  return <HomeScreen persona="emre" />;
}
