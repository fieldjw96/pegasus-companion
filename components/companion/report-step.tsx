"use client";

import { useEffect } from "react";
import { useCompanion } from "./companion-provider";
import type { CompanionState } from "@/lib/companion/types";

/**
 * Lets a server component tell the Companion where the passenger is, and hand it
 * any Findings that screen computed.
 *
 * The screens are server components so they can render inventory without
 * shipping it to the client; this is the one-line client island that reports.
 * Keeping it separate means a screen never becomes a client component just to
 * talk to the Companion.
 *
 * Findings arrive as finished sentences. A screen computes the arithmetic — the
 * judgement layer cannot count and must never be asked to.
 */
export function ReportStep({
  step,
  route,
  departDate,
  party,
  findings,
}: {
  step: CompanionState["step"];
  route?: string;
  departDate?: string;
  party?: CompanionState["party"];
  findings?: string[];
}) {
  const { report } = useCompanion();

  // Serialised so a fresh object literal on every render does not loop the effect.
  const serialised = JSON.stringify({ route, departDate, party, findings });

  useEffect(() => {
    const extra = JSON.parse(serialised) as {
      route?: string;
      departDate?: string;
      party?: CompanionState["party"];
      findings?: string[];
    };
    report({
      step,
      ...(extra.route !== undefined ? { route: extra.route } : {}),
      ...(extra.departDate !== undefined ? { departDate: extra.departDate } : {}),
      ...(extra.party !== undefined ? { party: extra.party } : {}),
      ...(extra.findings !== undefined ? { findings: extra.findings } : {}),
    });
  }, [step, serialised, report]);

  return null;
}
