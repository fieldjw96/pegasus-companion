"use client";

import { useState } from "react";

/**
 * The passenger form, with fields that actually work.
 *
 * The live app's three friction bugs are reproduced as the *initial state*, not
 * as immovable markup: Nationality starts on Turkish Citizen with a Turkish ID
 * demanded, the phone code starts on CA (+1), and the date-of-birth error shows
 * before anything has been typed — all for a passenger departing London.
 *
 * Reproducing them as defaults rather than as decoration is the point. They have
 * to be wrong *and* changeable, so the demo can show how much work the app makes
 * someone do that it never needed to ask for.
 */
export function PassengerForm({ originCity }: { originCity: string }) {
  const [name, setName] = useState("Jack");
  const [surname, setSurname] = useState("Field");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"female" | "male" | null>(null);
  const [turkish, setTurkish] = useState(true);
  const [turkishId, setTurkishId] = useState("");
  const [dialCode, setDialCode] = useState("+1");
  const [phone, setPhone] = useState("3412543412");
  const [contactMe, setContactMe] = useState(false);

  // Shown before input, exactly as the live app does.
  const dobError = dob === "" ? "The age range for adults should be 12+." : null;
  const genderError = gender === null ? "Gender must be selected" : null;
  const idError = turkish && turkishId.trim().length !== 11 ? "Incorrect Turkish ID" : null;

  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-pg-yellow">
          👤
        </span>
        <div className="flex-1">
          <p className="text-[19px] font-bold">1. Adult passenger</p>
          <p className="text-[15px] text-pg-ink">Aged 12+</p>
        </div>
        <span className="text-[18px] text-pg-yellow">⌃</span>
      </div>

      <div className="mt-4 rounded-xl bg-pg-surface p-3">
        <p className="text-[16px] font-semibold">Select from Registered Contacts</p>
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setName("");
              setSurname("");
            }}
            className="rounded-md border border-pg-line bg-white px-4 py-2.5 text-[15px]"
          >
            New Contact
          </button>
          <button
            type="button"
            onClick={() => {
              setName("Jack");
              setSurname("Field");
            }}
            className="rounded-md border border-pg-yellow bg-pg-yellow px-4 py-2.5 text-[15px] font-medium"
          >
            Jack F.
          </button>
        </div>
      </div>

      <Text label="Name*" value={name} onChange={setName} />
      <Text label="Surname*" value={surname} onChange={setSurname} />

      <div className="mt-4 flex gap-2 rounded-xl bg-pg-surface p-3 text-[14px] leading-snug">
        <span className="text-pg-yellow">❗</span>
        <span>
          The details on your ticket and travel document (ID/passport) must be identical.
        </span>
      </div>

      <div className="mt-5">
        <label className="block text-[14px] text-pg-ink" htmlFor="dob">
          Date of birth*
        </label>
        <input
          id="dob"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className={`w-full border-b bg-transparent pb-1 text-[19px] font-bold outline-none ${
            dobError === null ? "border-pg-line" : "border-red-600"
          }`}
        />
        {dobError !== null && (
          <p className="mt-1 text-right text-[14px] text-red-600">{dobError}</p>
        )}
      </div>

      <fieldset className="mt-5">
        <legend className="text-[17px] font-bold">Gender*</legend>
        <div className="mt-2 flex gap-8">
          <Radio
            label="Female"
            checked={gender === "female"}
            onSelect={() => setGender("female")}
          />
          <Radio label="Male" checked={gender === "male"} onSelect={() => setGender("male")} />
        </div>
        {genderError !== null && (
          <p className="mt-2 text-right text-[14px] text-red-600">{genderError}</p>
        )}
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-[17px] font-bold">Nationality*</legend>
        <div className="mt-2 flex gap-8">
          <Radio label="Turkish Citizen" checked={turkish} onSelect={() => setTurkish(true)} />
          <Radio label="Other" checked={!turkish} onSelect={() => setTurkish(false)} />
        </div>
        {!turkish && (
          <p className="mt-2 text-[13px] leading-snug text-pg-ink">
            Switching to Other removes the Turkish ID requirement. The app knew this flight
            departs {originCity} before it asked.
          </p>
        )}
      </fieldset>

      {turkish && (
        <div className="mt-5">
          <label className="block text-[14px] text-pg-ink" htmlFor="tcid">
            Turkish ID Number*
          </label>
          <input
            id="tcid"
            inputMode="numeric"
            placeholder="Enter"
            value={turkishId}
            onChange={(e) => setTurkishId(e.target.value)}
            className={`w-full border-b bg-transparent pb-1 text-[19px] font-bold outline-none placeholder:text-pg-line ${
              idError === null ? "border-pg-line" : "border-red-600"
            }`}
          />
          {idError !== null && (
            <p className="mt-1 text-right text-[14px] text-red-600">{idError}</p>
          )}
        </div>
      )}

      <div className="mt-5">
        <p className="text-[14px] text-pg-ink">Mobile Phone ⓘ</p>
        <div className="flex items-baseline gap-3 border-b border-pg-line pb-1">
          <select
            aria-label="Country dialling code"
            value={dialCode}
            onChange={(e) => setDialCode(e.target.value)}
            className="bg-transparent text-[17px] font-semibold text-pg-ink outline-none"
          >
            <option value="+1">CA (+1)</option>
            <option value="+44">UK (+44)</option>
            <option value="+90">TR (+90)</option>
            <option value="+49">DE (+49)</option>
          </select>
          <input
            aria-label="Mobile number"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setContactMe((v) => !v)}
        className="mt-5 flex w-full items-center gap-3 text-left"
      >
        <span className="flex-1 text-[16px] font-bold">
          Please contact this passenger for ticket information
        </span>
        <span
          className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
            contactMe ? "bg-pg-yellow" : "bg-pg-line"
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white transition ${contactMe ? "translate-x-5" : ""}`}
          />
        </span>
      </button>

      <p className="mt-5 text-[13px] text-pg-ink">*Required fields.</p>
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="mt-5">
      <label className="block text-[14px] text-pg-ink">
        {label}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-b border-pg-line bg-transparent pb-1 text-[19px] font-bold text-pg-navy outline-none"
        />
      </label>
    </div>
  );
}

function Radio({
  label,
  checked,
  onSelect,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="flex items-center gap-3 text-[17px]">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
          checked ? "border-pg-yellow bg-pg-yellow" : "border-pg-line"
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
      {label}
    </button>
  );
}
