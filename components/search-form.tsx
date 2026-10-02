"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { airportCodes, AIRPORTS } from "@/lib/journey/flights";

/** Fourteen days out, so the mock always opens on a plausible date. */
function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export function SearchForm() {
  const router = useRouter();
  const [origin, setOrigin] = useState("SAW");
  const [destination, setDestination] = useState("STN");
  const [departDate, setDepartDate] = useState(defaultDate);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const sameAirport = origin === destination;

  return (
    <form
      className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-pg-line"
      onSubmit={(event) => {
        event.preventDefault();
        if (sameAirport) return;
        const params = new URLSearchParams({
          origin,
          destination,
          departDate,
          adults: String(adults),
          children: String(children),
          infants: "0",
        });
        router.push(`/results?${params.toString()}`);
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full bg-transparent text-[15px] font-semibold outline-none"
          >
            {airportCodes.map((code) => (
              <option key={code} value={code}>
                {code} · {AIRPORTS[code].city}
              </option>
            ))}
          </select>
        </Field>
        <Field label="To">
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full bg-transparent text-[15px] font-semibold outline-none"
          >
            {airportCodes.map((code) => (
              <option key={code} value={code}>
                {code} · {AIRPORTS[code].city}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Depart">
          <input
            type="date"
            value={departDate}
            onChange={(e) => setDepartDate(e.target.value)}
            className="w-full bg-transparent text-[15px] font-semibold outline-none"
          />
        </Field>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Adults">
          <Stepper value={adults} min={1} max={9} onChange={setAdults} />
        </Field>
        <Field label="Children">
          <Stepper value={children} min={0} max={8} onChange={setChildren} />
        </Field>
      </div>

      {sameAirport && (
        <p className="mt-3 text-[12px] font-medium text-red-600">
          Origin and destination cannot be the same airport.
        </p>
      )}

      <button
        type="submit"
        disabled={sameAirport}
        className="mt-4 w-full rounded-xl bg-pg-orange py-3.5 text-[15px] font-bold text-white disabled:opacity-40"
      >
        Search flights
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-xl bg-pg-surface px-3 py-2">
      <span className="block text-[10px] font-bold tracking-wider text-pg-ink uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <span className="flex items-center justify-between">
      <button
        type="button"
        aria-label="decrease"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-6 w-6 rounded-full bg-white text-[15px] leading-none font-bold text-pg-orange ring-1 ring-pg-line"
      >
        −
      </button>
      <span className="text-[15px] font-semibold">{value}</span>
      <button
        type="button"
        aria-label="increase"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-6 w-6 rounded-full bg-white text-[15px] leading-none font-bold text-pg-orange ring-1 ring-pg-line"
      >
        +
      </button>
    </span>
  );
}
