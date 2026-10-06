"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useJourney } from "@/components/journey-provider";
import { Avatar } from "@/components/ui/avatar";
import { LockCard, LockScreen } from "@/components/ui/lock-screen";
import {
  AppIcon,
  ChevronDown,
  ClockIcon,
  FaceIdIcon,
  PassIcon,
  PrimaryButton,
  SecondaryButton,
  Sparkle,
} from "@/components/ui/primitives";
import { HomeScreen } from "./home-screen";
import { useIntent } from "./watch";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { naivePath, priceOf } from "@/lib/assistant/price";
import { buildDraft } from "@/lib/assistant/understand";
import { AIRPORTS, FARE_RULES } from "@/lib/journey/flights";
import { FAMILY, HERO_PROMPT, dateSpan, heroDraft, money, shortDate } from "@/lib/demo/hero";
import { firstName } from "@/lib/group/group";
import {
  CHECK_TIME,
  PROPOSAL_DATE,
  checkMorning,
  deadlineDate,
  grouped,
  longDate,
  mornings,
} from "@/lib/watch/watch";

/**
 * The Live Activity: the companion moving first, on the lock screen.
 *
 * Compact: one line, one price, one yellow action. Expanded: "Why I spoke", in
 * the first person, with the figures a passenger can check. Approve goes
 * through Face ID and the card becomes a booking without the app ever opening.
 *
 * Every proposal carries a reason. Restraint nobody can see reads as no
 * restraint at all, and a proposal nobody can check reads as a push.
 */
type Stage = "compact" | "expanded" | "faceid" | "booked";

export function LiveActivityScreen() {
  const router = useRouter();
  const { state, update } = useJourney();
  const intent = useIntent();
  const [stage, setStage] = useState<Stage>(state.watch.approved ? "booked" : "compact");

  const history = mornings(intent, PROPOSAL_DATE);
  const spokenBefore = history.slice(0, -1).filter((m) => m.verdict !== "silent").length;
  const morning = checkMorning(intent, PROPOSAL_DATE, spokenBefore);
  const draft = heroDraft();
  const itinerary = itineraryFor(draft);
  const saving = naivePath(draft);
  const total = priceOf(draft);
  const city = AIRPORTS[draft.destination.value as keyof typeof AIRPORTS]?.city ?? "";
  const names = FAMILY.travellers.map((t) => firstName(t.name));

  useEffect(() => {
    if (stage !== "faceid") return;
    const t = window.setTimeout(() => {
      update((prev) => ({
        draft,
        booked: true,
        prompt: HERO_PROMPT,
        watch: { ...prev.watch, set: true, approved: true, spoken: spokenBefore + 1 },
      }));
      setStage("booked");
    }, 1400);
    return () => window.clearTimeout(t);
    // The draft is rebuilt every render but is deterministic; only the stage matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // A place the passenger struck off cannot be proposed again: with nothing to
  // say this morning, the scene is the quiet one.
  const silent = morning.verdict === "silent";
  useEffect(() => {
    if (silent) router.replace("/companion/quiet");
  }, [silent, router]);
  if (silent) return null;

  const expanded = stage === "expanded";
  const why = [
    ...morning.why,
    `${FARE_RULES[draft.package.value].label}, because you'll check a bag${
      saving !== null ? ` and it's ${grouped(saving.saved)} less than LIGHT plus the bag` : ""
    }. I've held ${listSeats(itinerary.out?.seats ?? [])} together on both legs.`,
  ];

  const head = (
    <div className="flex items-center gap-2">
      <AppIcon />
      <span className="text-[12px] leading-4 font-extrabold tracking-[0.06em]">PEGASUS</span>
      <span className="ml-auto text-[12px] leading-4 text-pg-ink">now</span>
    </div>
  );

  if (stage === "booked") {
    return (
      <LockScreen date={longDate(PROPOSAL_DATE)} time="09:12">
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
                {city} {dateSpan(draft.departDate.value, draft.returnDate.value)} ·{" "}
                {money(total)} GBP · {(itinerary.out?.seats ?? []).join(" ")}
              </span>
            </div>
          </div>
          <p
            className="mt-3.5 border-t border-pg-line pt-3 text-[14px] leading-5"
            style={{ textWrap: "pretty" }}
          >
            <Link href="/confirmation" className="font-bold">
              Tap for your ticket.
            </Link>{" "}
            Travelling with others?{" "}
            <Link href="/group/people" className="font-bold text-pg-orange">
              I can hold seats beside yours.
            </Link>
          </p>
        </LockCard>
      </LockScreen>
    );
  }

  return (
    <LockScreen
      date={longDate(PROPOSAL_DATE)}
      time="09:12"
      dim={expanded}
      bottom={expanded ? 34 : 116}
    >
      <LockCard label={expanded ? "Pegasus Live Activity, expanded" : "Pegasus Live Activity"}>
        {head}
        <div className="mt-3.5 flex items-center gap-3">
          <Avatar size={52} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[16px] leading-[22px] font-extrabold">
              {city} · {dateSpan(draft.departDate.value, draft.returnDate.value)}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="flex items-baseline gap-1.5">
                <span className="display text-[24px] leading-7 font-extrabold">
                  {money(total)}
                </span>
                <span className="text-[13px] font-bold">GBP</span>
              </span>
              <span className="h-[22px] rounded-full bg-pg-surface px-[9px] text-[12px] leading-[22px] font-semibold whitespace-nowrap">
                under your cap
              </span>
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[15px] leading-5 font-extrabold">
          <ClockIcon />
          Held until 14:20 tomorrow
        </div>

        {expanded && (
          <>
            <Speech title="Why I spoke" text={why} />
            <p className="mt-3 flex items-start gap-2 px-1 text-[13px] leading-[18px] font-semibold text-pg-ink">
              <span className="mt-px">
                <PassIcon />
              </span>
              <span>
                Outbound {itinerary.out?.flight.flightNo} {itinerary.out?.flight.departs} ·
                Return {itinerary.back?.flight.flightNo}{" "}
                {itinerary.back === null
                  ? ""
                  : shortDate(itinerary.back.flight.date).slice(0, 6)}{" "}
                · {names.join(", ")}.
              </span>
            </p>
            <PrimaryButton className="mt-3.5 w-full" onClick={() => setStage("faceid")}>
              <FaceIdIcon />
              Approve (Face ID)
            </PrimaryButton>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <SecondaryButton href="/companion/look">Look</SecondaryButton>
              <SecondaryButton href="/companion/not-this-one">Not this one</SecondaryButton>
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
                Approve
              </PrimaryButton>
              <SecondaryButton href="/companion/look" className="w-full">
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
    </LockScreen>
  );
}

function listSeats(seats: string[]): string {
  if (seats.length <= 1) return seats.join("");
  return `${seats.slice(0, -1).join(", ")} and ${seats[seats.length - 1]}`;
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

/** Bold the figures: anything with a digit and a currency or "over"/"under" next to it. */
function emphasise(sentence: string): React.ReactNode {
  const parts = sentence.split(
    /(\d[\d,]*(?:\.\d+)? GBP|under [\d,]+ for the first time|[\d,]+\.\d{2} — \d+(?:\.\d+)? over)/g,
  );
  return parts.map((part, i) =>
    /\d/.test(part) && /GBP|over|under/.test(part) ? (
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

/** "Look": the ticket built from the watch, on the home screen. */
export function LookScreen() {
  const { state, update, ready } = useJourney();
  useEffect(() => {
    if (ready && state.draft === null) update({ draft: heroDraft(), prompt: HERO_PROMPT });
  }, [ready, state.draft, update]);
  if (!ready || state.draft === null) return null;
  return <HomeScreen fromWatch />;
}

/** The 21-day deadline rule firing, with a recommendation the passenger can refuse. */
export function DeadlineScreen() {
  const router = useRouter();
  const { update } = useJourney();
  const intent = useIntent();
  const date = deadlineDate(intent);
  const history = mornings(intent, date);
  const spokenBefore = history.slice(0, -1).filter((m) => m.verdict !== "silent").length;
  const morning = checkMorning(intent, date, spokenBefore);
  const best = morning.best;
  const over = morning.margin !== null && morning.margin < 0;
  const raised = best === null ? null : Math.ceil(best.total / 50) * 50;

  function take(): void {
    if (best === null) return;
    const draft = buildDraft(
      `Stansted to ${AIRPORTS[best.code].city} on 19 October, back on the 25th, checking a bag`,
      FAMILY,
    );
    update((prev) => ({
      draft,
      prompt: `Stansted to ${AIRPORTS[best.code].city} on 19 October, back on the 25th, checking a bag`,
      watch: { ...prev.watch, spoken: spokenBefore + 1 },
    }));
    router.push("/");
  }

  return (
    <LockScreen date={longDate(date)} time={CHECK_TIME} dim bottom={34}>
      <LockCard label="Pegasus Live Activity, expanded">
        <div className="flex items-center gap-2">
          <AppIcon />
          <span className="text-[12px] leading-4 font-extrabold tracking-[0.06em]">
            PEGASUS
          </span>
          <span className="ml-auto text-[12px] leading-4 text-pg-ink">now</span>
        </div>
        <div className="mt-3.5 flex items-center gap-3">
          <Avatar size={52} />
          <h2 className="text-[22px] leading-7 font-extrabold tracking-[-0.01em]">
            Your {intent.deadlineDays}-day deadline
          </h2>
        </div>
        <Speech title="Why I spoke" text={morning.why} />
        {best !== null && (
          <p className="mt-3.5 px-1 text-[15px] leading-[22px]" style={{ textWrap: "pretty" }}>
            <strong className="text-[17px] font-extrabold">
              If it were me: {over ? "take it." : "book it."}
            </strong>{" "}
            This route hasn&rsquo;t dropped inside {intent.deadlineDays} days in the last two
            Octobers, and the 08:40 you&rsquo;d want is down to 4 seats.
          </p>
        )}
        {best !== null && (
          <PrimaryButton className="mt-4 w-full" onClick={take}>
            Take {best.city} · {grouped(best.total)}
          </PrimaryButton>
        )}
        {over && raised !== null && (
          <SecondaryButton
            outline
            className="mt-2 h-[54px] w-full text-[17px]"
            onClick={() => {
              update((prev) => ({
                watch: { ...prev.watch, capRaisedTo: raised, spoken: spokenBefore + 1 },
              }));
              router.push("/flights");
            }}
          >
            Raise my cap to {grouped(raised)}
          </SecondaryButton>
        )}
        <button
          type="button"
          onClick={() => router.push("/flights")}
          className="mt-1 h-11 text-center text-[15px] font-bold text-pg-ink"
        >
          Keep waiting
        </button>
      </LockCard>
    </LockScreen>
  );
}
