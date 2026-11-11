import {
  createLocalAdapter,
  createPromptApiProvider,
} from "@webmcp-agents/local-agent";

// Chrome's built-in model only, with no download fallback.
export const chromeOnly = createLocalAdapter({
  providers: [createPromptApiProvider()],
  label: "Chrome AI",
});
