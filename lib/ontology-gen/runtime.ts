/**
 * Runtime resolution mode (spec §11.5).
 *
 * Returns an in-memory `ActionObject` for an agent runtime. Single API call
 * (`GET /actions/{ref}/rules?domain=…`) followed by projection — no file IO,
 * no caching, no multi-API enrichment.
 *
 * Per-call scope filter on rules: `client` and (reserved) `clientDepartment`
 * narrow `actionSteps[*].rules` to those whose `applicableClient` is empty,
 * "通用", or matches the supplied client. Department filtering is wired but
 * a no-op until upstream API ships `applicableClientDepartment`.
 *
 * Errors propagate as-is from `fetchAction` — typed `OntologyGenError`
 * subclasses (`OntologyAuthError` / `OntologyNotFoundError` /
 * `OntologyTimeoutError` / `OntologyContractError` / `ActionValidationError`).
 * Caller decides retry/log.
 */

import { projectActionObject } from "./compile/index";
import { fetchAction } from "./fetch";
import type { ActionObject } from "./types.public";

export interface ResolveActionInput {
  /** Action name or numeric id (sent as URL path segment; server resolves). */
  actionRef: string;
  domain: string;
  /** Optional rule scope: drop rules whose `applicableClient` doesn't match. */
  client?: string;
  /** Reserved for upstream API support — currently a no-op. */
  clientDepartment?: string;
  /** Defaults to `process.env.ONTOLOGY_API_BASE`. */
  apiBase?: string;
  /** Defaults to `process.env.ONTOLOGY_API_TOKEN`. */
  apiToken?: string;
  timeoutMs?: number;
}

export async function resolveActionObject(input: ResolveActionInput): Promise<ActionObject> {
  const action = await fetchAction({
    actionRef: input.actionRef,
    domain: input.domain,
    apiBase: input.apiBase,
    apiToken: input.apiToken ?? process.env["ONTOLOGY_API_TOKEN"] ?? "",
    timeoutMs: input.timeoutMs,
  });

  const hasFilter = input.client !== undefined || input.clientDepartment !== undefined;

  return projectActionObject(action, {
    templateVersion: "v3",
    domain: input.domain,
    clientFilter: hasFilter
      ? { client: input.client, clientDepartment: input.clientDepartment }
      : undefined,
  });
}
