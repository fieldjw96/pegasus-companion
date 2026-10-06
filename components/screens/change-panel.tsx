"use client";

import { useState, type ReactNode } from "react";
import { FieldRow, LookTag, Tag, TextButton } from "@/components/ui/primitives";
import {
  FIELD_LABELS,
  FIELD_ORDER,
  countBySource,
  type DraftKey,
  type TripDraft,
} from "@/lib/assistant/draft";
import { itineraryFor } from "@/lib/assistant/itinerary";
import { naivePath } from "@/lib/assistant/price";
import { AIRPORTS, FARE_RULES, airportCodes, formatFare } from "@/lib/journey/flights";
import { shortDate } from "@/lib/demo/hero";

/**
 * The provenance list, every field editable in place.
 *
 * Every field shows where its value came from: said, remembered, predicted, or
 * from the organiser of a group. An assistant that fills in ten things and
 * shows ten answers is asking for blind trust; this one shows which four you
 * gave it and why it chose the other six. Predictions carry a reason, not a
 * confidence score: "Mila is 4, so seats together" is checkable by a human.
 * "0.86" is not.
 */
export function ChangePanel({
  draft,
  onChange,
  names,
  seatLabel,
  seatSaid = false,
}: {
  draft: TripDraft;
  onChange: (next: TripDraft) => void;
  names: string[];
  /** When the seat is handled elsewhere (an offer), the row says so and has no editor. */
  seatLabel?: string;
  /** The offered seat was taken: it is the passenger's now. */
  seatSaid?: boolean;
}) {
  const [editing, setEditing] = useState<DraftKey | null>(null);
  const counts = countBySource(draft, seatLabel === undefined ? [] : ["seating"]);
  const saving = naivePath(draft);
  const itinerary = itineraryFor(draft);
  const organiser = draft.origin.from;

  function set<K extends DraftKey>(key: K, value: TripDraft[K]["value"]): void {
    onChange({ ...draft, [key]: { value, source: "said", why: "You changed this." } });
    setEditing(null);
  }

  const summary = [
    counts.shared > 0
      ? `${counts.shared} from ${(organiser ?? "the organiser").split(" ")[0]}`
      : null,
    counts.said > 0 ? `${counts.said} from you` : null,
    `${counts.profile} remembered`,
    `${counts.predicted} predicted`,
  ]
    .filter((s): s is string => s !== null)
    .join(" · ");

  return (
    <section
      aria-label="Change anything"
      className="pg-card rise mt-3 flex flex-col px-5 pt-[22px] pb-1.5"
    >
      <h2 className="text-[20px] leading-[26px] font-extrabold tracking-[-0.01em]">
        Change anything
      </h2>
      <p
        className="mt-1.5 mb-4 text-[14px] leading-5 text-pg-ink"
        style={{ textWrap: "pretty" }}
      >
        {summary}. Anything you change becomes yours and the ticket reprints.
      </p>
      {FIELD_ORDER.map((key) => {
        const entry = draft[key];
        const open = editing === key;
        const offer = key === "seating" && seatLabel !== undefined;
        let reason: ReactNode = entry.source === "said" ? undefined : entry.why;
        if (key === "package" && saving !== null && entry.source === "predicted") {
          reason = `${formatFare(saving.saved)} GBP cheaper than taking the cheapest fare and adding the same bag later.`;
        }
        if (offer) reason = undefined;
        return (
          <FieldRow
            key={key}
            label={FIELD_LABELS[key]}
            tags={
              offer ? (
                seatSaid ? (
                  <Tag source="said" />
                ) : undefined
              ) : (
                <>
                  <Tag source={entry.source} from={entry.from} />
                  {entry.uncertain === true && <LookTag />}
                </>
              )
            }
            reason={reason}
            action={
              offer ? undefined : (
                <TextButton
                  onClick={() => setEditing(open ? null : key)}
                  ariaLabel={`${open ? "Done changing" : "Change"} ${FIELD_LABELS[key]}`}
                  className="pl-3"
                >
                  {open ? "Done" : "Change"}
                </TextButton>
              )
            }
          >
            {offer ? seatLabel : display(key, draft, names, itinerary.out?.seats ?? [])}
            {open && <Editor draftKey={key} draft={draft} onPick={set} />}
          </FieldRow>
        );
      })}
    </section>
  );
}

function display(key: DraftKey, draft: TripDraft, names: string[], seats: string[]): string {
  switch (key) {
    case "origin":
    case "destination": {
      const code = draft[key].value;
      const airport = AIRPORTS[code as keyof typeof AIRPORTS];
      return airport === undefined ? code : `${airport.city} ${airport.name}`;
    }
    case "departDate":
      return shortDate(draft.departDate.value);
    case "returnDate":
      return draft.returnDate.value === null ? "One way" : shortDate(draft.returnDate.value);
    case "party": {
      const p = draft.party.value;
      const people = p.adults + p.children;
      const listed = names.slice(0, people).map((n) => n.split(" ")[0] ?? n);
      if (listed.length === people) return listed.join(", ");
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
      if (!draft.cabinBag.value) return "None";
      return draft.package.value === "light" ? "Included, 17.00 per leg" : "55×40×23 cm, 8 kg";
    case "seating":
      return draft.seating.value === "none"
        ? "Assigned at check-in"
        : seats.length > 0
          ? seats.join(" ")
          : { aisle: "Aisle", window: "Window", together: "Together" }[draft.seating.value];
    case "flexibility":
      return { none: "Fixed", change: "Changeable", full: "Fully flexible" }[
        draft.flexibility.value
      ];
  }
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
  const input =
    "mt-3 w-full rounded-xl bg-pg-surface px-3 py-2.5 text-[15px] font-semibold outline-none";

  if (draftKey === "origin" || draftKey === "destination") {
    return (
      <select
        autoFocus
        value={draft[draftKey].value}
        onChange={(e) => onPick(draftKey, e.target.value)}
        className={input}
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
        className={input}
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
          className="flex-1 rounded-xl bg-pg-surface px-3 py-2.5 text-[15px] font-semibold outline-none"
        />
        <Chip on={draft.returnDate.value === null} onClick={() => onPick("returnDate", null)}>
          One way
        </Chip>
      </div>
    );
  }
  if (draftKey === "party") {
    const p = draft.party.value;
    return (
      <div className="mt-3 flex flex-col gap-2">
        {(["adults", "children", "infants"] as const).map((kind) => (
          <div key={kind} className="flex items-center justify-between">
            <span className="text-[14px] font-medium capitalize">{kind}</span>
            <span className="flex items-center gap-3">
              <Step
                label={`Fewer ${kind}`}
                onClick={() =>
                  onPick("party", {
                    ...p,
                    [kind]: Math.max(kind === "adults" ? 1 : 0, p[kind] - 1),
                  })
                }
              >
                −
              </Step>
              <span className="tabular w-4 text-center text-[15px] font-bold">{p[kind]}</span>
              <Step
                label={`More ${kind}`}
                onClick={() => onPick("party", { ...p, [kind]: p[kind] + 1 })}
              >
                +
              </Step>
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
        {(["together", "aisle", "window", "none"] as const).map((v) => (
          <Chip key={v} on={draft.seating.value === v} onClick={() => onPick("seating", v)}>
            {
              { together: "Together", aisle: "Aisle", window: "Window", none: "At check-in" }[
                v
              ]
            }
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

export function Chip({
  children,
  on,
  onClick,
}: {
  children: ReactNode;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-9 rounded-full px-3.5 text-[13px] font-bold ${
        on ? "bg-pg-navy text-white" : "bg-pg-surface text-pg-navy"
      }`}
    >
      {children}
    </button>
  );
}

function Step({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="h-8 w-8 rounded-full bg-pg-surface text-[16px] leading-none font-bold"
    >
      {children}
    </button>
  );
}
