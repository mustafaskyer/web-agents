/** The worker's message router, apart from `self` so it can be tested in Node. */
import type { TransformersEngine } from "./engine";
import type { FromWorker, ToWorker } from "./protocol";

/** Handle one message from the main thread; replies go through `post`. */
export async function handleMessage(engine: TransformersEngine, msg: ToWorker, post: (m: FromWorker) => void): Promise<void> {
  const fail = (err: unknown): void =>
    post({ id: msg.id, type: "error", error: err instanceof Error ? err.message : String(err), name: (err as { name?: string })?.name });
  try {
    switch (msg.type) {
      case "init":
        await engine.init(msg.model, msg.dtype, msg.device, (progress) => post({ id: msg.id, type: "progress", progress }), msg.bytes);
        post({ id: msg.id, type: "ready", device: msg.device });
        return;
      case "generate": {
        const result = await engine.generate(msg.req, (delta) => post({ id: msg.id, type: "token", delta }));
        post({ id: msg.id, type: "done", result });
        return;
      }
      case "abort":
        engine.abort();
        return;
      default:
        post({ id: (msg as { id?: number }).id ?? -1, type: "error", error: `Unknown message type "${(msg as { type?: string }).type}"` });
    }
  } catch (err) {
    fail(err);
  }
}
