/** Messages between the main thread and the transformers.js worker. Every request carries an id its replies echo. */
import type { GenerateRequest, GenerateResult } from "../../types";

export type Device = "webgpu" | "wasm";
export type Dtype = "q4f16" | "q4";

/** Main thread → worker. */
export type ToWorker =
  /** `bytes`: the model's known size, so per-file progress isn't read as done before every file has started. */
  | { id: number; type: "init"; model: string; dtype: Dtype; device: Device; bytes?: number }
  | { id: number; type: "generate"; req: Omit<GenerateRequest, "signal" | "onToken"> }
  | { id: number; type: "abort" };

/** Worker → main thread. */
export type FromWorker =
  | { id: number; type: "progress"; progress: number }
  | { id: number; type: "ready"; device: Device }
  | { id: number; type: "token"; delta: string }
  | { id: number; type: "done"; result: GenerateResult }
  | { id: number; type: "error"; error: string; name?: string };
