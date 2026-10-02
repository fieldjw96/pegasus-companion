import { NextResponse, type NextRequest } from "next/server";
import { decide } from "@/lib/companion/decide";
import { companionStateSchema } from "@/lib/companion/types";

/**
 * The companion's one endpoint.
 *
 * Zod parses at this boundary rather than inside `decide`, so a malformed state
 * fails here naming the field, instead of reaching the judgement layer and
 * producing a confident answer about nonsense.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body was not JSON" }, { status: 400 });
  }

  const parsed = companionStateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "companion state did not validate", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const result = await decide(parsed.data);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
