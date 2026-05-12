"use server";

/**
 * Server action — invokes the full Rule Checker on behalf of `/dev/rule-check/`.
 *
 * Engineering preview surface. Tokens stay server-side. Mirrors
 * `app/dev/simple-rule-check/actions.ts` but uses the batch API.
 */

import { checkRules, type RuleCheckBatchRunAudited } from "@/lib/rule-check";

export interface RunCheckBatchOptions {
  actionRef: string;
  candidateId: string;
  jobRef: string;
  client: string;
  clientDepartment?: string;
  domain: string;
  ruleIds?: string[];
}

export type RunCheckBatchResult =
  | { ok: true; batch: RuleCheckBatchRunAudited }
  | { ok: false; error: string; details?: unknown };

export async function runCheckBatch(
  opts: RunCheckBatchOptions,
): Promise<RunCheckBatchResult> {
  try {
    const batch = await checkRules({
      actionRef: opts.actionRef,
      candidateId: opts.candidateId,
      jobRef: opts.jobRef,
      scope: { client: opts.client, department: opts.clientDepartment },
      domain: opts.domain,
      ruleIds: opts.ruleIds,
    });
    return { ok: true, batch };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      details: err instanceof Error && err.stack ? { stack: err.stack } : undefined,
    };
  }
}
