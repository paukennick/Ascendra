// REQ-230: the generator's model calls, behind one small interface so every
// test uses a mocked model and only the CLI makes a real client.
//
// Key: ANTHROPIC_PREGEN_API_KEY, the dedicated pre-generation workspace's
// key (docs/operations-runbook.md "Pre-generating lessons", its own spend
// limit). With no key the generator refuses to call the API and says so; it
// never falls back to the app's ANTHROPIC_API_KEY. The key is never printed.
//
// These are offline authoring calls, not learner requests: no learner is
// charged, nothing goes through the app's spend gate or ai_calls, and the
// run is capped by --max-usd instead (pipeline.ts). The cost of every call is
// in the draft's report.
import Anthropic from "@anthropic-ai/sdk";

export const KEY_ENV = "ANTHROPIC_PREGEN_API_KEY";

export class NoKeyError extends Error {
  constructor() {
    super(`${KEY_ENV} is not set, so sims:generate will not call the API. Set it to the pre-generation workspace's key (docs/operations-runbook.md "Generating sims"); the app's ANTHROPIC_API_KEY is never used. Nothing was sent.`);
    this.name = "NoKeyError";
  }
}

export function pregenKey(env: Record<string, string | undefined> = process.env): string {
  const k = (env[KEY_ENV] ?? "").trim();
  if (!k) throw new NoKeyError();
  return k;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface ModelRequest {
  purpose: "write" | "fact_check";
  model: string;
  system: string;
  user: string;
  maxTokens: number;
}

export interface ModelResponse {
  text: string;
  model: string;
  usage: Usage;
  stopReason: string | null;
}

export interface SimModelClient {
  call(req: ModelRequest): Promise<ModelResponse>;
}

// The real client. Streams, because a document is tens of thousands of
// output tokens and the SDK refuses long non-streaming requests.
export function anthropicClient(env: Record<string, string | undefined> = process.env): SimModelClient {
  const client = new Anthropic({ apiKey: pregenKey(env) });
  return {
    async call(req) {
      const msg = await client.messages
        .stream({ model: req.model, max_tokens: req.maxTokens, system: req.system, messages: [{ role: "user", content: req.user }] })
        .finalMessage();
      const text = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      const u = msg.usage as Anthropic.Usage;
      return {
        text,
        model: msg.model,
        stopReason: msg.stop_reason ?? null,
        usage: {
          inputTokens: u.input_tokens ?? 0,
          outputTokens: u.output_tokens ?? 0,
          cacheReadTokens: u.cache_read_input_tokens ?? 0,
          cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
        },
      };
    },
  };
}
