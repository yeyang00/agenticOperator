/**
 * LLM client wrapper — OpenAI-compatible Chat Completions API.
 *
 * Configured via OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL. Used by both
 * dev-time transformation (gen-v4-templates) and runtime V4-1.
 */

interface OpenAiClientConfig {
  apiKey: string;
  baseUrl: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
    finish_reason?: string | null;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
}

type MessageContent = NonNullable<
  NonNullable<NonNullable<ChatCompletionResponse["choices"]>[number]["message"]>["content"]
> | undefined;

let cachedClient: OpenAiClientConfig | null = null;

export function getLlmClient(opts?: { apiBaseUrl?: string; apiKey?: string }): OpenAiClientConfig {
  if (cachedClient && !opts) return cachedClient;

  const apiKey = opts?.apiKey ?? process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error("v4 LLM client requires OPENAI_API_KEY (set in .env.local)");
  }

  const baseUrl = normalizeBaseUrl(
    opts?.apiBaseUrl ?? process.env["OPENAI_BASE_URL"] ?? "https://api.openai.com/v1",
  );
  const client = { apiKey, baseUrl };
  if (!opts) cachedClient = client;
  return client;
}

export function getDefaultModel(): string {
  return process.env["OPENAI_MODEL"] ?? "kimi-k2.6";
}

export interface CompletionInput {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

/**
 * Run a chat completion. Returns the assistant's message text.
 * Errors bubble up as-is (caller decides retry/log).
 */
export async function runCompletion(input: CompletionInput): Promise<string> {
  const client = getLlmClient();
  const model = input.model ?? getDefaultModel();
  const ctrl = new AbortController();
  // Reasoning/transform calls can take several minutes on complex actions.
  const timeoutMs = input.timeoutMs ?? 600_000; // 10 minutes
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(`${client.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${client.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: input.userPrompt },
          ],
          max_tokens: input.maxTokens ?? 8192,
          ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
          stream: false,
        }),
        signal: ctrl.signal,
      });
    } catch (err) {
      if (ctrl.signal.aborted) {
        throw new Error(`OpenAI-compatible LLM request timed out after ${timeoutMs}ms`);
      }
      throw err;
    }

    const rawBody = await response.text();
    let data: ChatCompletionResponse;
    try {
      data = JSON.parse(rawBody) as ChatCompletionResponse;
    } catch {
      throw new Error(
        `OpenAI-compatible LLM returned non-JSON response (${response.status} ${response.statusText}): ${rawBody.slice(0, 500)}`,
      );
    }

    if (!response.ok) {
      const message = data.error?.message ?? rawBody.slice(0, 500);
      throw new Error(
        `OpenAI-compatible LLM request failed (${response.status} ${response.statusText}): ${message}`,
      );
    }

    const choice = data.choices?.[0];
    const text = extractMessageText(choice?.message?.content).trim();
    if (!text) {
      const stopReason = choice?.finish_reason ?? "(unknown)";
      throw new Error(
        `LLM returned empty content (finish_reason=${stopReason}). Try increasing maxTokens.`,
      );
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sanity check the LLM connection. Returns the model's response to a trivial prompt.
 */
export async function testConnection(): Promise<{ ok: boolean; model: string; reply: string }> {
  const model = getDefaultModel();
  try {
    const reply = await runCompletion({
      systemPrompt: "You are a sanity-check responder.",
      userPrompt: "Reply with exactly the word OK.",
    });
    return { ok: true, model, reply: reply.trim() };
  } catch (err) {
    return { ok: false, model, reply: err instanceof Error ? err.message : String(err) };
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function extractMessageText(content: MessageContent): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => part.text ?? "").join("");
  }
  return "";
}
