/**
 * Chrome's built-in model (the Prompt API, `LanguageModel`): nothing to
 * download per site once Chrome has it. Tool calls come from JSON-constrained
 * output (`responseConstraint`): the API's native tools run their `execute`
 * inside prompt(), which would take tool execution away from the agent loop
 * (and from the cursor, validation and confirmation pacing it provides).
 *
 * A preview API whose shape moves between Chrome versions: every call is
 * guarded, and anything unexpected reads as "unavailable", never a crash.
 */
import type { GenerateRequest, GenerateResult, LocalProvider, ProviderAvailability } from "../../types";

const TEXT_IO = { expectedInputs: [{ type: "text" as const }], expectedOutputs: [{ type: "text" as const }] };
const UNAVAILABLE = "Chrome's built-in model isn't available in this browser.";

/** The reply shape: a message or one tool call. Flat (no oneOf/const): the widest constraint support. */
export function actionSchema(toolNames: readonly string[]): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      type: { type: "string", enum: toolNames.length ? ["message", "tool_call"] : ["message"] },
      text: { type: "string" },
      ...(toolNames.length && { name: { type: "string", enum: [...toolNames] }, arguments: { type: "object" } }),
    },
    required: ["type"],
  };
}

/**
 * The slice of the Prompt API this provider uses, declared here rather than through global types: the API is a
 * preview whose shape moves, and consumers shouldn't need its type package to compile.
 */
interface PromptSession {
  prompt(
    input: Array<{ role: string; content: string }>,
    options?: { responseConstraint?: Record<string, unknown>; signal?: AbortSignal },
  ): Promise<string>;
  destroy(): void;
}
interface PromptApi {
  availability(options?: object): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
  create(options?: {
    expectedInputs?: { type: "text" }[];
    expectedOutputs?: { type: "text" }[];
    signal?: AbortSignal;
    monitor?(m: EventTarget): void;
    initialPrompts?: Array<{ role: string; content: string }>;
  }): Promise<PromptSession>;
}

const api = (): PromptApi | undefined => (globalThis as { LanguageModel?: PromptApi }).LanguageModel;

/** A provider backed by Chrome's built-in model. */
export function createPromptApiProvider(): LocalProvider {
  // created in prepare(): it starts Chrome's download and keeps the model loaded; each generation still needs its own
  // session, because the system prompt (which lists this step's tools) can only be set when a session is created
  let base: PromptSession | null = null;
  return {
    id: "prompt-api",
    label: "Chrome built-in",
    toolsInline: true,

    async availability(): Promise<ProviderAvailability> {
      const LM = api();
      if (!LM) return { state: "unavailable", reason: UNAVAILABLE };
      try {
        switch (await LM.availability(TEXT_IO)) {
          case "available":
            return { state: "available" };
          case "downloadable":
            return { state: "needs-download", note: "Chrome downloads its built-in model once, for every site." };
          case "downloading":
            return { state: "needs-download", note: "Chrome is already downloading its built-in model: continue to follow it." };
          default:
            return { state: "unavailable", reason: "Chrome's built-in model isn't available on this device." };
        }
      } catch {
        return { state: "unavailable", reason: UNAVAILABLE };
      }
    },

    async prepare(onProgress, signal) {
      const LM = api();
      if (!LM) throw new Error(UNAVAILABLE);
      base ??= await LM.create({
        ...TEXT_IO,
        signal,
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => onProgress((e as ProgressEvent).loaded));
        },
      });
    },

    async generate(req: GenerateRequest): Promise<GenerateResult> {
      const LM = api();
      if (!LM) throw new Error(UNAVAILABLE);
      // The conversation as Prompt API turns: tool results read as user turns.
      const turns = req.messages.map((t) =>
        t.role === "tool"
          ? { role: "user" as const, content: `Result of ${t.name ?? "the tool"}: ${t.content}` }
          : { role: t.role, content: t.content },
      );
      const last = turns.pop() ?? { role: "user" as const, content: "" };
      const session = await LM.create({
        ...TEXT_IO,
        signal: req.signal,
        initialPrompts: [{ role: "system", content: req.system }, ...turns],
      });
      try {
        const text = await session.prompt([last], { responseConstraint: actionSchema(req.tools.map((t) => t.name)), signal: req.signal });
        req.onToken?.(""); // nothing streams: the loop shows the parsed message at once
        return { text };
      } finally {
        session.destroy();
      }
    },

    dispose() {
      base?.destroy();
      base = null;
    },
  };
}
