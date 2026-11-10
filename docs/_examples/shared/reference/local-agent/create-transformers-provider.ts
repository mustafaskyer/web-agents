import {
  createLocalAdapter,
  createPromptApiProvider,
  createTransformersProvider,
  DEFAULT_MODEL,
} from "@webmcp-agents/local-agent";

export const local = createLocalAdapter({
  providers: [
    createPromptApiProvider(),
    createTransformersProvider({
      // The picker offers both; the default is marked recommended.
      models: [DEFAULT_MODEL, "LiquidAI/LFM2.5-1.2B-Instruct-ONNX"],
      // Trained for tool calling: a smaller prompt keeps it fast.
      maxInputTokens: 1536,
    }),
  ],
});
