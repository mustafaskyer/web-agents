/**
 * transformers.js on the main thread: a LocalProvider that talks to the model
 * worker. The worker starts on prepare() (an explicit click), never on import.
 *
 * Default model: Qwen3 0.6B, q4f16 on WebGPU and q4 on WASM. The 1.7B model (1.4 GB in one ONNX file) failed to
 * create a session in testing (`std::bad_alloc`: out of WASM memory while loading), so it's opt-in via `model` /
 * `models`. Whether a model is already on the device is asked of transformers.js itself (an exact per-file check of
 * its cache), so a returning visitor is never shown a Download button, and a cache read is never shown as a download.
 */
import type { ModelChoice } from "@webmcp-agents/chat";
import type { GenerateRequest, GenerateResult, LocalProvider, ProviderAvailability } from "../../types";
import { claimPage, estimateTokens, LARGE_MODEL_BYTES, lockBrowser, releasePage, tooBigForDevice } from "./guard";
import type { Device, Dtype, FromWorker, ToWorker } from "./protocol";

/** What a model is for and what it costs, per dtype in bytes (verified on the model cards, onnx-community / LiquidAI, 2026-11). */
export interface ModelInfo {
  /** Short name for a picker, e.g. "Qwen3 0.6B". */
  label: string;
  /** One sentence on when to pick it. */
  brief: string;
  /** Weights + tokenizer, in bytes, per dtype. */
  q4f16: number;
  q4: number;
}

/** The models this provider knows the size and character of. Any transformers.js text-generation model id also works. */
export const MODELS = {
  // LiquidAI (2026-11): q4f16 760 MB in one data file, q4 850 MB; + ~3.5 MB graph and tokenizer
  "LiquidAI/LFM2.5-1.2B-Instruct-ONNX": {
    label: "LFM2.5 1.2B",
    brief: "Strong tool calling in a mid-size model. Needs 8 GB of memory.",
    q4f16: 763_800_000,
    q4: 853_600_000,
  },
  "onnx-community/Qwen3-1.7B-ONNX": {
    label: "Qwen3 1.7B",
    brief: "Better reasoning on longer requests. Needs 8 GB of memory and WebGPU.",
    q4f16: 1_440_000_000,
    q4: 2_160_000_000,
  },
  "onnx-community/Qwen3-0.6B-ONNX": {
    label: "Qwen3 0.6B",
    brief: "Fastest. Good at short tool calls. The default.",
    q4f16: 585_000_000,
    q4: 934_000_000,
  },
} as const satisfies Record<string, ModelInfo>;

/** The default on any device: small enough for most machines, with tool calling that works. */
export const DEFAULT_MODEL = "onnx-community/Qwen3-0.6B-ONNX";
/** @deprecated Same as `DEFAULT_MODEL`: one default on every device since the 1.7B model proved too large for many. */
export const DEFAULT_GPU_MODEL = DEFAULT_MODEL;
/** @deprecated Same as `DEFAULT_MODEL`. */
export const DEFAULT_CPU_MODEL = DEFAULT_MODEL;

/** Options for `createTransformersProvider`. */
export interface TransformersProviderOptions {
  /** The model to start with: a transformers.js text-generation model id. Default `DEFAULT_MODEL` (Qwen3 0.6B). */
  model?: string;
  /**
   * The models the person may pick from in the chat (shown with each one's brief and size). Default: just `model`.
   * The last choice is remembered per browser (localStorage `web-agents:local-model:choice`).
   */
  models?: readonly string[];
  /** Default: q4f16 on WebGPU with f16 shaders, q4 otherwise. */
  dtype?: Dtype;
  /**
   * The model worker. Default: the package's own (`new Worker(new URL("./worker.js", import.meta.url))`). Pass one when
   * your bundler can't follow that, e.g. `new (await import("@webmcp-agents/local-agent/worker?worker")).default()`.
   */
  worker?: Worker | (() => Worker);
  /**
   * Most prompt tokens per generation (estimated). Default 3072 for models up to 650 MB (Qwen3 0.6B), 1536 above
   * (LFM2.5 1.2B). The loop offers fewer tools and less history to stay under it: on WebGPU the whole prompt is read in
   * one GPU pass, and a long one on a large model can stall the display.
   */
  maxInputTokens?: number;
}

const CHOICE_KEY = "web-agents:local-model:choice";
/** How long a cache check may take before the model counts as not cached (it must never hold the chat's status). */
export const CACHE_CHECK_MS = 4000;
const OUT_OF_MEMORY = "this device doesn't have enough memory for the model. Try the cloud assistant, or a smaller model.";
/** Switching models mid-reply would tear down the worker under the running generation. */
export const BUSY = "Error [busy]: Wait for the current reply to finish before switching models.";

/** localStorage that never throws (blocked storage, sandboxed frames, quota): it only remembers a choice. */
const choice = {
  get(): string | null {
    try {
      return localStorage.getItem(CHOICE_KEY);
    } catch {
      return null;
    }
  },
  set(model: string): void {
    try {
      localStorage.setItem(CHOICE_KEY, model);
    } catch {
      // the model still switched; next visit just starts from the default
    }
  },
};

/** Omit over each member of a union. */
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

/** WebGPU when there's an adapter; `f16` when it can run f16 shaders (q4f16 models need them). */
async function detectDevice(): Promise<{ device: Device; f16: boolean }> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: ReadonlySet<string> } | null> } }).gpu;
    const adapter = gpu ? await gpu.requestAdapter() : null;
    return adapter ? { device: "webgpu", f16: adapter.features.has("shader-f16") } : { device: "wasm", f16: false };
  } catch {
    return { device: "wasm", f16: false };
  }
}

const info = (m: string): ModelInfo | undefined => (MODELS as Record<string, ModelInfo>)[m];
/** A readable name for a model id the table doesn't know: the last path segment without the ONNX suffix. */
const labelOf = (m: string): string => info(m)?.label ?? (m.split("/").pop() ?? m).replace(/-ONNX$/i, "");

/** A provider that runs a small model with transformers.js in a Web Worker. */
export function createTransformersProvider(opts: TransformersProviderOptions = {}): LocalProvider {
  let detected: { device: Device; f16: boolean } | null = null;
  let worker: Worker | null = null;
  let nextId = 1;
  const pending = new Map<number, (m: FromWorker) => void>();

  // ---------- which model ----------
  const offered: readonly string[] = opts.models?.length ? opts.models : [opts.model ?? DEFAULT_MODEL];
  const remembered = choice.get();
  let selected: string =
    opts.model && offered.includes(opts.model) ? opts.model : remembered && offered.includes(remembered) ? remembered : offered[0]!;
  /** The last cache check per model: `models()` is synchronous. */
  const cachedAt = new Map<string, boolean>();

  let chosenDtype: Dtype | null = null;
  const setup = async () => {
    detected ??= await detectDevice();
    const { device, f16 } = detected;
    // without shader-f16 an f16 model fails at its first token ("requires f16 but the device does not support it")
    const dtype: Dtype = opts.dtype ?? (device === "webgpu" && f16 ? "q4f16" : "q4");
    chosenDtype = dtype;
    return { device, model: selected, dtype };
  };

  const spawn = (): Worker => {
    if (worker) return worker;
    const w =
      typeof opts.worker === "function"
        ? opts.worker()
        : (opts.worker ?? new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "web-agents-local-model" }));
    w.addEventListener("message", (e: MessageEvent<FromWorker>) => pending.get(e.data.id)?.(e.data));
    w.addEventListener("error", (e) => {
      const handles = [...pending.values()];
      terminate(); // a crashed worker still holds the page's slot and the browser lock
      for (const handle of handles) handle({ id: -1, type: "error", error: e.message || "The model worker crashed." });
    });
    worker = w;
    return w;
  };

  const send = (msg: WithoutId<ToWorker>, onMessage: (m: FromWorker) => void): number => {
    const id = nextId++;
    pending.set(id, onMessage);
    spawn().postMessage({ ...msg, id } as ToWorker);
    return id;
  };

  /**
   * Ask the worker whether the model's files are all in transformers' cache. Any failure, or no answer within
   * `CACHE_CHECK_MS` (the check may consult the network for an uncached model), counts as "not cached".
   */
  const isCached = (model: string, dtype: Dtype, device: Device): Promise<boolean> =>
    new Promise((resolve) => {
      let done = false;
      const settle = (value: boolean): void => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        pending.delete(id);
        cachedAt.set(model, value);
        resolve(value);
      };
      const timer = setTimeout(() => settle(false), CACHE_CHECK_MS);
      const id = send({ type: "cached?", model, dtype, device }, (m) => settle(m.type === "cached" ? m.value : false));
    });

  let loaded = false;
  let everLoaded = false;
  let busy = false;
  let unlock: (() => void) | null = null;
  const self = {};
  const terminate = (): void => {
    worker?.terminate();
    worker = null;
    pending.clear();
    loaded = false;
    unlock?.();
    unlock = null;
    releasePage(self);
  };
  // A page kept in the back/forward cache would keep its model in GPU memory: free it; it reloads from cache on return.
  if (typeof addEventListener === "function") addEventListener("pagehide", () => worker && terminate());
  const sizeOf = (m: string, dtype: Dtype): number | undefined => info(m)?.[dtype];
  const inputBudget = (): number => {
    const bytes = chosenDtype ? (sizeOf(selected, chosenDtype) ?? 0) : 0;
    return opts.maxInputTokens ?? (bytes > LARGE_MODEL_BYTES ? 1536 : 3072);
  };

  return {
    id: "transformers",
    label: "On-device",
    // Liquid's LFM2 models write pythonic calls
    get callFormat() {
      return /\bLFM2/i.test(selected) ? "pythonic" : "tags";
    },

    async availability(): Promise<ProviderAvailability> {
      if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") {
        return { state: "unavailable", reason: "This browser can't run models (no Web Workers or WebAssembly)." };
      }
      if (loaded) return { state: "available" };
      const { device, model, dtype } = await setup();
      const tooBig = tooBigForDevice(sizeOf(model, dtype));
      if (tooBig) return { state: "unavailable", reason: tooBig };
      // the picker shows "on this device" per model, so check every offered one (cheap: cache lookups, no download)
      await Promise.all(offered.map((m) => isCached(m, dtype, device)));
      return {
        state: "needs-download",
        bytes: sizeOf(model, dtype),
        cached: cachedAt.get(model) ?? false,
        note: device === "wasm" ? "No WebGPU here: a smaller, slower model runs on the CPU." : undefined,
      };
    },

    async prepare(onProgress, signal) {
      if (loaded) return;
      const { device, model, dtype } = await setup();
      const tooBig = tooBigForDevice(sizeOf(model, dtype));
      if (tooBig) throw new Error(tooBig);
      if (signal?.aborted) throw new DOMException("Download cancelled", "AbortError");
      // one model per page (stops another provider's), then one per browser (another tab keeps it: refuse)
      claimPage(self, terminate);
      if (!unlock) {
        try {
          unlock = await lockBrowser();
        } catch (err) {
          releasePage(self);
          throw err;
        }
      }
      await new Promise<void>((resolve, reject) => {
        const onAbort = (): void => {
          terminate(); // stops the download; a partial cache entry is re-fetched next time
          reject(new DOMException("Download cancelled", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        const bytes = sizeOf(model, dtype);
        const id = send({ type: "init", model, dtype, device, bytes }, (m) => {
          if (m.type === "progress") onProgress(m.progress);
          else if (m.type === "ready") {
            pending.delete(id);
            signal?.removeEventListener("abort", onAbort);
            loaded = true;
            everLoaded = true;
            cachedAt.set(model, true);
            void navigator.storage?.persist?.(); // keep the model when the browser clears storage
            resolve();
          } else if (m.type === "error") {
            pending.delete(id);
            signal?.removeEventListener("abort", onAbort);
            terminate();
            reject(new Error(/bad_alloc|out of memory|Aborted\(/i.test(m.error) ? OUT_OF_MEMORY : m.error));
          }
        });
      });
    },

    async generate(req: GenerateRequest): Promise<GenerateResult> {
      // freed on pagehide (back/forward cache): the person already chose it, and it reloads from the browser cache
      if (!loaded && everLoaded) await this.prepare(() => {}, req.signal);
      if (!loaded) throw new Error("The model isn't loaded yet: download it first.");
      const { signal, onToken, ...rest } = req;
      busy = true;
      try {
        return await new Promise((resolve, reject) => {
          const id = send({ type: "generate", req: rest }, (m) => {
            if (m.type === "token") onToken?.(m.delta);
            else if (m.type === "done" || m.type === "error") {
              pending.delete(id);
              signal.removeEventListener("abort", onAbort);
              if (m.type === "done") resolve(m.result);
              else reject(m.name === "AbortError" ? new DOMException(m.error, "AbortError") : new Error(m.error));
            }
          });
          function onAbort(): void {
            worker?.postMessage({ id, type: "abort" } satisfies ToWorker);
          }
          signal.addEventListener("abort", onAbort, { once: true });
        });
      } finally {
        busy = false;
      }
    },

    async fits({ system, messages, tools }) {
      const text = system + messages.map((m) => m.content).join("\n") + JSON.stringify(tools);
      return estimateTokens(text) <= inputBudget();
    },

    models(): readonly ModelChoice[] {
      const dtype = chosenDtype ?? "q4f16";
      return offered.map((id) => ({
        id,
        label: labelOf(id),
        brief: info(id)?.brief ?? "A transformers.js model.",
        bytes: sizeOf(id, dtype),
        cached: cachedAt.get(id),
        recommended: id === DEFAULT_MODEL,
        selected: id === selected,
      }));
    },

    async selectModel(id) {
      if (!offered.includes(id)) throw new Error(`Unknown model "${id}": offer it in createLocalAdapter({ models }) first.`);
      if (busy) throw new Error(BUSY);
      if (id === selected) return;
      terminate(); // frees the old model (GPU memory) before the new one is even checked
      everLoaded = false;
      selected = id;
      choice.set(id);
    },

    dispose() {
      terminate();
    },
  };
}
