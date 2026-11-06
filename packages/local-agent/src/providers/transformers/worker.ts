/**
 * The transformers.js worker: the only place @huggingface/transformers (and
 * ONNX Runtime's WASM) is loaded, so a long generation never blocks the page's
 * main thread, and with it the agent cursor's animation.
 */
import { TransformersEngine } from "./engine";
import { handleMessage } from "./handle-message";
import type { FromWorker, ToWorker } from "./protocol";

const engine = new TransformersEngine(async () => {
  const { env, InterruptableStoppingCriteria, pipeline, TextStreamer } = await import("@huggingface/transformers");
  env.useBrowserCache = true; // the Cache API keeps the model across visits
  env.allowLocalModels = false;
  return {
    createPipeline: (model, options) => pipeline("text-generation", model, options) as never,
    createStreamer: (tokenizer, onText) =>
      new TextStreamer(tokenizer as never, { skip_prompt: true, skip_special_tokens: true, callback_function: onText }),
    createStopper: () => new InterruptableStoppingCriteria(),
  };
});

/** The worker's global scope, typed locally: the WebWorker lib would clash with the DOM lib in this program. */
const scope = self as unknown as {
  addEventListener(type: "message", listener: (e: MessageEvent<ToWorker>) => void): void;
  postMessage(message: FromWorker): void;
};
scope.addEventListener("message", (e) => {
  void handleMessage(engine, e.data, (m) => scope.postMessage(m));
});
