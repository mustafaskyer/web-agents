/**
 * Any frontier model from one string: `"<provider>/<model>"`, e.g. `anthropic/claude-opus-5-5`, `openai/gpt-5.5`,
 * `deepseek/deepseek-v4`, `openrouter/anthropic/claude-opus-5.5`. The provider's own AI SDK package is used when its
 * key is set (the package is an optional peer, loaded only then); otherwise the AI Gateway built into `ai` takes
 * any `a/b` id with `AI_GATEWAY_API_KEY`. A bare `claude-…` id still means Anthropic.
 *
 * Gateway ids use dots (`anthropic/claude-opus-5.5`), provider SDK ids use dashes (`claude-opus-5-5`): an id is never
 * rerouted from one catalog to the other behind the user's back.
 */
import { createGateway, type JSONValue, type LanguageModel, type ToolLoopAgentSettings } from "ai";
import { displayName } from "../shared";

export { displayName };

/** How hard the model thinks per step, in provider-neutral terms. */
export type ReasoningLevel = "off" | "low" | "medium" | "high";

type Env = Record<string, string | undefined>;
/** `providerOptions` as the AI SDK takes them: `{ [provider]: { … } }`. */
export type ProviderOptions = NonNullable<ToolLoopAgentSettings["providerOptions"]>;

/** A provider the resolver knows: its npm package, its env var, and how its reasoning option is spelled. */
export interface ProviderSpec {
  id: string;
  /** The optional peer package that implements it. */
  pkg: string;
  envKey: string;
  label: string;
  /** Load the package and build a `(modelId) => LanguageModel` factory with the key. */
  load(apiKey: string): Promise<(modelId: string) => LanguageModel>;
  /** The `providerOptions` entry for a reasoning level (undefined: the provider has none). */
  reasoning(level: ReasoningLevel): Record<string, JSONValue> | undefined;
}

// Option names checked against the installed SDKs on 2026-11-08 (@ai-sdk/openai 4.0, google 4.0, xai 5.0, deepseek 3.0,
// mistral 4.0, @openrouter/ai-sdk-provider 3.1). Literal import specifiers: bundlers and Vercel's tracer follow them.
export const PROVIDERS: Record<string, ProviderSpec> = {
  anthropic: {
    id: "anthropic",
    pkg: "@ai-sdk/anthropic",
    envKey: "ANTHROPIC_API_KEY",
    label: "Claude",
    load: async (apiKey) => (await import("@ai-sdk/anthropic")).createAnthropic({ apiKey }),
    // Claude Opus 5.5 always thinks; effort sets how much. "default" fallbacks re-run a declined request on another model.
    reasoning: (level) => ({ effort: level === "off" ? "low" : level, fallbacks: "default" }),
  },
  openai: {
    id: "openai",
    pkg: "@ai-sdk/openai",
    envKey: "OPENAI_API_KEY",
    label: "OpenAI",
    load: async (apiKey) => (await import("@ai-sdk/openai")).createOpenAI({ apiKey }),
    reasoning: (level) => ({ reasoningEffort: level === "off" ? "minimal" : level, reasoningSummary: "auto" }),
  },
  google: {
    id: "google",
    pkg: "@ai-sdk/google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    label: "Gemini",
    load: async (apiKey) => (await import("@ai-sdk/google")).createGoogleGenerativeAI({ apiKey }),
    reasoning: (level) => ({ thinkingConfig: { thinkingLevel: level === "off" ? "minimal" : level, includeThoughts: true } }),
  },
  deepseek: {
    id: "deepseek",
    pkg: "@ai-sdk/deepseek",
    envKey: "DEEPSEEK_API_KEY",
    label: "DeepSeek",
    load: async (apiKey) => (await import("@ai-sdk/deepseek")).createDeepSeek({ apiKey }),
    reasoning: (level) => (level === "off" || level === "medium" ? undefined : { reasoningEffort: level }),
  },
  xai: {
    id: "xai",
    pkg: "@ai-sdk/xai",
    envKey: "XAI_API_KEY",
    label: "Grok",
    load: async (apiKey) => (await import("@ai-sdk/xai")).createXai({ apiKey }),
    reasoning: (level) => ({ reasoningEffort: level === "off" ? "none" : level, reasoningSummary: "auto" }),
  },
  mistral: {
    id: "mistral",
    pkg: "@ai-sdk/mistral",
    envKey: "MISTRAL_API_KEY",
    label: "Mistral",
    load: async (apiKey) => (await import("@ai-sdk/mistral")).createMistral({ apiKey }),
    reasoning: (level) => ({ reasoningEffort: level === "off" ? "none" : level }),
  },
  openrouter: {
    id: "openrouter",
    pkg: "@openrouter/ai-sdk-provider",
    envKey: "OPENROUTER_API_KEY",
    label: "OpenRouter",
    load: async (apiKey) => (await import("@openrouter/ai-sdk-provider")).createOpenRouter({ apiKey }),
    reasoning: (level) => (level === "off" ? undefined : { reasoning: { effort: level } }),
  },
};

/** The gateway's key; Vercel also signs functions in with an OIDC token. */
const GATEWAY_KEYS = ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN"] as const;
const gatewayKey = (env: Env): string | undefined => GATEWAY_KEYS.map((k) => env[k]).find(Boolean);

/** A model id, taken apart. */
export interface ParsedModelId {
  /** The provider's id, `"gateway"` for an unknown prefix, or `"anthropic"` for a bare Claude id. */
  provider: string;
  /** What the provider receives (`openrouter/anthropic/claude-opus-5.5` → `anthropic/claude-opus-5.5`). */
  model: string;
  /** The id as given. */
  id: string;
}

/** Split `"<provider>/<model>"` at the first slash; a bare id is Anthropic's (the historical default). */
export function parseModelId(id: string): ParsedModelId {
  const slash = id.indexOf("/");
  if (slash === -1) return { provider: "anthropic", model: id, id };
  const prefix = id.slice(0, slash);
  const rest = id.slice(slash + 1);
  if (!rest) throw new TypeError(`Model id "${id}" has no model after the provider prefix.`);
  return { provider: prefix in PROVIDERS ? prefix : "gateway", model: prefix in PROVIDERS ? rest : id, id };
}

/** Why a model can't run (sync, no SDK loaded): which env var(s) would make it work. */
export interface ModelAvailability {
  enabled: boolean;
  provider: string;
  /** The env vars that would enable it (any one of them). Empty when enabled. */
  missingEnv: string[];
  /** For the 503 and the server log: names the variable(s) to set. Empty when enabled. */
  message: string;
  /** True when the gateway will serve this id (no provider key, a gateway key, a slash id). */
  viaGateway: boolean;
}

/** Whether `id` can run with `env`, and what to set when it can't. Never imports an SDK. */
export function modelAvailability(id: string, env: Env): ModelAvailability {
  const { provider, model } = parseModelId(id);
  const spec = PROVIDERS[provider];
  const gateway = gatewayKey(env);
  if (spec && env[spec.envKey]) return { enabled: true, provider, missingEnv: [], message: "", viaGateway: false };
  // the gateway takes any "a/b" id, except OpenRouter's (its own catalog) and bare ids (a dash-vs-dot mismatch)
  const gatewayOk = id.includes("/") && provider !== "openrouter";
  if (gateway && (gatewayOk || !spec))
    return { enabled: true, provider: spec ? provider : "gateway", missingEnv: [], message: "", viaGateway: true };
  const missing = spec ? [spec.envKey, ...(gatewayOk ? [GATEWAY_KEYS[0]] : [])] : [GATEWAY_KEYS[0]];
  const alt =
    spec && provider !== "openrouter" && env.OPENROUTER_API_KEY && !id.includes("/")
      ? ` (or use openrouter/${provider}/${model.replace(/-(\d)-(\d)$/, "-$1.$2")} with your OPENROUTER_API_KEY)`
      : "";
  const message = spec
    ? `Set ${missing.join(" or ")} on the server to use ${id}${alt}.`
    : `Set AI_GATEWAY_API_KEY on the server to use ${id} through the AI Gateway, or pick a provider: ${Object.keys(PROVIDERS).join(", ")}.`;
  return { enabled: false, provider: spec ? provider : "gateway", missingEnv: missing, message, viaGateway: false };
}

/** A model that can't be built: the handler answers 503 with `message`. */
export class ModelUnavailableError extends Error {
  override name = "ModelUnavailableError";
  constructor(
    message: string,
    readonly code: "missing_env" | "missing_package" | "unknown_provider",
  ) {
    super(message);
  }
}

const isModuleNotFound = (err: unknown, depth = 0): boolean => {
  if (!err || depth > 3) return false;
  const e = err as { code?: string; message?: string; cause?: unknown };
  if (e.code === "ERR_MODULE_NOT_FOUND" || e.code === "MODULE_NOT_FOUND") return true;
  if (/Cannot find (module|package)|Failed to (resolve|fetch dynamically imported) module/i.test(String(e.message ?? err))) return true;
  return isModuleNotFound(e.cause, depth + 1); // bundlers and test runners wrap the loader's error
};

/** Factories per provider, built once per key (one module load, one client). */
const factories = new Map<string, Promise<(modelId: string) => LanguageModel>>();

/**
 * A `LanguageModel` for `id`: the provider's package with its key, else the AI Gateway. Rejects with
 * `ModelUnavailableError` when the key is missing or the package isn't installed.
 */
export async function resolveModel(id: string, env: Env): Promise<{ model: LanguageModel; provider: string }> {
  const availability = modelAvailability(id, env);
  if (!availability.enabled)
    throw new ModelUnavailableError(availability.message, availability.provider === "gateway" ? "unknown_provider" : "missing_env");
  const { provider, model } = parseModelId(id);
  if (availability.viaGateway) {
    const key = gatewayKey(env)!;
    let factory = factories.get(`gateway:${key}`);
    if (!factory) {
      factory = Promise.resolve((modelId: string) => createGateway({ apiKey: env.AI_GATEWAY_API_KEY })(modelId));
      factories.set(`gateway:${key}`, factory);
    }
    return { model: (await factory)(id), provider: availability.provider };
  }
  const spec = PROVIDERS[provider]!;
  const apiKey = env[spec.envKey]!;
  let factory = factories.get(`${provider}:${apiKey}`);
  if (!factory) {
    factory = spec.load(apiKey).catch((err: unknown) => {
      factories.delete(`${provider}:${apiKey}`);
      if (isModuleNotFound(err)) {
        throw new ModelUnavailableError(`Install ${spec.pkg} on the server to use ${id} (pnpm add ${spec.pkg}).`, "missing_package");
      }
      throw err;
    });
    factories.set(`${provider}:${apiKey}`, factory);
  }
  return { model: (await factory)(model), provider };
}

/**
 * The `providerOptions` for a reasoning level: the provider's own spelling, keyed by its id. Through the gateway the
 * upstream provider's object is passed as is, keyed by the id's prefix.
 */
export function providerOptionsFor(provider: string, level: ReasoningLevel, id?: string): ProviderOptions | undefined {
  const target = provider === "gateway" && id ? id.slice(0, id.indexOf("/")) : provider;
  const spec = PROVIDERS[target];
  const options = spec?.reasoning(level);
  return options ? { [target]: options } : undefined;
}

/** Test seam: forget loaded providers (a changed mock, a changed key). */
export const _resetModelCache = (): void => factories.clear();
