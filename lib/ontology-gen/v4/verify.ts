/**
 * Round-trip semantic verification.
 *
 * Given the original Chinese prose and the LLM-generated instruction, asks the
 * LLM (a second call) whether the generated text preserves all factual content.
 * Returns "passed" / "failed". Errors → "skipped" (don't block).
 */

import { runCompletion } from "./llm-client";
import { META_ROUND_TRIP_VERIFY } from "./meta-prompts";

export type RoundTripStatus = "passed" | "failed" | "skipped";

export async function verifyRoundTrip(
  originalProse: string,
  generatedInstruction: string,
  opts?: { model?: string },
): Promise<{ status: RoundTripStatus; reason?: string }> {
  if (!originalProse.trim() || !generatedInstruction.trim()) {
    return { status: "skipped", reason: "empty input" };
  }

  try {
    const userPrompt = `ORIGINAL PROSE:\n${originalProse}\n\nGENERATED INSTRUCTION:\n${generatedInstruction}\n\nNow respond with exactly PASS or FAIL: <reason>.`;
    const reply = await runCompletion({
      systemPrompt: META_ROUND_TRIP_VERIFY,
      userPrompt,
      model: opts?.model,
    });

    const trimmed = reply.trim();
    if (/^PASS\b/.test(trimmed)) return { status: "passed" };
    if (/^FAIL\b/i.test(trimmed)) {
      const reason = trimmed.replace(/^FAIL\s*:\s*/i, "");
      return { status: "failed", reason };
    }
    // Unrecognized format — skip rather than guess
    return { status: "skipped", reason: `unrecognized verifier output: ${trimmed.slice(0, 200)}` };
  } catch (err) {
    return {
      status: "skipped",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
