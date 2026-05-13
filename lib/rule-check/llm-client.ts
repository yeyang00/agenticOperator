/**
 * LLM client for the full `rule-check` impl.
 *
 * Differences from MVP's `lib/simple-rule-check/llm-client.ts`:
 *   - Optionally requests `logprobs: true` so the composite confidence
 *     calculator can consume per-token logprobs (Phase E). Default is OFF
 *     because some OpenAI-compatible providers (Kimi/Moonshot via new-api
 *     proxies, etc.) hang or 4xx when `logprobs: true` is sent. Set
 *     `RULE_CHECK_LOGPROBS=1` (or pass `enableLogprobs: true`) to opt in
 *     once you've verified the provider supports it.
 *   - Uses the BatchJudgmentsJsonSchema as the strict response_format.
 *   - Returns the per-token logprobs alongside the raw response when
 *     requested; otherwise `logprobs: null` and the composite confidence
 *     calculator gracefully degrades to the no-logprob formula (locked
 *     decision #4).
 */

import OpenAI from "openai";

import { rcDebug, rcInfo, rcWarn } from "./debug";
import { BatchJudgmentsJsonSchema } from "./output-schema-audited";

export class LLMUnreachableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LLMUnreachableError";
  }
}

export interface LLMEvaluateInput {
  system: string;
  user: string;
  /** Override model. Defaults to OPENAI_MODEL env or "gpt-4o". */
  model?: string;
  /** Override key. Defaults to OPENAI_API_KEY env. */
  apiKey?: string;
  /** Override base URL. Defaults to OPENAI_BASE_URL env or OpenAI default. */
  baseUrl?: string;
  /** Schema name to label the response_format JSON Schema. */
  schemaName?: string;
  /**
   * Enable `logprobs: true` on the chat-completions request. Default is OFF
   * (some providers hang on it). When unset, falls back to env
   * `RULE_CHECK_LOGPROBS=1`. composite confidence degrades gracefully when
   * logprobs are absent — see `lib/rule-check/confidence/composite.ts`.
   */
  enableLogprobs?: boolean;
}

export interface LogprobToken {
  token: string;
  logprob: number;
}

export interface LLMEvaluateOutput {
  /** Plain-object form of the raw API response (RSC-safe). */
  response: unknown;
  model: string;
  contentJson: unknown;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** null when provider didn't return logprobs (composite confidence degrades). */
  logprobs: LogprobToken[] | null;
}

const DEFAULT_MODEL = "gpt-4o";
let loggedLogprobWarning = false;

export async function evaluate(input: LLMEvaluateInput): Promise<LLMEvaluateOutput> {
  const apiKey = input.apiKey ?? process.env["OPENAI_API_KEY"] ?? "";
  if (!apiKey) {
    throw new LLMUnreachableError(
      "OPENAI_API_KEY is not set (and no apiKey override provided)",
    );
  }
  const baseURL = input.baseUrl ?? process.env["OPENAI_BASE_URL"];
  const model = input.model ?? process.env["OPENAI_MODEL"] ?? DEFAULT_MODEL;
  const schemaName = input.schemaName ?? "RuleCheckBatchJudgments";

  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });

  // logprobs: default OFF (many providers — e.g. Kimi via new-api proxy —
  // hang when this field is sent). Opt in via input.enableLogprobs OR
  // RULE_CHECK_LOGPROBS=1/true.
  const logprobsRequested = resolveLogprobsRequested(input.enableLogprobs);

  rcDebug("llm", "evaluate config", {
    model,
    baseURL: baseURL ?? "(default openai)",
    apiKeyTail: apiKey.slice(-4),
    schemaName,
    logprobsRequested,
    systemChars: input.system.length,
    userChars: input.user.length,
  });

  const attempt = async (): Promise<LLMEvaluateOutput> => {
    const t0 = Date.now();
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          schema: BatchJudgmentsJsonSchema as unknown as Record<string, unknown>,
          strict: true,
        },
      },
      ...(logprobsRequested ? { logprobs: true } : {}),
    });
    const latencyMs = Date.now() - t0;

    const choice = response.choices[0];
    if (!choice || !choice.message || typeof choice.message.content !== "string") {
      throw new LLMUnreachableError(
        `LLM response missing message content (model=${model})`,
        response,
      );
    }

    let contentJson: unknown;
    try {
      contentJson = JSON.parse(choice.message.content);
    } catch (err) {
      throw new LLMUnreachableError(
        `LLM message content is not valid JSON (model=${model}): ${(err as Error).message}`,
        choice.message.content,
      );
    }

    // RSC boundary: strip class methods from the OpenAI SDK's response instance.
    const plainResponse: unknown = JSON.parse(JSON.stringify(response));

    // Extract logprobs (graceful degradation when null/missing).
    const logprobs = logprobsRequested ? extractLogprobs(choice) : null;
    if (logprobsRequested && logprobs === null && !loggedLogprobWarning) {
      loggedLogprobWarning = true;
      rcWarn("llm", "provider did not return logprobs — composite confidence will run in degraded mode", {
        model,
      });
    }
    rcDebug("llm", "response received", {
      model: response.model ?? model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      latencyMs,
      logprobTokens: logprobs ? logprobs.length : 0,
      contentChars: choice.message.content.length,
    });

    return {
      response: plainResponse,
      model: response.model ?? model,
      contentJson,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      latencyMs,
      logprobs,
    };
  };

  try {
    return await attempt();
  } catch (err) {
    if (isRetryable(err)) {
      rcWarn("llm", "retryable error — retrying after 500ms", {
        status: (err as { status?: number }).status,
        message: (err as Error).message,
      });
      await sleep(500);
      try {
        return await attempt();
      } catch (err2) {
        rcWarn("llm", "retry also failed", {
          message: (err2 as Error).message,
        });
        throw new LLMUnreachableError(
          `LLM call failed twice: ${(err2 as Error).message}`,
          err2,
        );
      }
    }
    if (err instanceof LLMUnreachableError) {
      rcInfo("llm", "LLMUnreachableError", { message: err.message });
      throw err;
    }
    rcWarn("llm", "non-retryable error", {
      message: (err as Error).message,
    });
    throw new LLMUnreachableError(`LLM call failed: ${(err as Error).message}`, err);
  }
}

function extractLogprobs(choice: unknown): LogprobToken[] | null {
  if (typeof choice !== "object" || choice === null) return null;
  const c = choice as { logprobs?: { content?: unknown } };
  const content = c.logprobs?.content;
  if (!Array.isArray(content)) return null;
  const tokens: LogprobToken[] = [];
  for (const entry of content) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as { token?: unknown; logprob?: unknown };
    if (typeof e.token === "string" && typeof e.logprob === "number") {
      tokens.push({ token: e.token, logprob: e.logprob });
    }
  }
  return tokens.length > 0 ? tokens : null;
}

function resolveLogprobsRequested(explicit: boolean | undefined): boolean {
  if (typeof explicit === "boolean") return explicit;
  const raw = process.env["RULE_CHECK_LOGPROBS"];
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function isRetryable(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const status = (err as { status?: number; code?: string }).status;
  if (typeof status === "number") {
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
