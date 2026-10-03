"use client";

import { useState } from "react";

/**
 * Card details that can actually be typed into.
 *
 * Nothing is sent anywhere and nothing is validated beyond formatting — this is
 * a mock and there is no payment processor behind it. It exists because the
 * previous version rendered the fields as paragraphs, and anyone demoing the
 * flow reaches for the card number first.
 *
 * The formatting is deliberately light. A demo should not stall on someone
 * mistyping an expiry date.
 */
export function CardForm() {
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setSaved(false)}
        className="mt-4 flex w-full items-start gap-3 text-left"
      >
        <span
          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            saved ? "border-pg-line" : "border-pg-yellow bg-pg-yellow"
          }`}
        >
          {!saved && <span className="h-2 w-2 rounded-full bg-white" />}
        </span>
        <span>
          <span className="block text-[17px]">Enter Card Information</span>
          <span className="block text-[15px] text-pg-ink">
            (Visa, Master Card, Maestro, Electron, American Express, Troy)
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => setSaved(true)}
        className="mt-3 flex w-full items-center gap-3 text-left"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            saved ? "border-pg-yellow bg-pg-yellow" : "border-pg-line"
          }`}
        >
          {saved && <span className="h-2 w-2 rounded-full bg-white" />}
        </span>
        <span className={`text-[17px] ${saved ? "" : "text-pg-line"}`}>
          Choose from your saved cards
        </span>
      </button>

      {!saved && (
        <>
          <Field
            label="Card number"
            value={number}
            onChange={(v) => setNumber(groupDigits(v, 16, 4))}
            placeholder="Enter"
            inputMode="numeric"
          />
          <Field
            label="Credit card holder"
            value={holder}
            onChange={setHolder}
            placeholder="Enter"
          />
          <Field
            label="Expiry date"
            value={expiry}
            onChange={(v) => setExpiry(formatExpiry(v))}
            placeholder="Month/Year"
            inputMode="numeric"
          />
          <Field
            label="CVV"
            value={cvv}
            onChange={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
            placeholder="Enter"
            inputMode="numeric"
          />
        </>
      )}

      {saved && (
        <p className="mt-4 rounded-lg bg-pg-surface p-3 text-[15px] text-pg-ink">
          No saved cards on this account.
        </p>
      )}
    </>
  );
}

/** Digits only, capped, grouped for readability. */
function groupDigits(value: string, max: number, groupOf: number): string {
  const digits = value.replace(/\D/g, "").slice(0, max);
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += groupOf) {
    groups.push(digits.slice(i, i + groupOf));
  }
  return groups.join(" ");
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  inputMode?: "numeric" | "tel";
}) {
  return (
    <div className="mt-4">
      <label className="block text-[15px] text-pg-ink">
        {label}
        <input
          value={value}
          inputMode={inputMode}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-b border-pg-line bg-transparent pb-1 text-[19px] text-pg-navy outline-none placeholder:text-pg-line"
        />
      </label>
    </div>
  );
}
