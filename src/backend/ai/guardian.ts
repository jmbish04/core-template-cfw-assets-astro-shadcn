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
