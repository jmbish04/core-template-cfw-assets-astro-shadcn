/**
 * @fileoverview Typed client for the `CORE_GUARDIAN` service binding.
 *
 * ALL inference in this Worker goes through core-guardian — see
 * `~/AGENTS-ai.md`. There is no local model, no Workers AI binding, and no
 * direct provider call left in this template. `guardianChat` is the single
 * chokepoint every route (chat, dashboard insights, thread titles/followups)
 * calls through.
 *
 * Consumer side of the RPC contract lives in
 * `core-guardian/src/backend/guardian/ai-router/rpc.ts` (`GuardianRpc.run`) —
 * it validates with the same `runBody` zod schema as the HTTP door and
 * returns `{ status, body }` (200 success / 422 no_model_in_budget /
 * 429 breaker) or `{ stream: Response }` when `stream: true`. We never use
 * `stream` here — every caller wants a plain string reply.
 */

/** A single chat turn sent to the model. */
export interface GuardianMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GuardianChatOptions {
  messages: GuardianMessage[];
  /** Free-form label for the ai_routing_decisions log (e.g. "chat_reply"). */
  task?: string;
  /** Guardian use_case — defaults to "chat". */
  useCase?: string;
  importance?: "low" | "medium" | "high";
  complexity?: "low" | "medium" | "high";
}

export interface GuardianChatResult {
  text: string;
  provider: string | null;
  model: string | null;
  costUsd: number | null;
  requestUuid: string | null;
}

/** Thrown when core-guardian rejects or fails a run. `status` is the HTTP-shaped status core-guardian returned (422/429/other). */
export class GuardianError extends Error {
  constructor(public readonly status: number, public readonly body: unknown) {
    super(`core-guardian run failed (status ${status})`);
  }
}

/** Extract the assistant text from core-guardian's OpenAI-shaped inner body. */
function textFrom(body: any): string {
  return body?.choices?.[0]?.message?.content ?? body?.reply ?? body?.text ?? "";
}

/**
 * Run a chat completion through core-guardian's AI router.
 *
 * @throws {GuardianError} on a non-200 result (422 no model in budget, 429
 *   circuit breaker, or any other rejection). Callers map this to an HTTP
 *   response — never leak `error.body` to the client.
 */
export async function guardianChat(
  env: Env,
  { messages, task, useCase = "chat", importance = "low", complexity }: GuardianChatOptions,
): Promise<GuardianChatResult> {
  // The generated `Service` binding type has no static knowledge of
  // `GuardianRpc`'s methods (it lives in a different Worker's source tree),
  // so this cast is the same shape used by every other core-guardian
  // consumer (e.g. wei-visits-atl/src/backend/api/chat.ts).
  const guardian = env.CORE_GUARDIAN as unknown as {
    run(payload: unknown): Promise<{ status: number; body: unknown } | { stream: Response }>;
  };
  const result = await guardian.run({
    project: "core-template-cfw-assets-astro-shadcn",
    importance,
    use_case: useCase,
    task,
    complexity,
    input: { messages },
  });

  if ("stream" in result) {
    // ponytail: no caller passes stream:true today; guard anyway so a future
    // caller gets a clear error instead of a silent type mismatch.
    throw new GuardianError(500, { error: "Unexpected stream result from guardianChat" });
  }

  if (result.status !== 200) {
    throw new GuardianError(result.status, result.body);
  }

  const outer = result.body as any;
  const inner = outer?.body ?? outer;
  return {
    text: textFrom(inner).trim(),
    provider: outer?.provider ?? null,
    model: outer?.model ?? null,
    costUsd: outer?.cost_usd ?? null,
    requestUuid: outer?.request_uuid ?? null,
  };
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

/**
 * Run a chat completion through core-guardian and get the raw SSE `Response`
 * back instead of a settled string.
 *
 * core-guardian answers `{ stream: Response }` when `stream: true` is set on
 * the run payload; the body is an OpenAI-shaped `data: {...}` event stream
 * terminated by `data: [DONE]`. Callers are expected to re-emit their own
 * event shape rather than proxying this straight to the browser, so the
 * server still sees every token and can persist the finished turn.
 *
 * @throws {GuardianError} when core-guardian answers with a status instead of
 *   a stream (422 no model in budget, 429 breaker, anything else).
 */
export async function guardianStream(
  env: Env,
  { messages, task, useCase = "chat", importance = "low", complexity }: GuardianChatOptions,
): Promise<Response> {
  const guardian = env.CORE_GUARDIAN as unknown as {
    run(payload: unknown): Promise<{ status: number; body: unknown } | { stream: Response }>;
  };
  const result = await guardian.run({
    project: "core-template-cfw-assets-astro-shadcn",
    importance,
    use_case: useCase,
    task,
    complexity,
    stream: true,
    input: { messages },
  });

  if ("stream" in result) return result.stream;
  throw new GuardianError(result.status, result.body);
}

/**
 * Read an OpenAI-shaped SSE body and yield each incremental text delta.
 *
 * Tolerates both `choices[0].delta.content` (chat completions) and a bare
 * `{ text }`/`{ response }` payload, because core-guardian normalises
 * different upstream providers and not all of them use the same field.
 */
export async function* readGuardianDeltas(stream: Response): AsyncGenerator<string> {
  const body = stream.body;
  if (!body) return;

  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;

    // SSE frames are separated by a blank line; keep the trailing partial.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const delta =
            json?.choices?.[0]?.delta?.content ??
            json?.choices?.[0]?.message?.content ??
            json?.response ??
            json?.text ??
            "";
          if (typeof delta === "string" && delta.length > 0) yield delta;
        } catch {
          // A non-JSON keepalive frame is normal; skip it.
        }
      }
    }
  }
}

/**
 * Ask core-guardian for a short chat title.
 *
 * Deliberately best-effort: a degraded router must never fail the chat turn
 * that triggered the titling, so this returns `null` instead of throwing.
 */
export async function guardianTitle(env: Env, firstUserMessage: string): Promise<string | null> {
  try {
    const { text } = await guardianChat(env, {
      task: "threads_title",
      useCase: "chat",
      importance: "low",
      messages: [
        {
          role: "system",
          content:
            "You write a short chat title (3-7 words) summarising the user's message. " +
            "Return ONLY the title — no quotes, no trailing punctuation, no preamble.",
        },
        { role: "user", content: firstUserMessage.slice(0, 800) },
      ],
    });
    const title = text.replace(/^["'\s]+|["'\s]+$/g, "").slice(0, 80);
    return title || null;
  } catch (error) {
    console.error("guardianTitle error:", error);
    return null;
  }
}
