"use client";

import { useState } from "react";
import { DestinationPhoto } from "@/components/assistant/destination-photo";
import {
  FIELD_LABELS,
  countBySource,
  type DraftKey,
  type TripDraft,
} from "@/lib/assistant/draft";
import { AIRPORTS, FARE_RULES, airportCodes, formatFare } from "@/lib/journey/flights";

/**
 * The trip as a boarding pass.
 *
 * This direction argues that a booking is an object, not a form. The assistant
 * does not fill in fields, it prints a pass, and the parts it worked out for
 * itself are marked on the pass rather than explained beside it.
 *
 * A dotted underline means inferred. Tap a slot to see why and to change it,
 * and the underline goes: the pass becomes more solid the more of it is yours.
 * That is the whole interaction, and it needs no legend to read.
 */

const SLOTS: DraftKey[] = [
  "departDate",
  "returnDate",
  "party",
  "package",
  "checkedKg",
  "seating",
];

export function BoardingPass({
  draft,
  onChange,
  total,
  onCheckout,
}: {
  draft: TripDraft;
  onChange: (next: TripDraft) => void;
  total: number;
  onCheckout: () => void;
}) {
  const [editing, setEditing] = useState<DraftKey | null>(null);
  const counts = countBySource(draft);
  const inferred = counts.profile + counts.predicted;

  function set<K extends DraftKey>(key: K, value: TripDraft[K]["value"]): void {
    onChange({
      ...draft,
      [key]: { value, source: "said", why: "You changed this." },
    } as TripDraft);
    setEditing(null);
  }

  const destCity =
    AIRPORTS[draft.destination.value as keyof typeof AIRPORTS]?.city ??
    draft.destination.value;

  return (
    <div>
      <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_18px_50px_rgba(31,42,55,0.18)]">
        <div className="relative h-36">
          <DestinationPhoto
            code={draft.destination.value}
            className="absolute inset-0 h-full w-full"
            priority
          />
          <div className="relative flex h-full flex-col justify-between p-4">
            <span className="wordmark text-[16px] text-white/95">PEGASUS</span>
            <span>
              <span className="block text-[11px] font-bold tracking-widest text-white/80 uppercase">
                Boarding pass
              </span>
              <span className="block text-[26px] leading-none font-bold text-white drop-shadow">
                {destCity}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between px-5 pt-5">
          <Endpoint code={draft.origin.value} label="From" />
          <span className="flex flex-1 flex-col items-center pb-2">
            <span className="text-[18px] text-pg-yellow">&#9992;</span>
            <span className="mt-1 h-px w-full border-t border-dashed border-pg-line" />
          </span>
          <Endpoint code={draft.destination.value} label="To" align="right" />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 px-5">
          {SLOTS.map((key) => {
            const entry = draft[key];
            const guessed = entry.source !== "said";
            const open = editing === key;
            return (
              <div key={key} className="min-w-0">
                <dt className="text-[10px] font-bold tracking-widest text-pg-ink uppercase">
                  {FIELD_LABELS[key]}
                </dt>
                <dd>
                  <button
                    type="button"
                    onClick={() => setEditing(open ? null : key)}
                    className={`block max-w-full truncate text-left text-[16px] font-bold ${
                      guessed
                        ? "underline decoration-pg-yellow decoration-dotted decoration-2 underline-offset-4"
                        : ""
                    }`}
                  >
                    {display(key, draft)}
                  </button>
                  {open && (
                    <>
                      {guessed && (
                        <p className="mt-1 text-[11px] leading-snug text-pg-ink">
                          {entry.why}
                        </p>
                      )}
                      <Editor draftKey={key} draft={draft} onPick={set} />
                    </>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>

        {/* Perforation. The stub below it is the commercial half. */}
        <div className="relative mt-6">
          <span className="absolute top-1/2 -left-3 h-6 w-6 -translate-y-1/2 rounded-full bg-pg-surface" />
          <span className="absolute top-1/2 -right-3 h-6 w-6 -translate-y-1/2 rounded-full bg-pg-surface" />
          <span className="block border-t-2 border-dashed border-pg-line" />
        </div>

        <div className="flex items-end justify-between gap-4 p-5">
          <span>
            <span className="block text-[10px] font-bold tracking-widest text-pg-ink uppercase">
              Total
            </span>
            <span className="block text-[26px] leading-none font-bold">
              {formatFare(total)}
              <span className="ml-1 text-[13px] font-medium text-pg-ink">GBP</span>
            </span>
          </span>
          <Barcode />
        </div>
      </div>

      <p className="mt-3 px-1 text-center text-[12px] leading-snug text-pg-ink">
        <span className="font-semibold text-pg-navy">{counts.said} from you.</span> The{" "}
        {inferred} underlined {inferred === 1 ? "field" : "fields"} Pegasus worked out. Tap any
        of them to see why, or to change it.
      </p>

      {draft.notes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {draft.notes.map((note) => (
            <li
              key={note}
              className="flex gap-2 rounded-xl bg-white/80 p-3 text-[13px] leading-snug text-pg-navy/85"
            >
              <span className="text-pg-orange">&bull;</span>
              {note}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onCheckout}
        className="mt-5 w-full rounded-full bg-pg-yellow py-4 text-[17px] font-bold text-pg-navy"
      >
        Confirm and pay {formatFare(total)} GBP
      </button>
    </div>
  );
}

function Endpoint({
  code,
  label,
  align = "left",
}: {
  code: string;
  label: string;
  align?: "left" | "right";
}) {
  const city = AIRPORTS[code as keyof typeof AIRPORTS]?.city ?? code;
  return (
    <span className={align === "right" ? "text-right" : ""}>
      <span className="block text-[10px] font-bold tracking-widest text-pg-ink uppercase">
        {label}
      </span>
      <span className="block text-[34px] leading-none font-bold tracking-tight">{code}</span>
      <span className="block text-[12px] text-pg-ink">{city}</span>
    </span>
  );
}

/** Deterministic bars, so the pass looks identical in every screenshot. */
function Barcode() {
  const bars = Array.from({ length: 34 }, (_, i) => ((i * 7919) % 5) + 1);
  return (
    <span className="flex h-11 items-end gap-[2px]" aria-hidden>
      {bars.map((w, i) => (
        <span
          key={i}
          className="bg-pg-navy"
          style={{ width: `${w}px`, height: `${70 + ((i * 13) % 30)}%` }}
        />
      ))}
    </span>
  );
}

function display(key: DraftKey, draft: TripDraft): string {
  switch (key) {
    case "origin":
    case "destination":
      return draft[key].value;
    case "departDate":
      return short(draft.departDate.value);
    case "returnDate":
      return draft.returnDate.value === null ? "One way" : short(draft.returnDate.value);
    case "party": {
      const p = draft.party.value;
      const n = p.adults + p.children + p.infants;
      return `${n} ${n === 1 ? "person" : "people"}`;
    }
    case "package":
      return FARE_RULES[draft.package.value].label;
    case "checkedKg":
      return draft.checkedKg.value === 0 ? "Cabin only" : `${draft.checkedKg.value} kg`;
    case "cabinBag":
      return draft.cabinBag.value ? "Included" : "None";
    case "seating":
      return { aisle: "Aisle", window: "Window", together: "Together", none: "Any" }[
        draft.seating.value
      ];
    case "flexibility":
      return { none: "Fixed", change: "Changeable", full: "Flexible" }[
        draft.flexibility.value
      ];
  }
}

function short(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function Editor({
  draftKey,
  draft,
  onPick,
}: {
  draftKey: DraftKey;
  draft: TripDraft;
  onPick: <K extends DraftKey>(key: K, value: TripDraft[K]["value"]) => void;
}) {
  const row = "mt-2 flex flex-wrap gap-1.5";

  if (draftKey === "departDate" || draftKey === "returnDate") {
    const value =
      draftKey === "departDate" ? draft.departDate.value : (draft.returnDate.value ?? "");
    return (
      <input
        autoFocus
        type="date"
        value={value}
        onChange={(e) =>
          draftKey === "departDate"
            ? onPick("departDate", e.target.value)
            : onPick("returnDate", e.target.value === "" ? null : e.target.value)
        }
        className="mt-2 w-full rounded-lg border border-pg-line px-2 py-1.5 text-[14px]"
      />
    );
  }

  if (draftKey === "origin" || draftKey === "destination") {
    return (
      <select
        autoFocus
        value={draft[draftKey].value}
        onChange={(e) => onPick(draftKey, e.target.value)}
        className="mt-2 w-full rounded-lg border border-pg-line px-2 py-1.5 text-[14px]"
      >
        {airportCodes.map((c) => (
          <option key={c} value={c}>
            {AIRPORTS[c].city} ({c})
          </option>
        ))}
      </select>
    );
  }

  if (draftKey === "party") {
    const p = draft.party.value;
    return (
      <div className="mt-2 space-y-1.5">
        {(["adults", "children"] as const).map((kind) => (
          <div key={kind} className="flex items-center justify-between text-[13px]">
            <span className="capitalize">{kind}</span>
            <span className="flex items-center gap-2">
              <Step
                onClick={() =>
                  onPick("party", {
                    ...p,
                    [kind]: Math.max(kind === "adults" ? 1 : 0, p[kind] - 1),
                  })
                }
              >
                &minus;
              </Step>
              <span className="w-3 text-center font-bold">{p[kind]}</span>
              <Step onClick={() => onPick("party", { ...p, [kind]: p[kind] + 1 })}>+</Step>
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (draftKey === "package") {
    return (
      <div className={row}>
        {(Object.keys(FARE_RULES) as (keyof typeof FARE_RULES)[]).map((f) => (
          <Pill key={f} on={draft.package.value === f} onClick={() => onPick("package", f)}>
            {FARE_RULES[f].label}
          </Pill>
        ))}
      </div>
    );
  }

  if (draftKey === "checkedKg") {
    return (
      <div className={row}>
        {([0, 12, 20, 25] as const).map((kg) => (
          <Pill
            key={kg}
            on={draft.checkedKg.value === kg}
            onClick={() => onPick("checkedKg", kg)}
          >
            {kg === 0 ? "None" : `${kg} kg`}
          </Pill>
        ))}
      </div>
    );
  }

  if (draftKey === "seating") {
    return (
      <div className={row}>
        {(["aisle", "window", "together", "none"] as const).map((v) => (
          <Pill key={v} on={draft.seating.value === v} onClick={() => onPick("seating", v)}>
            {v === "none" ? "Any" : v}
          </Pill>
        ))}
      </div>
    );
  }

  return (
    <div className={row}>
      {(["none", "change", "full"] as const).map((v) => (
        <Pill
          key={v}
          on={draft.flexibility.value === v}
          onClick={() => onPick("flexibility", v)}
        >
          {{ none: "Fixed", change: "Changeable", full: "Flexible" }[v]}
        </Pill>
      ))}
    </div>
  );
}

function Pill({
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
      className={`rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize ${
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
      className="h-6 w-6 rounded-full bg-pg-surface text-[14px] leading-none font-bold"
    >
      {children}
    </button>
  );
}
