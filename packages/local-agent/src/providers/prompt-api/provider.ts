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

type PromptInput = Array<{ role: string; content: string }>;

/** Tokens kept free for the reply (a tool call or a short answer). */
const REPLY_TOKENS = 200;

/** The conversation as Prompt API turns: tool results read as user turns; the system prompt rides on the first turn. */
function toInput(req: Pick<GenerateRequest, "system" | "messages">): PromptInput {
  const turns = req.messages.map((t) =>
    t.role === "tool"
      ? { role: "user" as const, content: `Result of ${t.name ?? "the tool"}: ${t.content}` }
      : { role: t.role, content: t.content },
  );
  // a clone keeps the base's (empty) system prompt
  const [first, ...rest] = turns.length ? turns : [{ role: "user" as const, content: "" }];
  return [{ role: first!.role, content: `${req.system}\n\n---\n\n${first!.content}` }, ...rest];
}

/**
 * The slice of the Prompt API this provider uses, declared here rather than through global types: the API is a
 * preview whose shape moves, and consumers shouldn't need its type package to compile.
 */
interface PromptSession {
  clone(options?: { signal?: AbortSignal }): Promise<PromptSession>;
  /** The input window in tokens: `contextWindow` in newer Chrome, `inputQuota` before. */
  contextWindow?: number;
  inputQuota?: number;
  measureContextUsage?(input: PromptInput): Promise<number>;
  measureInputUsage?(input: PromptInput): Promise<number>;
  prompt(input: PromptInput, options?: { responseConstraint?: Record<string, unknown>; signal?: AbortSignal }): Promise<string>;
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

/** Remembered per browser version: a Chrome that couldn't start its model is skipped until it updates. */
const BROKEN_KEY = "web-agents:prompt-api-broken";
const brokenHere = (): boolean => {
  try {
    return localStorage.getItem(BROKEN_KEY) === navigator.userAgent;
  } catch {
    return false;
  }
};
const rememberBroken = (): void => {
  try {
    localStorage.setItem(BROKEN_KEY, navigator.userAgent);
  } catch {
    // only saves a failed start next time
  }
};

const api = (): PromptApi | undefined => (globalThis as { LanguageModel?: PromptApi }).LanguageModel;

/** A provider backed by Chrome's built-in model. */
export function createPromptApiProvider(): LocalProvider {
  // Created in prepare() (it starts Chrome's download and keeps the model loaded); every generation runs in a clone of
  // it. Some devices report "available" yet refuse a fresh create() ("unable to create a session"); a clone of a
  // session that did start avoids a second create.
  let base: PromptSession | null = null;
  const BROKEN = "Chrome's built-in model couldn't start on this device.";
  let broken: string | undefined = typeof localStorage === "undefined" || !brokenHere() ? undefined : BROKEN;
  return {
    id: "prompt-api",
    label: "Chrome built-in",
    toolsInline: true,
    get broken() {
      return broken;
    },

    async availability(): Promise<ProviderAvailability> {
      const LM = api();
      if (!LM) return { state: "unavailable", reason: UNAVAILABLE };
      if (broken) return { state: "unavailable", reason: broken };
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
      const input = toInput(req);
      let session: PromptSession;
      try {
        base ??= await LM.create({ ...TEXT_IO, signal: req.signal });
        session = await base.clone({ signal: req.signal });
      } catch (err) {
        if (req.signal.aborted) throw err;
        // the device can't run it after all: say so once, and let the adapter move to the next provider
        broken = BROKEN;
        rememberBroken();
        throw new Error(`${broken} Switching to the downloadable model.`, { cause: err });
      }
      try {
        const text = await session.prompt(input, { responseConstraint: actionSchema(req.tools.map((t) => t.name)), signal: req.signal });
        req.onToken?.(""); // nothing streams: the loop shows the parsed message at once
        return { text };
      } finally {
        session.destroy();
      }
    },

    // Some devices give the model a window of ~1000 tokens: the loop shrinks the prompt until this says it fits.
    async fits(req) {
      const window = base?.contextWindow ?? base?.inputQuota;
      const measure = base?.measureContextUsage ?? base?.measureInputUsage;
      if (!base || !window || !measure) return true;
      return (await measure.call(base, toInput(req))) + REPLY_TOKENS <= window;
    },

    dispose() {
      base?.destroy();
      base = null;
    },
  };
}
