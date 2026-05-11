// v4-4 fill-in template for action=matchResume.
// Rules are rendered from original upstream prose; no LLM transform is used.

import type { ActionObjectV4, EnrichedAction } from "../../types";
import { assembleActionObjectV4_4 } from "../../assemble-v4-4";

export function matchResumeTemplate(
  enriched: EnrichedAction,
  options: { client?: string; domain?: string; runtimeInput?: string | Record<string, unknown> },
): ActionObjectV4 {
  return assembleActionObjectV4_4({
    enriched,
    client: options.client,
    domain: options.domain,
    runtimeInput: options.runtimeInput,
  });
}

export default matchResumeTemplate;
