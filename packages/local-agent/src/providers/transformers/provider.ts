/**
 * transformers.js on the main thread: a LocalProvider that talks to the model
 * worker. The worker starts on prepare() (an explicit click), never on import.
 *
 * Default model: Qwen3 0.6B, q4f16 on WebGPU and q4 on WASM. The 1.7B model (1.4 GB in one ONNX file) failed to
 * create a session in testing (`std::bad_alloc`: out of WASM memory while loading), so it's opt-in via `model`.
 */
import type { GenerateRequest, GenerateResult, LocalProvider, ProviderAvailability } from "../../types";
import { claimPage, estimateTokens, lockBrowser, releasePage, tooBigForDevice } from "./guard";
import type { Device, Dtype, FromWorker, ToWorker } from "./protocol";

/** Verified on the model cards (onnx-community, 2026-11): weights + tokenizer, in bytes. */
export const MODELS = {
  // LiquidAI (2026-11): q4f16 760 MB in one data file, q4 850 MB; + ~3.5 MB graph and tokenizer
  "LiquidAI/LFM2.5-1.2B-Instruct-ONNX": { q4f16: 763_800_000, q4: 853_600_000 },
  "onnx-community/Qwen3-1.7B-ONNX": { q4f16: 1_440_000_000, q4: 2_160_000_000 },
  "onnx-community/Qwen3-0.6B-ONNX": { q4f16: 585_000_000, q4: 934_000_000 },
} as const;
/** With WebGPU. 1.7B is better at tool calls but needs more memory than many devices give a page (opt in via `model`). */
export const DEFAULT_GPU_MODEL = "onnx-community/Qwen3-0.6B-ONNX";
/** On the CPU (WASM). */
export const DEFAULT_CPU_MODEL = "onnx-community/Qwen3-0.6B-ONNX";

/** Options for `createTransformersProvider`. */
export interface TransformersProviderOptions {
  /** A transformers.js text-generation model id. Default: Qwen3 1.7B on WebGPU, 0.6B on WASM. */
  model?: string;
  /** Default: q4f16 on WebGPU with f16 shaders, q4 otherwise. */
  dtype?: Dtype;
  /**
   * The model worker. Default: the package's own (`new Worker(new URL("./worker.js", import.meta.url))`). Pass one when
   * your bundler can't follow that, e.g. `new (await import("@web-agents/local-agent/worker?worker")).default()`.
   */
  worker?: Worker | (() => Worker);
  /**
   * Most prompt tokens per generation (estimated). Default 1536. The loop offers fewer tools and less history to stay
   * under it: on WebGPU the whole prompt is read in one GPU pass, and a long one can stall the display.
   */
  maxInputTokens?: number;
}

const READY_KEY = "web-agents:local-model";
const OUT_OF_MEMORY = "this device doesn't have enough memory for the model. Try the cloud assistant, or a smaller model.";

/** localStorage that never throws (blocked storage, sandboxed frames, quota): it's only a hint. */
const hint = {
  get(): string | null {
    try {
      return localStorage.getItem(READY_KEY);
    } catch {
      return null;
    }
  },
  set(model: string): void {
    try {
      localStorage.setItem(READY_KEY, model);
    } catch {
      // the model still loaded; next visit just won't say it's cached
    }
  },
};

/**
 * Whether the model's files are still in transformers.js's browser cache: the hint alone could be stale (site data
 * cleared), and a "cached" model loads without asking.
 */
async function inBrowserCache(model: string): Promise<boolean> {
  try {
    const cache = await caches.open("transformers-cache");
    return (await cache.keys()).some((r) => r.url.includes(`/${model}/`) && /\.onnx_data|\.onnx$/.test(r.url));
  } catch {
    return false;
  }
}

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

/** A provider that runs a small model with transformers.js in a Web Worker. */
export function createTransformersProvider(opts: TransformersProviderOptions = {}): LocalProvider {
  let detected: { device: Device; f16: boolean } | null = null;
  let worker: Worker | null = null;
  let nextId = 1;
  const pending = new Map<number, (m: FromWorker) => void>();

  const choice = async () => {
    detected ??= await detectDevice();
    const { device, f16 } = detected;
    const chosen = opts.model ?? (device === "webgpu" ? DEFAULT_GPU_MODEL : DEFAULT_CPU_MODEL);
    // without shader-f16 an f16 model fails at its first token ("requires f16 but the device does not support it")
    const dtype: Dtype = opts.dtype ?? (device === "webgpu" && f16 ? "q4f16" : "q4");
    model = chosen;
    return { device, model: chosen, dtype };
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

  let loaded = false;
  let everLoaded = false;
  let model = opts.model;
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
  const maxInputTokens = opts.maxInputTokens ?? 1536;
  const sizeOf = (m: string, dtype: Dtype): number | undefined =>
    (MODELS[m as keyof typeof MODELS] as Record<Dtype, number> | undefined)?.[dtype];

  return {
    id: "transformers",
    label: "On-device",
    // Liquid's LFM2 models write pythonic calls; known once the device (and so the default model) is
    get callFormat() {
      return model && /\bLFM2/i.test(model) ? "pythonic" : "tags";
    },

    async availability(): Promise<ProviderAvailability> {
      if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") {
        return { state: "unavailable", reason: "This browser can't run models (no Web Workers or WebAssembly)." };
      }
      if (loaded) return { state: "available" };
      const { device, model, dtype } = await choice();
      const tooBig = tooBigForDevice(sizeOf(model, dtype));
      if (tooBig) return { state: "unavailable", reason: tooBig };
      return {
        state: "needs-download",
        bytes: sizeOf(model, dtype),
        cached: hint.get() === model && (await inBrowserCache(model)),
        // the browser caches the files: a returning visitor "downloads" from disk in seconds
        note:
          [
            device === "wasm" ? "No WebGPU here: a smaller, slower model runs on the CPU." : "",
            hint.get() === model ? "Already on this device: loads from the browser cache." : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined,
      };
    },

    async prepare(onProgress, signal) {
      if (loaded) return;
      const { device, model, dtype } = await choice();
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
            hint.set(model);
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
      return new Promise((resolve, reject) => {
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
    },

    async fits({ system, messages, tools }) {
      const text = system + messages.map((m) => m.content).join("\n") + JSON.stringify(tools);
      return estimateTokens(text) <= maxInputTokens;
    },

    dispose() {
      terminate();
    },
  };
}
