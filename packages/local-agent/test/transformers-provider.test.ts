import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FromWorker, ToWorker } from "../src/providers/transformers/protocol";
import { BUSY, CACHE_CHECK_MS, createTransformersProvider, DEFAULT_MODEL } from "../src/providers/transformers/provider";

/** A fake model worker: answers cache checks from `cached`, loads with two progress ticks, generates one word. */
class FakeWorker {
  static instances: FakeWorker[] = [];
  static cached = new Set<string>();
  listeners: Array<(e: { data: FromWorker }) => void> = [];
  sent: ToWorker[] = [];
  terminated = false;
  constructor() {
    FakeWorker.instances.push(this);
  }
  addEventListener(type: string, l: (e: { data: FromWorker }) => void): void {
    if (type === "message") this.listeners.push(l);
  }
  postMessage(msg: ToWorker): void {
    this.sent.push(msg);
    const reply = (data: FromWorker) =>
      queueMicrotask(() => {
        for (const l of this.listeners) l({ data });
      });
    if (msg.type === "cached?") reply({ id: msg.id, type: "cached", value: FakeWorker.cached.has(`${msg.model}@${msg.dtype}`) });
    else if (msg.type === "init") {
      reply({ id: msg.id, type: "progress", progress: 0.5 });
      reply({ id: msg.id, type: "progress", progress: 1 });
      reply({ id: msg.id, type: "ready", device: msg.device });
    } else if (msg.type === "generate") {
      reply({ id: msg.id, type: "token", delta: "ok" });
      reply({ id: msg.id, type: "done", result: { text: "ok" } });
    }
  }
  terminate(): void {
    this.terminated = true;
  }
}

const storage = new Map<string, string>();
const BIG = "onnx-community/Qwen3-1.7B-ONNX";

beforeEach(() => {
  FakeWorker.instances = [];
  FakeWorker.cached.clear();
  storage.clear();
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("localStorage", { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) });
  // no WebGPU in Node: the provider picks WASM + q4
  vi.stubGlobal("navigator", {});
});
afterEach(() => vi.unstubAllGlobals());

describe("createTransformersProvider", () => {
  it("asks transformers.js whether the files are cached, per dtype, instead of trusting a hint", async () => {
    FakeWorker.cached.add(`${DEFAULT_MODEL}@q4f16`); // cached for another dtype only
    const provider = createTransformersProvider();
    expect(await provider.availability()).toMatchObject({ state: "needs-download", cached: false, bytes: 934_000_000 });
    FakeWorker.cached.add(`${DEFAULT_MODEL}@q4`);
    expect(await provider.availability()).toMatchObject({ state: "needs-download", cached: true });
    expect(FakeWorker.instances[0]!.sent.filter((m) => m.type === "cached?")).toHaveLength(2);
  });

  it("lists the offered models with label, brief, size and cache state, the default marked", async () => {
    FakeWorker.cached.add(`${BIG}@q4`);
    const provider = createTransformersProvider({ models: [DEFAULT_MODEL, BIG, "acme/Tiny-ONNX"] });
    await provider.availability();
    expect(provider.models!()).toEqual([
      {
        id: DEFAULT_MODEL,
        label: "Qwen3 0.6B",
        brief: expect.stringContaining("Fastest"),
        bytes: 934_000_000,
        cached: false,
        recommended: true,
        selected: true,
      },
      {
        id: BIG,
        label: "Qwen3 1.7B",
        brief: expect.stringContaining("reasoning"),
        bytes: 2_160_000_000,
        cached: true,
        recommended: false,
        selected: false,
      },
      {
        id: "acme/Tiny-ONNX",
        label: "Tiny",
        brief: "A transformers.js model.",
        bytes: undefined,
        cached: false,
        recommended: false,
        selected: false,
      },
    ]);
  });

  it("switches models: frees the worker, remembers the choice, refuses unknown ids and mid-reply switches", async () => {
    const provider = createTransformersProvider({ models: [DEFAULT_MODEL, BIG] });
    await provider.prepare(() => {});
    const first = FakeWorker.instances[0]!;
    await expect(provider.selectModel!("nope")).rejects.toThrow(/Unknown model/);

    const slow = new Promise<void>((resolve) => {
      first.postMessage = (msg: ToWorker) => {
        first.sent.push(msg);
        if (msg.type !== "generate") return;
        setTimeout(() => {
          for (const l of first.listeners) l({ data: { id: msg.id, type: "done", result: { text: "late" } } });
          resolve();
        }, 10);
      };
    });
    const generating = provider.generate({ system: "s", messages: [], tools: [], signal: new AbortController().signal });
    await expect(provider.selectModel!(BIG)).rejects.toThrow(BUSY);
    await slow;
    await generating;

    await provider.selectModel!(BIG);
    expect(first.terminated).toBe(true);
    expect(storage.get("web-agents:local-model:choice")).toBe(BIG);
    expect(provider.models!().find((m) => m.selected)?.id).toBe(BIG);
    expect(provider.callFormat).toBe("tags");

    // a new provider on the next visit starts from the remembered choice (when it is offered)
    expect(createTransformersProvider({ models: [DEFAULT_MODEL, BIG] }).models!().find((m) => m.selected)?.id).toBe(BIG);
    expect(createTransformersProvider({ models: [DEFAULT_MODEL] }).models!().find((m) => m.selected)?.id).toBe(DEFAULT_MODEL);
  });

  it("a cache check that never answers counts as not cached after a timeout", async () => {
    vi.useFakeTimers();
    try {
      const silent = class extends FakeWorker {
        override postMessage(msg: ToWorker): void {
          this.sent.push(msg); // never replies
        }
      };
      vi.stubGlobal("Worker", silent);
      const provider = createTransformersProvider();
      const availability = provider.availability();
      await vi.advanceTimersByTimeAsync(CACHE_CHECK_MS + 10);
      expect(await availability).toMatchObject({ state: "needs-download", cached: false });
    } finally {
      vi.useRealTimers();
    }
  });
});
