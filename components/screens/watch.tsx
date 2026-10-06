"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useJourney } from "@/components/journey-provider";
import { AppShell, StatusBar } from "@/components/ui/app-shell";
import { Avatar, Says } from "@/components/ui/avatar";
import {
  CloseIcon,
  Initials,
  PlusIcon,
  PrimaryButton,
  Sparkle,
  Tag,
  TextButton,
} from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { Chip } from "./change-panel";
import { AIRPORTS, type AirportCode } from "@/lib/journey/flights";
import {
  CHECK_TIME,
  INTENT,
  PROPOSAL_DATE,
  QUIET_DATE,
  WATCH_START,
  bestToday,
  checkMorning,
  dayMonth,
  daysBetween,
  deadlineDate,
  grouped,
  mornings,
  shift,
  type WatchIntent,
} from "@/lib/watch/watch";
import { dateSpan, dayOfWeek } from "@/lib/demo/hero";

/**
 * My Flights, where a watch lives.
 *
 * Three states of one card. Empty: the companion asks for a trip, even one
 * without dates. Watching: the title, today's best, and how many times it has
 * spoken. A quiet morning: the largest text on the screen is "Nothing to say."
 *
 * The watch card has no avatar, no yellow and no motion. Restraint nobody can
 * see reads as no restraint at all, so the card counts the days it stayed
 * quiet and shows them.
 */
export function useIntent(): WatchIntent {
  const { state } = useJourney();
  return {
    ...INTENT,
    where: INTENT.where.filter((code) => !state.watch.excluded.includes(code)),
    cap: state.watch.capRaisedTo ?? INTENT.cap,
  };
}

const SUGGESTED = [
  { title: "Half term in Türkiye", when: "every October" },
  { title: "Berlin for work", when: "about monthly" },
  { title: "Mum's visit", when: "spring" },
];

export function MyFlightsScreen({
  mode = "normal",
}: {
  /** "quiet": the morning nothing happened. "decline": the Not-this-one sheet. */
  mode?: "normal" | "quiet" | "decline";
}) {
  const router = useRouter();
  const { state, update } = useJourney();
  const intent = useIntent();
  const [picked, setPicked] = useState<"place" | "dates" | "price" | null>(null);
  // The place the sheet asks about is the one proposed this morning, fixed when
  // the sheet opens: striking it off must not move the question.
  const [proposed] = useState<AirportCode>(
    () => bestToday(intent, PROPOSAL_DATE)?.code ?? INTENT.where[0] ?? "ADB",
  );

  if (!state.watch.set && mode === "normal") {
    return (
      <AppShell active="My Flights" bodyClassName="pt-4">
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
              I&rsquo;ll watch for it.
            </p>
          </div>
          <div className="mt-[18px] flex flex-col gap-2">
            {SUGGESTED.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => router.push(i === 0 ? "/flights/watch" : "/flights/watch")}
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
        </section>
      </AppShell>
    );
  }

  const declined = state.watch.excluded.length > 0;
  const quietDate = declined ? QUIET_DATE : shift(PROPOSAL_DATE, -1);
  const date = mode === "quiet" ? quietDate : WATCH_START;
  const history = mornings(intent, date);
  const spoken = history.filter((m) => m.verdict !== "silent").length + (declined ? 1 : 0);
  const today = history[history.length - 1] ?? checkMorning(intent, date, spoken);
  const best = today.best;
  const days = daysBetween(WATCH_START, date) + 1;

  return (
    <AppShell
      active="My Flights"
      bodyClassName="pt-4"
      overlay={
        mode === "decline" ? (
          <Sheet
            label="Not this one"
            onClose={() => router.push("/flights")}
            className="pb-11"
          >
            <div className="mt-5 flex items-start gap-3">
              <Avatar size={44} />
              <h2
                className="pt-0.5 text-[20px] leading-[27px] font-extrabold tracking-[-0.01em]"
                style={{ textWrap: "pretty" }}
              >
                Noted. Was it {AIRPORTS[proposed].city}, the dates, or the price?
              </h2>
            </div>
            <div className="mt-[18px] flex flex-wrap gap-2">
              {(
                [
                  ["place", AIRPORTS[proposed].city],
                  ["dates", "Those dates"],
                  ["price", "The price"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={picked === key}
                  onClick={() => {
                    setPicked(key);
                    if (key === "place") {
                      update((prev) => ({
                        watch: {
                          ...prev.watch,
                          excluded: [...new Set([...prev.watch.excluded, proposed])],
                          spoken: prev.watch.spoken + 1,
                        },
                      }));
                    }
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
                {picked === "place"
                  ? `${AIRPORTS[proposed].city} is off this trip. Still watching ${intent.where
                      .filter((c) => c !== proposed)
                      .map((c) => AIRPORTS[c].city)
                      .join(" and ")} under ${grouped(intent.cap)}.`
                  : picked === "dates"
                    ? "Noted. I'll stop proposing that week and keep the rest as it was."
                    : `Noted. I'll only bring you something well under ${grouped(intent.cap)}.`}
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
        aria-label={`Watching: ${intent.title}`}
        className="pg-card mt-4 flex flex-col p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="caps">Watching</span>
          <TextButton
            href="/flights/watch"
            ariaLabel="Edit this watch"
            className="-my-3.5 pl-4"
          >
            Edit
          </TextButton>
        </div>
        <h2 className="mt-1.5 text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
          {intent.title}
        </h2>
        {mode === "decline" || declined ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {INTENT.where.map((code) => {
              const off =
                state.watch.excluded.includes(code) ||
                (mode === "decline" && picked === "place" && code === proposed);
              return (
                <span
                  key={code}
                  className={`h-7 rounded-full px-[11px] text-[13px] leading-7 font-bold ${
                    off
                      ? "text-pg-ink line-through shadow-[inset_0_0_0_1.5px_#E3E8EF]"
                      : "bg-pg-surface text-pg-navy"
                  }`}
                >
                  {AIRPORTS[code].city}
                </span>
              );
            })}
          </div>
        ) : null}
        {mode === "quiet" ? (
          <>
            <p className="tabular mt-3 text-[15px] leading-[22px] text-pg-ink">
              Checked at {CHECK_TIME}.{" "}
              {best === null
                ? "Nothing is flying on these dates yet."
                : `Best is still ${grouped(best.total)}, ${
                    today.margin !== null && today.margin < 0
                      ? "over your cap"
                      : "under your cap"
                  }.`}
            </p>
            <p className="mt-1.5 text-[24px] leading-[30px] font-extrabold tracking-[-0.02em]">
              Nothing to say.
            </p>
            <div className="mt-5 flex flex-col gap-2.5 border-t border-pg-line pt-3.5">
              <div
                role="img"
                aria-label={`${days} days watched, spoken on ${spoken} of them`}
                className="grid gap-[5px]"
                style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
              >
                {history.map((m) => (
                  <span
                    key={m.date}
                    className={`h-2 rounded-full ${
                      m.verdict !== "silent"
                        ? "bg-pg-navy"
                        : "shadow-[inset_0_0_0_1.5px_#C3CCD8]"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[13px] leading-[18px] font-extrabold">
                Spoken: {spoken} time{spoken === 1 ? "" : "s"} in {days} days.
              </span>
            </div>
          </>
        ) : mode === "normal" ? (
          <>
            <p className="tabular mt-3 text-[15px] leading-[22px]">
              {best === null
                ? "Nothing is flying on these dates yet."
                : `Best today: ${grouped(best.total)} GBP — ${
                    today.margin !== null && today.margin < 0
                      ? `over your cap by ${grouped(-today.margin)}`
                      : `under your cap by ${grouped(today.margin ?? 0)}`
                  }`}
            </p>
            <div className="mt-3 flex justify-between gap-3 border-t border-pg-line pt-3 text-[13px] leading-[18px] text-pg-ink">
              <span>Checked this morning</span>
              <span>
                Spoken: {spoken} time{spoken === 1 ? "" : "s"}
              </span>
            </div>
          </>
        ) : null}
      </section>
      {mode === "normal" && (
        <p className="mt-4 px-1 text-[13px] leading-[18px] text-pg-ink">
          The watch runs every morning at {CHECK_TIME}. Use the scenes panel to jump to a
          morning.
        </p>
      )}
    </AppShell>
  );
}

/**
 * The intent sheet. No input boxes: each row is a tolerance with a provenance
 * tag. A week strip, removable place chips, a cap bar, must-have chips, a
 * two-option buy rule. Dotted outline or underline means the companion filled
 * it; the budget is solid because Jack said it.
 */
export function IntentSheetScreen() {
  const router = useRouter();
  const { state, update } = useJourney();
  const base = useIntent();
  const [where, setWhere] = useState<AirportCode[]>(base.where);
  const [who, setWho] = useState<string[]>(base.who);
  const [cap, setCap] = useState(base.cap);
  const [must, setMust] = useState<string[]>(base.mustHave);
  const [buyRule, setBuyRule] = useState(base.buyRule);
  const [weekShift, setWeekShift] = useState(0);
  const [editing, setEditing] = useState<
    "when" | "who" | "budget" | "must" | "deadline" | null
  >(null);
  const [deadlineDays, setDeadlineDays] = useState(base.deadlineDays);

  const from = shift(base.from, weekShift * 7);
  const to = shift(base.to, weekShift * 7);
  const intent: WatchIntent = {
    ...base,
    where,
    who,
    cap,
    mustHave: must,
    buyRule,
    from,
    to,
    deadlineDays,
  };
  const week = Array.from({ length: 7 }, (_, i) => shift(from, i));
  const capPercent = Math.min(100, Math.max(8, Math.round(((cap - 600) / 1100) * 100)));
  const candidates = (Object.keys(AIRPORTS) as AirportCode[]).filter(
    (c) =>
      AIRPORTS[c].country === "Turkiye" && !where.includes(c) && c !== "SAW" && c !== "IST",
  );
  const toggleEdit = (key: typeof editing) => setEditing((e) => (e === key ? null : key));

  return (
    <div className="relative flex h-full flex-col bg-[#7E868F] text-pg-navy">
      <StatusBar tone="light" />
      <section
        role="dialog"
        aria-label={intent.title}
        className="rise flex min-h-0 flex-1 flex-col rounded-t-[28px] bg-white"
        style={{ boxShadow: "var(--shadow-sheet)" }}
      >
        <div className="flex flex-col px-5 pt-2.5">
          <span aria-hidden className="h-[5px] w-10 self-center rounded-[3px] bg-pg-line" />
          <div className="mt-3.5 flex items-center justify-between gap-3">
            <h1 className="text-[26px] leading-8 font-extrabold tracking-[-0.02em]">
              {intent.title}
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
          <Row label="When" tag="profile" onChange={() => toggleEdit("when")}>
            <span className="mine text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
              {dateSpan(from, to)}
            </span>
            <div
              role="img"
              aria-label={`${dayMonth(from)} to ${dayMonth(to)}`}
              className="grid grid-cols-7 rounded-[14px] bg-pg-navy px-1.5 text-white"
            >
              {week.map((d) => {
                const { letter, day } = dayOfWeek(d);
                return (
                  <span key={d} className="flex flex-col items-center gap-px py-[7px]">
                    <span className="text-[10px] leading-3 font-bold opacity-70">
                      {letter}
                    </span>
                    <span className="tabular text-[15px] leading-[18px] font-extrabold">
                      {day}
                    </span>
                  </span>
                );
              })}
            </div>
            {editing === "when" && (
              <div className="flex gap-1.5">
                <Chip on={false} onClick={() => setWeekShift((w) => w - 1)}>
                  A week earlier
                </Chip>
                <Chip on={false} onClick={() => setWeekShift((w) => w + 1)}>
                  A week later
                </Chip>
              </div>
            )}
            <Reason>School dates, same week as last year.</Reason>
          </Row>

          <Row label="Where" tag="profile">
            <div className="flex flex-wrap items-center gap-2">
              {where.map((code, i) => (
                <span key={code} className="contents">
                  {i === where.length - 1 && where.length > 1 && (
                    <span className="text-[15px] font-semibold text-pg-ink">or</span>
                  )}
                  <span className="flex h-[38px] items-center gap-1 rounded-full border-2 border-dotted border-pg-orange pl-3.5 text-[16px] font-extrabold">
                    {AIRPORTS[code].city}
                    <button
                      type="button"
                      aria-label={`Remove ${AIRPORTS[code].city}`}
                      onClick={() => setWhere((w) => w.filter((c) => c !== code))}
                      className="flex h-[30px] w-[30px] items-center justify-center"
                    >
                      <CloseIcon size={14} color="#6B7684" />
                    </button>
                  </span>
                </span>
              ))}
              <button
                type="button"
                aria-label="Add a place"
                onClick={() => toggleEdit("where" as never)}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-pg-surface"
              >
                <PlusIcon size={16} />
              </button>
            </div>
            {(editing as string) === "where" && candidates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {candidates.map((code) => (
                  <Chip key={code} on={false} onClick={() => setWhere((w) => [...w, code])}>
                    {AIRPORTS[code].city}
                  </Chip>
                ))}
              </div>
            )}
            <Reason>Anywhere you&rsquo;ve been that week before. Add or remove.</Reason>
          </Row>

          <Row label="Who" tag="profile" onChange={() => toggleEdit("who")}>
            <div className="flex items-center gap-3">
              <div aria-hidden className="flex">
                {who.map((name, i) => (
                  <Initials
                    key={name}
                    name={name.split(" ")[0] ?? name}
                    size={32}
                    className={`ring-2 ring-white ${i > 0 ? "-ml-2" : ""}`}
                  />
                ))}
              </div>
              <span className="mine text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
                {who.map((n) => n.split(" ")[0]).join(", ")}
                {who.includes("Mila Field") && " (4)"}
              </span>
            </div>
            {editing === "who" && (
              <div className="flex flex-wrap gap-1.5">
                {INTENT.who.map((name) => (
                  <Chip
                    key={name}
                    on={who.includes(name)}
                    onClick={() =>
                      setWho((w) =>
                        w.includes(name)
                          ? w.filter((n) => n !== name)
                          : INTENT.who.filter((n) => n === name || w.includes(n)),
                      )
                    }
                  >
                    {name.split(" ")[0]}
                  </Chip>
                ))}
              </div>
            )}
          </Row>

          <Row label="All-in budget" tag="said" onChange={() => toggleEdit("budget")}>
            <span className="tabular text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
              under {grouped(cap)} GBP
            </span>
            {editing === "budget" ? (
              <input
                type="range"
                min={800}
                max={1700}
                step={50}
                value={cap}
                aria-label="All-in budget"
                onChange={(e) => setCap(Number(e.target.value))}
                className="w-full accent-pg-navy"
              />
            ) : (
              <div
                role="img"
                aria-label={`Anything up to a cap of ${grouped(cap)} GBP`}
                className="relative h-[22px]"
              >
                <span className="absolute inset-x-0 top-[7px] h-2 rounded bg-pg-line" />
                <span
                  className="absolute top-[7px] left-0 h-2 rounded-l bg-pg-navy"
                  style={{ width: `${capPercent}%` }}
                />
                <span
                  className="absolute top-0 h-[22px] w-[3px] rounded-sm bg-pg-navy"
                  style={{ left: `${capPercent}%` }}
                />
              </div>
            )}
          </Row>

          <Row label="Must have" tag="profile" onChange={() => toggleEdit("must")}>
            <div className="flex flex-wrap gap-2">
              {(editing === "must" ? INTENT.mustHave : must).map((item) => {
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
          </Row>

          <Row label="When to buy">
            <div role="radiogroup" aria-label="When to buy" className="flex flex-col gap-2">
              {(
                [
                  ["ask", "Ask me first"],
                  ["book", "Just book it, up to my cap"],
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
                      className={`h-[22px] w-[22px] shrink-0 rounded-full ${
                        on
                          ? "border-[7px] border-pg-navy"
                          : "border-2 border-[#9AA5B4] bg-white"
                      }`}
                    />
                    <span className={`text-[17px] ${on ? "font-extrabold" : "font-semibold"}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Row>

          <Row label="Deadline" tag="predicted" onChange={() => toggleEdit("deadline")}>
            <span className="mine self-start text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
              {deadlineDays} days before
            </span>
            {editing === "deadline" && (
              <div className="flex flex-wrap gap-1.5">
                {[14, 21, 28].map((d) => (
                  <Chip key={d} on={deadlineDays === d} onClick={() => setDeadlineDays(d)}>
                    {d} days
                  </Chip>
                ))}
              </div>
            )}
            <Reason>
              If nothing qualifies by {dayMonth(deadlineDate(intent))} I&rsquo;ll bring you the
              best there is and let you decide.
            </Reason>
          </Row>

          <div className="mt-1 border-t border-pg-line pt-[18px] pb-5">
            <Says>
              I&rsquo;ll check every morning. I&rsquo;ll only speak when something changes. If
              nothing changes, you won&rsquo;t hear from me.
            </Says>
          </div>
        </div>
        <div className="shrink-0 border-t border-pg-line px-5 pt-3 pb-[30px]">
          <PrimaryButton
            size="lg"
            onClick={() => {
              update({
                watch: {
                  ...state.watch,
                  set: true,
                  excluded: INTENT.where.filter((c) => !where.includes(c)),
                  capRaisedTo: cap === INTENT.cap ? null : cap,
                },
              });
              router.push("/flights");
            }}
          >
            {state.watch.set ? "Keep watching" : "Watch for it"}
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
