"use client";

import { useEffect } from "react";
import { useCompanion } from "./companion-provider";
import type { CompanionState } from "@/lib/companion/types";

/**
 * Lets a server component tell the companion which step it is.
 *
 * The screens are server components so they can render inventory without
 * shipping it to the client; this is the one-line client island that reports the
 * step. Keeping it separate means a screen never becomes a client component just
 * to talk to the companion.
 */
export function ReportStep({
  step,
  route,
  departDate,
  party,
}: {
  step: CompanionState["step"];
  route?: string;
  departDate?: string;
  party?: CompanionState["party"];
}) {
  const { report } = useCompanion();
  const serialised = JSON.stringify({ route, departDate, party });

  useEffect(() => {
    const extra = JSON.parse(serialised) as {
      route?: string;
      departDate?: string;
      party?: CompanionState["party"];
    };
    report({
      step,
      ...(extra.route !== undefined ? { route: extra.route } : {}),
      ...(extra.departDate !== undefined ? { departDate: extra.departDate } : {}),
      ...(extra.party !== undefined ? { party: extra.party } : {}),
    });
  }, [step, serialised, report]);

  return null;
}
