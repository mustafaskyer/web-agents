/**
 * Guards that keep a model from taking the machine down with it. A model on WebGPU holds hundreds of MB of GPU memory
 * (shared with the whole system on Apple silicon), and two copies, or one model too big for the device, can stall the
 * display until the computer is restarted. So: one model per page, one per browser, and none that the device can't
 * hold.
 */

const SLOT = Symbol.for("web-agents.local-model");
const LOCK = "web-agents:local-model";

interface Slot {
  owner: object;
  stop(): void;
}

/**
 * Make `owner` the page's only model: a model another provider loaded on this page (a second adapter, or the old copy
 * after a hot reload) is stopped first.
 */
export function claimPage(owner: object, stop: () => void): void {
  const g = globalThis as { [SLOT]?: Slot };
  const previous = g[SLOT];
  if (previous && previous.owner !== owner) previous.stop();
  g[SLOT] = { owner, stop };
}

/** Give the page's slot back (the model was freed). */
export function releasePage(owner: object): void {
  const g = globalThis as { [SLOT]?: Slot };
  if (g[SLOT]?.owner === owner) delete g[SLOT];
}

interface LockManagerLike {
  request(name: string, options: { signal?: AbortSignal }, callback: (lock: unknown) => Promise<void>): Promise<void>;
}

/**
 * Hold the browser-wide model lock (Web Locks, shared by every tab of this origin) until the returned function is
 * called. Rejects when another tab keeps it past `waitMs`. Browsers without Web Locks get a no-op lock.
 */
export function lockBrowser(waitMs = 1500): Promise<() => void> {
  const locks = (globalThis.navigator as { locks?: LockManagerLike } | undefined)?.locks;
  if (!locks) return Promise.resolve(() => {});
  return new Promise((resolve, reject) => {
    locks
      .request(LOCK, { signal: AbortSignal.timeout(waitMs) }, () => new Promise<void>((release) => resolve(release)))
      .catch(() => reject(new Error(IN_ANOTHER_TAB)));
  });
}

export const IN_ANOTHER_TAB =
  "The on-device model is already running in another tab. Close that tab (or its assistant) to run it here: two copies can freeze the computer.";

/** Models above this size (bytes) need a device that reports at least `MIN_DEVICE_GB` of memory. */
export const LARGE_MODEL_BYTES = 650_000_000;
const MIN_DEVICE_GB = 8;

/**
 * Why this device shouldn't load a model of `bytes`, or null. `navigator.deviceMemory` (Chromium; rounded, at most 8)
 * is the only signal a page gets; without it, nothing is refused.
 */
export function tooBigForDevice(bytes: number | undefined): string | null {
  const gb = (globalThis.navigator as { deviceMemory?: number } | undefined)?.deviceMemory;
  if (!bytes || bytes < LARGE_MODEL_BYTES || gb === undefined || gb >= MIN_DEVICE_GB) return null;
  return `This model needs more memory than this device has (${gb} GB reported). Use the default on-device model, or the cloud assistant.`;
}

/** Rough tokens in a prompt (~3.5 characters per token for English and JSON), for the input budget. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 3.5);
