/**
 * Recognising the baggage comparison among the Findings a screen has handed over.
 *
 * Its own module with its own test, for two reasons it earned the hard way:
 *
 *   1. The first version matched the phrase "worse off". The finding's wording
 *      later improved, the phrase vanished, and the headline intervention
 *      silently stopped firing. Match on content, never on prose.
 *   2. The second version was patched in by a shell script that turned `\b` into
 *      a literal backspace character, so the pattern read `/kg/i` in an editor
 *      and `/<BS>kg<BS>/i` to the engine. It matched nothing, and looked correct
 *      in every grep. Keeping the predicate here, tested, makes that failure
 *      impossible to ship twice.
 */

/** Does this Finding carry the SAVER-versus-a-la-carte baggage comparison? */
export function isBaggageGapFinding(finding: string): boolean {
  const mentionsSaver = finding.toUpperCase().includes("SAVER");
  const mentionsAllowance = finding.toLowerCase().includes("kg");
  return mentionsSaver && mentionsAllowance;
}

/** The first Finding that carries it, or null. */
export function findBaggageGap(findings: readonly string[]): string | null {
  return findings.find(isBaggageGapFinding) ?? null;
}
