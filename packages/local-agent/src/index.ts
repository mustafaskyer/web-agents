/**
 * @web-agents/local-agent: an on-device AgentAdapter for @web-agents/chat. No server, no key; nothing the user
 * types leaves the browser.
 *
 *   <AgentChat adapters={[createCloudAdapter(), createLocalAdapter()]} />
 *
 * Providers, first available wins: Chrome's built-in model (Prompt API), then a small Qwen3 model run by
 * transformers.js in a Web Worker (WebGPU, or WASM with a smaller model). A model download starts only from
 * `prepare()`, i.e. the person's click in the chat's download card.
 */
import type { AdapterStatus, AgentAdapter, AgentRunRequest, AgentStreamPart } from "@web-agents/chat";
import { type LocalLoopOptions, runLocalAgent } from "./loop";
import { createPromptApiProvider } from "./providers/prompt-api/provider";
import { createTransformersProvider, type TransformersProviderOptions } from "./providers/transformers/provider";
import type { LocalProvider, ProviderAvailability } from "./types";

/** Options for `createLocalAdapter`. */
export interface LocalAdapterOptions extends Pick<LocalLoopOptions, "maxSteps" | "stepTimeoutMs"> {
  /** Engines to try, in order. Default: Chrome's Prompt API, then transformers.js. */
  providers?: LocalProvider[];
  /** transformers.js model id (default: Qwen3 0.6B ONNX; "onnx-community/Qwen3-1.7B-ONNX" needs more memory). */
  model?: string;
  /** The transformers.js worker, when your bundler can't resolve the package's own (see the README). */
  worker?: TransformersProviderOptions["worker"];
  /** Shown in the chat's adapter switcher. Default "On-device". */
  label?: string;
}

const STATUS_LOADING: AdapterStatus = { state: "loading" };

/** Each provider's availability right now, e.g. for a settings screen. */
export async function detectLocalProviders(
  providers: readonly LocalProvider[] = [createPromptApiProvider(), createTransformersProvider()],
): Promise<Array<{ id: string; availability: ProviderAvailability }>> {
  return Promise.all(
    providers.map(async (p) => ({
      id: p.id,
      availability: await p.availability().catch((e) => ({ state: "unavailable" as const, reason: String(e) })),
    })),
  );
}

/** An AgentAdapter that runs a model in this browser. Create it once per page. */
export function createLocalAdapter(opts: LocalAdapterOptions = {}): AgentAdapter {
  const providers = opts.providers ?? [createPromptApiProvider(), createTransformersProvider({ model: opts.model, worker: opts.worker })];
  let status: AdapterStatus = STATUS_LOADING;
  let provider: LocalProvider | null = null;
  let detecting: Promise<void> | null = null;
  let preparing: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const set = (next: AdapterStatus): void => {
    status = next;
    for (const l of listeners) l();
  };

  const fromAvailability = (a: ProviderAvailability): AdapterStatus =>
    a.state === "available"
      ? { state: "ready" }
      : a.state === "needs-download"
        ? { state: "needs-download", bytes: a.bytes, note: a.note }
        : a.state === "downloading"
          ? // nothing reports progress until prepare() follows it: offer the click that does
            { state: "needs-download", note: "Already downloading in the background: continue to follow its progress." }
          : { state: "unavailable", reason: a.reason };

  /** The first provider that is ready, else the first that can download, else unavailable. */
  const detect = (): Promise<void> =>
    (detecting ??= (async () => {
      const usable = providers.filter((p) => !p.broken);
      const found = await detectLocalProviders(usable);
      const pick = (state: ProviderAvailability["state"]) => found.findIndex((f) => f.availability.state === state);
      const index = [pick("available"), pick("downloading"), pick("needs-download")].find((i) => i !== -1);
      if (index === undefined) {
        const reason = found.map((f) => (f.availability.state === "unavailable" ? f.availability.reason : "")).find(Boolean);
        return set({ state: "unavailable", reason: reason ?? "No on-device model can run in this browser." });
      }
      provider = usable[index]!;
      set(fromAvailability(found[index]!.availability));
    })());

  return {
    id: "local",
    label: opts.label ?? "On-device",
    status() {
      if (typeof window !== "undefined") void detect();
      return status;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    prepare(signal?: AbortSignal) {
      preparing ??= (async () => {
        try {
          await detect();
          const p = provider;
          if (!p || status.state === "ready" || status.state === "unavailable" || signal?.aborted) return;
          const before = status;
          set({ state: "downloading", progress: 0 });
          try {
            await p.prepare((progress) => set({ state: "downloading", progress }), signal);
            set({ state: "ready" });
          } catch (err) {
            const cancelled = (err as { name?: string })?.name === "AbortError";
            set(
              cancelled
                ? before
                : { state: "error", error: `The model couldn't load: ${err instanceof Error ? err.message : String(err)}` },
            );
            if (!cancelled) throw err;
          }
        } finally {
          preparing = null; // every outcome: the next click starts afresh
        }
      })();
      return preparing;
    },
    async *run(req: AgentRunRequest): AsyncGenerator<AgentStreamPart> {
      if (status.state !== "ready" || !provider) {
        return yield { type: "error", error: "The on-device model isn't ready: download it first." };
      }
      const current = provider;
      yield* runLocalAgent(current, req, {
        maxSteps: opts.maxSteps,
        stepTimeoutMs: opts.stepTimeoutMs,
        toolsInline: current.toolsInline,
      });
      if (current.broken) {
        // e.g. Chrome's model reported "available" but can't start: pick the next provider (a download card follows)
        provider = null;
        detecting = null;
        set(STATUS_LOADING);
        void detect();
      }
    },
  };
}

export { runLocalAgent } from "./loop";
export type { LocalLoopOptions } from "./loop";
export { createPromptApiProvider } from "./providers/prompt-api/provider";
export { createTransformersProvider, DEFAULT_CPU_MODEL, DEFAULT_GPU_MODEL, MODELS } from "./providers/transformers/provider";
export type { TransformersProviderOptions } from "./providers/transformers/provider";
export { createProseFilter, parseToolCalls } from "./tool-call-parser";
export type { ParsedCall, ParseResult } from "./tool-call-parser";
export { compactSchema, rankTools, validateArgs } from "./tools";
export type * from "./types";
