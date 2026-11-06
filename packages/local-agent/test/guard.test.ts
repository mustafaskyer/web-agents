import { afterEach, describe, expect, it, vi } from "vitest";
import { claimPage, estimateTokens, IN_ANOTHER_TAB, lockBrowser, releasePage, tooBigForDevice } from "../src/providers/transformers/guard";

afterEach(() => vi.unstubAllGlobals());

describe("model guards", () => {
  it("keeps one model per page: a new owner stops the previous one, the same owner doesn't", () => {
    const a = {};
    const b = {};
    const stopA = vi.fn();
    const stopB = vi.fn();
    claimPage(a, stopA);
    claimPage(a, stopA);
    expect(stopA).not.toHaveBeenCalled();
    claimPage(b, stopB); // e.g. the copy a hot reload left behind
    expect(stopA).toHaveBeenCalledOnce();
    releasePage(a); // not a's slot any more: no effect
    claimPage(a, stopA);
    expect(stopB).toHaveBeenCalledOnce();
    releasePage(a);
  });

  it("holds one browser-wide lock: a second tab is refused until the first lets go", async () => {
    // the Web Locks semantics this relies on: exclusive, queued, given up when the signal aborts
    let holder: Promise<void> | null = null;
    const locks = {
      request(_name: string, { signal }: { signal?: AbortSignal }, callback: (lock: unknown) => Promise<void>) {
        if (!holder) {
          holder = callback({}).finally(() => (holder = null));
          return holder;
        }
        return new Promise<void>((_, reject) => signal?.addEventListener("abort", () => reject(signal.reason)));
      },
    };
    vi.stubGlobal("navigator", { locks });
    const release = await lockBrowser(50);
    await expect(lockBrowser(50)).rejects.toThrow(IN_ANOTHER_TAB);
    release();
    await Promise.resolve();
    const again = await lockBrowser(50);
    again();
  });

  it("works without Web Locks", async () => {
    vi.stubGlobal("navigator", {});
    const release = await lockBrowser();
    expect(release).toBeTypeOf("function");
  });

  it("refuses a large model only when the device reports little memory", () => {
    vi.stubGlobal("navigator", { deviceMemory: 4 });
    expect(tooBigForDevice(763_800_000)).toMatch(/needs more memory than this device has \(4 GB reported\)/);
    expect(tooBigForDevice(585_000_000)).toBeNull();
    vi.stubGlobal("navigator", { deviceMemory: 8 });
    expect(tooBigForDevice(763_800_000)).toBeNull();
    vi.stubGlobal("navigator", {});
    expect(tooBigForDevice(763_800_000)).toBeNull();
  });

  it("estimates tokens at ~3.5 characters each", () => {
    expect(estimateTokens("x".repeat(35))).toBe(10);
  });
});
