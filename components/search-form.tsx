"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AIRPORTS, airportCodes } from "@/lib/journey/flights";

/** Seventeen days out, so the mock opens on a date the calendar has fares for. */
function defaultDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/**
 * The search card, matched to the live app: a Return/One-way segmented control,
 * From and To either side of a swap control, the two dates, a passenger count,
 * and a full-width yellow SEARCH FLIGHT.
 */
export function SearchForm() {
  const router = useRouter();
  const [trip, setTrip] = useState<"return" | "oneway">("return");
  const [origin, setOrigin] = useState("STN");
  const [destination, setDestination] = useState("SAW");
  const [departDate, setDepartDate] = useState(() => defaultDate(17));
  const [returnDate, setReturnDate] = useState(() => defaultDate(23));
  const [adults, setAdults] = useState(1);

  const sameAirport = origin === destination;

  return (
    <form
      className="overflow-hidden rounded-2xl bg-white shadow-[0_6px_24px_rgba(31,42,55,0.12)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (sameAirport) return;
        router.push(
          `/results?${new URLSearchParams({
            origin,
            destination,
            departDate,
            ...(trip === "return" ? { returnDate } : {}),
            adults: String(adults),
            children: "0",
            infants: "0",
          }).toString()}`,
        );
      }}
    >
      <div className="px-5 pt-5 pb-4">
        <div className="mx-auto flex max-w-[270px] rounded-full bg-pg-surface p-1">
          {(["return", "oneway"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTrip(value)}
              className={`flex-1 rounded-full py-2.5 text-[15px] font-bold transition ${
                trip === value ? "bg-white text-pg-navy shadow-sm" : "text-pg-ink"
              }`}
            >
              {value === "return" ? "Return" : "One-way"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex items-center gap-2 border-t border-pg-line px-5 py-4">
        <AirportPicker label="From" value={origin} onChange={setOrigin} align="left" />
        <button
          type="button"
          aria-label="Swap origin and destination"
          onClick={() => {
            setOrigin(destination);
            setDestination(origin);
          }}
          className="shrink-0 text-[20px] text-pg-ink"
        >
          ⇄
        </button>
        <AirportPicker
          label="To"
          value={destination}
          onChange={setDestination}
          align="right"
        />
      </div>

      <div className="flex items-center gap-2 border-t border-pg-line px-5 py-4">
        <DateField label="Departure date" value={departDate} onChange={setDepartDate} />
        <span className="shrink-0 text-[18px] text-pg-ink" aria-hidden>
          🗓
        </span>
        {trip === "return" ? (
          <DateField
            label="Return date"
            value={returnDate}
            onChange={setReturnDate}
            align="right"
          />
        ) : (
          <span className="flex-1 text-right text-[17px] font-bold text-pg-line">
            Return date
          </span>
        )}
      </div>

      <div className="border-t border-pg-line px-5 py-3">
        <p className="text-[13px] text-pg-ink">Passengers</p>
        <div className="flex items-center justify-between">
          <p className="text-[19px] font-bold">{adults} Adult(s)</p>
          <span className="flex items-center gap-3">
            <Round label="decrease" onClick={() => setAdults(Math.max(1, adults - 1))}>
              −
            </Round>
            <Round label="increase" onClick={() => setAdults(Math.min(9, adults + 1))}>
              +
            </Round>
          </span>
        </div>
      </div>

      {sameAirport && (
        <p className="px-5 pb-2 text-[12px] font-semibold text-red-600">
          Origin and destination cannot be the same airport.
        </p>
      )}

      <div className="px-4 pb-4">
        <button
          type="submit"
          disabled={sameAirport}
          className="w-full rounded-xl bg-pg-yellow py-4 text-[17px] font-extrabold tracking-wide text-pg-navy uppercase disabled:opacity-40"
        >
          Search Flight
        </button>
      </div>
    </form>
  );
}

function AirportPicker({
  label,
  value,
  onChange,
  align,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  align: "left" | "right";
}) {
  const airport = AIRPORTS[value as keyof typeof AIRPORTS];
  return (
    <label className={`min-w-0 flex-1 ${align === "right" ? "text-right" : ""}`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-transparent text-[22px] font-bold outline-none ${
          align === "right" ? "text-right" : ""
        }`}
      >
        {airportCodes.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
      <span className="block truncate text-[12px] text-pg-ink">{airport?.city ?? label}</span>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
  align,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  align?: "right";
}) {
  return (
    <label className={`min-w-0 flex-1 ${align === "right" ? "text-right" : ""}`}>
      <span className="sr-only">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-transparent text-[15px] font-bold outline-none ${
          align === "right" ? "text-right" : ""
        }`}
      />
    </label>
  );
}

function Round({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="h-7 w-7 rounded-full bg-pg-surface text-[17px] leading-none font-bold text-pg-navy"
    >
      {children}
    </button>
  );
}
