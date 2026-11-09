/**
 * The model, inside the worker: load a text-generation pipeline (progress
 * reported as one 0–1 number), then generate with the chat template's native
 * tools, thinking off, greedy decoding, tokens streamed. Pure apart from the
 * injected pipeline factory, so it's tested without a model.
 */
import type { Device, Dtype } from "./protocol";
import type { GenerateRequest, GenerateResult } from "../../types";

/** The slice of a transformers.js text-generation pipeline the engine uses. */
export interface TextGenerator {
  tokenizer: unknown;
  // biome-ignore lint/suspicious/noExplicitAny: the pipeline's chat output type is a deep union
  (messages: unknown, options: Record<string, unknown>): Promise<any>;
  dispose?(): Promise<void> | void;
}

/** What the engine needs from transformers.js; injectable for tests. */
export interface PipelineKit {
  createPipeline(model: string, options: { device: Device; dtype: Dtype; progress_callback(info: unknown): void }): Promise<TextGenerator>;
  createStreamer(tokenizer: unknown, onText: (text: string) => void): unknown;
  createStopper(): { interrupt(): void; reset(): void };
  /** Whether every file the pipeline needs is in the browser cache. Omitted: unknown, treated as not cached. */
  isPipelineCached?(model: string, options: { dtype: Dtype; device: Device }): Promise<boolean>;
}

const MAX_NEW_TOKENS = 384;

/**
 * One model in one worker. Generations run one at a time: a new request waits for an interrupted one to wind down,
 * so the next generation's reset can't revive it (both would share the ONNX session).
 */
export class TransformersEngine {
  #queue: Promise<unknown> = Promise.resolve();
  #generator: TextGenerator | null = null;
  #stopper: ReturnType<PipelineKit["createStopper"]> | null = null;
  #aborted = false;

  constructor(private readonly kit: () => Promise<PipelineKit>) {}

  /** Load the model; `onProgress` gets 0–1 across all its files. */
  async init(model: string, dtype: Dtype, device: Device, onProgress: (p: number) => void, expectedBytes = 0): Promise<void> {
    const kit = await this.kit();
    // Two sources, whichever is further along: transformers.js' running total (which can stall partway in 4.3) and
    // our own sum over the per-file progress events. Never moves backwards.
    const files = new Map<string, { loaded: number; total: number }>();
    let shown = 0;
    const report = (p: number): void => {
      if (p <= shown) return;
      shown = Math.min(1, p);
      onProgress(shown);
    };
    this.#generator = await kit.createPipeline(model, {
      device,
      dtype,
      progress_callback(info) {
        const i = info as { status?: string; file?: string; loaded?: number; total?: number };
        if (typeof i.loaded !== "number" || !i.total) return;
        if (i.status === "progress_total") report(i.loaded / i.total);
        else if (i.status === "progress" && i.file) {
          files.set(i.file, { loaded: i.loaded, total: i.total });
          let loaded = 0;
          let total = 0;
          for (const f of files.values()) {
            loaded += f.loaded;
            total += f.total;
          }
          // files start one by one: until all have, the known model size is the better denominator
          report(loaded / Math.max(total, expectedBytes));
        }
      },
    });
    this.#stopper = kit.createStopper();
  }

  generate(req: Omit<GenerateRequest, "signal" | "onToken">, onToken: (delta: string) => void): Promise<GenerateResult> {
    const run = this.#queue.then(() => this.#generate(req, onToken));
    this.#queue = run.catch(() => {});
    return run;
  }

  async #generate(req: Omit<GenerateRequest, "signal" | "onToken">, onToken: (delta: string) => void): Promise<GenerateResult> {
    const generator = this.#generator;
    if (!generator || !this.#stopper) throw new Error("The model isn't loaded: send init first.");
    const kit = await this.kit();
    this.#stopper.reset();
    this.#aborted = false;
    const tools = req.tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
    const output = await generator([{ role: "system", content: req.system }, ...req.messages], {
      tools: tools.length ? tools : null,
      max_new_tokens: MAX_NEW_TOKENS,
      do_sample: false,
      // Qwen3's template reads it: no <think> phase, a direct answer
      tokenizer_encode_kwargs: { enable_thinking: false },
      streamer: kit.createStreamer(generator.tokenizer, (text) => {
        if (!this.#aborted) onToken(text);
      }),
      stopping_criteria: this.#stopper,
    });
    if (this.#aborted) throw new DOMException("Generation cancelled", "AbortError");
    const last = output?.[0]?.generated_text?.at?.(-1);
    return { text: typeof last?.content === "string" ? last.content : "" };
  }

  /** True when the model would load from the browser cache without a network download. Never throws. */
  async isCached(model: string, dtype: Dtype, device: Device): Promise<boolean> {
    try {
      const kit = await this.kit();
      return (await kit.isPipelineCached?.(model, { dtype, device })) ?? false;
    } catch {
      return false;
    }
  }

  /** Stop the running generation: it rejects with an AbortError and emits no more tokens. */
  abort(): void {
    this.#aborted = true;
    this.#stopper?.interrupt();
  }

  async dispose(): Promise<void> {
    await this.#generator?.dispose?.();
    this.#generator = null;
  }
}
