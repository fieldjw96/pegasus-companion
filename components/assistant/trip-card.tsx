"use client";

import { useState } from "react";
import {
  FIELD_LABELS,
  FIELD_ORDER,
  countBySource,
  type DraftKey,
  type Source,
  type TripDraft,
} from "@/lib/assistant/draft";
import { AIRPORTS, FARE_RULES, airportCodes, formatFare } from "@/lib/journey/flights";

/**
 * The trip the assistant has assembled, with every field editable in place.
 *
 * Two decisions worth defending:
 *
 * 1. **Every field shows where its value came from.** Said, remembered, or
 *    predicted. An assistant that fills in ten things and shows ten answers is
 *    asking for blind trust; this one shows which three you gave it and why it
 *    chose the other seven. It is also the thing that makes editing safe — you
 *    can see at a glance which values are guesses.
 * 2. **Predictions carry a reason, not a confidence score.** "Mila is 4, so
 *    seats together" is checkable by a human. "0.86" is not.
 */

const SOURCE_STYLE: Record<Source, { label: string; className: string }> = {
  said: { label: "you said", className: "bg-pg-navy/8 text-pg-navy" },
  profile: { label: "remembered", className: "bg-[#E8F1FB] text-[#1A6FB5]" },
  predicted: { label: "predicted", className: "bg-pg-yellow/25 text-[#8A6A00]" },
};

export function TripCard({
  draft,
  onChange,
  total,
}: {
  draft: TripDraft;
  onChange: (next: TripDraft) => void;
  total: number;
}) {
  const [editing, setEditing] = useState<DraftKey | null>(null);
  const counts = countBySource(draft);

  function set<K extends DraftKey>(key: K, value: TripDraft[K]["value"]): void {
    onChange({
      ...draft,
      [key]: { value, source: "said", why: "You changed this." },
    } as TripDraft);
    setEditing(null);
  }

  return (
    <section className="pg-card">
      <header className="flex items-baseline justify-between border-b border-pg-line px-5 py-4">
        <div>
          <h2 className="text-[19px] font-bold">Your trip</h2>
          <p className="mt-0.5 text-[12px] text-pg-ink">
            {counts.said} from you · {counts.profile} remembered · {counts.predicted} predicted
          </p>
        </div>
        <span className="text-right">
          <span className="block text-[22px] font-bold">{formatFare(total)}</span>
          <span className="block text-[12px] text-pg-ink">GBP total</span>
        </span>
      </header>

      <dl className="divide-y divide-pg-line">
        {FIELD_ORDER.map((key) => {
          const entry = draft[key];
          const style = SOURCE_STYLE[entry.source];
          const open = editing === key;
          return (
            <div key={key} className="px-5 py-3">
              <div className="flex items-start gap-3">
                <dt className="w-24 shrink-0 pt-0.5 text-[13px] text-pg-ink">
                  {FIELD_LABELS[key]}
                </dt>
                <dd className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[16px] font-semibold">{display(key, draft)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style.className}`}
                    >
                      {style.label}
                    </span>
                    {entry.uncertain === true && (
                      <span className="rounded-full bg-pg-orange/15 px-2 py-0.5 text-[11px] font-medium text-pg-orange">
                        worth a look
                      </span>
                    )}
                  </div>
                  {entry.source !== "said" && (
                    <p className="mt-1 text-[12px] leading-snug text-pg-ink">{entry.why}</p>
                  )}
                  {open && <Editor draftKey={key} draft={draft} onPick={set} />}
                </dd>
                <button
                  type="button"
                  onClick={() => setEditing(open ? null : key)}
                  className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold text-pg-orange"
                >
                  {open ? "Done" : "Change"}
                </button>
              </div>
            </div>
          );
        })}
      </dl>

      {draft.notes.length > 0 && (
        <div className="border-t border-pg-line bg-pg-surface/60 px-5 py-4">
          <ul className="space-y-2">
            {draft.notes.map((note) => (
              <li key={note} className="flex gap-2 text-[13px] leading-snug text-pg-navy/85">
                <span className="text-pg-orange">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function display(key: DraftKey, draft: TripDraft): string {
  switch (key) {
    case "origin":
    case "destination": {
      const code = draft[key].value;
      const airport = AIRPORTS[code as keyof typeof AIRPORTS];
      return airport === undefined ? code : `${airport.city} (${code})`;
    }
    case "departDate":
      return pretty(draft.departDate.value);
    case "returnDate":
      return draft.returnDate.value === null ? "One way" : pretty(draft.returnDate.value);
    case "party": {
      const p = draft.party.value;
      const bits = [`${p.adults} adult${p.adults === 1 ? "" : "s"}`];
      if (p.children > 0) bits.push(`${p.children} child${p.children === 1 ? "" : "ren"}`);
      if (p.infants > 0) bits.push(`${p.infants} infant${p.infants === 1 ? "" : "s"}`);
      return bits.join(", ");
    }
    case "package":
      return FARE_RULES[draft.package.value].label;
    case "checkedKg":
      return draft.checkedKg.value === 0 ? "None" : `${draft.checkedKg.value} kg`;
    case "cabinBag":
      return draft.cabinBag.value ? "Included" : "Not included";
    case "seating":
      return {
        aisle: "Aisle",
        window: "Window",
        together: "Together",
        none: "Assigned at check-in",
      }[draft.seating.value];
    case "flexibility":
      return { none: "Fixed", change: "Changeable", full: "Fully flexible" }[
        draft.flexibility.value
      ];
  }
}

function pretty(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Inline editors. Each writes straight back and marks the field as said. */
function Editor({
  draftKey,
  draft,
  onPick,
}: {
  draftKey: DraftKey;
  draft: TripDraft;
  onPick: <K extends DraftKey>(key: K, value: TripDraft[K]["value"]) => void;
}) {
  const wrap = "mt-3 flex flex-wrap gap-1.5";

  if (draftKey === "origin" || draftKey === "destination") {
    return (
      <select
        autoFocus
        value={draft[draftKey].value}
        onChange={(e) => onPick(draftKey, e.target.value)}
        className="mt-3 w-full rounded-lg border border-pg-line px-3 py-2 text-[15px]"
      >
        {airportCodes.map((code) => (
          <option key={code} value={code}>
            {AIRPORTS[code].city} ({code})
          </option>
        ))}
      </select>
    );
  }

  if (draftKey === "departDate") {
    return (
      <input
        autoFocus
        type="date"
        value={draft.departDate.value}
        onChange={(e) => onPick("departDate", e.target.value)}
        className="mt-3 w-full rounded-lg border border-pg-line px-3 py-2 text-[15px]"
      />
    );
  }

  if (draftKey === "returnDate") {
    return (
      <div className="mt-3 flex items-center gap-2">
        <input
          type="date"
          value={draft.returnDate.value ?? ""}
          onChange={(e) => onPick("returnDate", e.target.value === "" ? null : e.target.value)}
          className="flex-1 rounded-lg border border-pg-line px-3 py-2 text-[15px]"
        />
        <button
          type="button"
          onClick={() => onPick("returnDate", null)}
          className="rounded-lg bg-pg-surface px-3 py-2 text-[13px] font-semibold"
        >
          One way
        </button>
      </div>
    );
  }

  if (draftKey === "party") {
    const p = draft.party.value;
    return (
      <div className="mt-3 space-y-2">
        {(["adults", "children", "infants"] as const).map((kind) => (
          <div key={kind} className="flex items-center justify-between">
            <span className="text-[14px] capitalize">{kind}</span>
            <span className="flex items-center gap-3">
              <Step
                onClick={() =>
                  onPick("party", {
                    ...p,
                    [kind]: Math.max(kind === "adults" ? 1 : 0, p[kind] - 1),
                  })
                }
              >
                −
              </Step>
              <span className="w-4 text-center text-[15px] font-semibold">{p[kind]}</span>
              <Step onClick={() => onPick("party", { ...p, [kind]: p[kind] + 1 })}>+</Step>
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (draftKey === "package") {
    return (
      <div className={wrap}>
        {(Object.keys(FARE_RULES) as (keyof typeof FARE_RULES)[]).map((family) => (
          <Chip
            key={family}
            on={draft.package.value === family}
            onClick={() => onPick("package", family)}
          >
            {FARE_RULES[family].label}
          </Chip>
        ))}
      </div>
    );
  }

  if (draftKey === "checkedKg") {
    return (
      <div className={wrap}>
        {([0, 12, 20, 25] as const).map((kg) => (
          <Chip
            key={kg}
            on={draft.checkedKg.value === kg}
            onClick={() => onPick("checkedKg", kg)}
          >
            {kg === 0 ? "None" : `${kg} kg`}
          </Chip>
        ))}
      </div>
    );
  }

  if (draftKey === "cabinBag") {
    return (
      <div className={wrap}>
        {[true, false].map((v) => (
          <Chip
            key={String(v)}
            on={draft.cabinBag.value === v}
            onClick={() => onPick("cabinBag", v)}
          >
            {v ? "Included" : "Not included"}
          </Chip>
        ))}
      </div>
    );
  }

  if (draftKey === "seating") {
    return (
      <div className={wrap}>
        {(["aisle", "window", "together", "none"] as const).map((v) => (
          <Chip key={v} on={draft.seating.value === v} onClick={() => onPick("seating", v)}>
            {v === "none" ? "No preference" : v}
          </Chip>
        ))}
      </div>
    );
  }

  return (
    <div className={wrap}>
      {(["none", "change", "full"] as const).map((v) => (
        <Chip
          key={v}
          on={draft.flexibility.value === v}
          onClick={() => onPick("flexibility", v)}
        >
          {{ none: "Fixed", change: "Changeable", full: "Fully flexible" }[v]}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  children,
  on,
  onClick,
}: {
  children: React.ReactNode;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[13px] font-semibold capitalize ${
        on ? "bg-pg-navy text-white" : "bg-pg-surface text-pg-navy"
      }`}
    >
      {children}
    </button>
  );
}

function Step({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 w-7 rounded-full bg-pg-surface text-[16px] leading-none font-bold"
    >
      {children}
    </button>
  );
}
