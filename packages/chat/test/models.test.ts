import { afterEach, describe, expect, it, vi } from "vitest";
import {
  _resetModelCache,
  displayName,
  modelAvailability,
  ModelUnavailableError,
  parseModelId,
  providerOptionsFor,
  resolveModel,
} from "../src/server/models";

afterEach(() => {
  vi.doUnmock("@ai-sdk/openai");
  vi.doUnmock("@openrouter/ai-sdk-provider");
  vi.resetModules();
  _resetModelCache();
});

describe("parseModelId", () => {
  it("splits at the first slash; a bare id is Anthropic's; an unknown prefix goes to the gateway", () => {
    expect(parseModelId("openai/gpt-5.5")).toEqual({ provider: "openai", model: "gpt-5.5", id: "openai/gpt-5.5" });
    expect(parseModelId("openrouter/anthropic/claude-opus-5.5")).toMatchObject({
      provider: "openrouter",
      model: "anthropic/claude-opus-5.5",
    });
    expect(parseModelId("claude-opus-5-5")).toMatchObject({ provider: "anthropic", model: "claude-opus-5-5" });
    expect(parseModelId("acme/zed-1")).toMatchObject({ provider: "gateway", model: "acme/zed-1" });
    expect(() => parseModelId("openai/")).toThrow(/no model/);
  });
});

describe("modelAvailability", () => {
  it("is enabled with the provider's key, names the key(s) otherwise", () => {
    expect(modelAvailability("openai/gpt-5.5", { OPENAI_API_KEY: "k" })).toMatchObject({
      enabled: true,
      provider: "openai",
      viaGateway: false,
    });
    const off = modelAvailability("openai/gpt-5.5", {});
    expect(off).toMatchObject({ enabled: false, provider: "openai", missingEnv: ["OPENAI_API_KEY", "AI_GATEWAY_API_KEY"] });
    expect(off.message).toBe("Set OPENAI_API_KEY or AI_GATEWAY_API_KEY on the server to use openai/gpt-5.5.");
    expect(modelAvailability("anthropic/claude-opus-5-5", {}).message).toContain("ANTHROPIC_API_KEY");
  });

  it("falls back to the gateway for slash ids only, never for bare or openrouter ids", () => {
    const gw = { AI_GATEWAY_API_KEY: "g" };
    expect(modelAvailability("openai/gpt-5.5", gw)).toMatchObject({ enabled: true, provider: "openai", viaGateway: true });
    expect(modelAvailability("acme/zed-1", gw)).toMatchObject({ enabled: true, provider: "gateway", viaGateway: true });
    expect(modelAvailability("claude-opus-5-5", gw)).toMatchObject({ enabled: false, missingEnv: ["ANTHROPIC_API_KEY"] });
    expect(modelAvailability("openrouter/openai/gpt-5.5", gw)).toMatchObject({ enabled: false, missingEnv: ["OPENROUTER_API_KEY"] });
    expect(modelAvailability("acme/zed-1", {}).message).toContain("AI_GATEWAY_API_KEY");
  });

  it("suggests the openrouter form when only that key is set", () => {
    expect(modelAvailability("claude-opus-5-5", { OPENROUTER_API_KEY: "o" }).message).toContain("openrouter/anthropic/claude-opus-5.5");
  });
});

describe("resolveModel", () => {
  it("loads the provider package once per key and builds the model", async () => {
    const createOpenAI = vi.fn((_: { apiKey: string }) => (id: string) => ({ modelId: id, provider: "openai.responses" }));
    vi.doMock("@ai-sdk/openai", () => ({ createOpenAI }));
    const a = await resolveModel("openai/gpt-5.5", { OPENAI_API_KEY: "k" });
    const b = await resolveModel("openai/gpt-5.5-mini", { OPENAI_API_KEY: "k" });
    expect(a).toMatchObject({ provider: "openai", model: { modelId: "gpt-5.5" } });
    expect(b).toMatchObject({ model: { modelId: "gpt-5.5-mini" } });
    expect(createOpenAI).toHaveBeenCalledTimes(1);
    expect(createOpenAI).toHaveBeenCalledWith({ apiKey: "k" });
  });

  it("passes OpenRouter the vendor-qualified model id", async () => {
    const createOpenRouter = vi.fn(() => (id: string) => ({ modelId: id }));
    vi.doMock("@openrouter/ai-sdk-provider", () => ({ createOpenRouter }));
    const r = await resolveModel("openrouter/deepseek/deepseek-v4", { OPENROUTER_API_KEY: "o" });
    expect(r).toMatchObject({ provider: "openrouter", model: { modelId: "deepseek/deepseek-v4" } });
  });

  it("rejects with a readable error when the key or the package is missing", async () => {
    await expect(resolveModel("openai/gpt-5.5", {})).rejects.toMatchObject({ code: "missing_env", message: /OPENAI_API_KEY/ });
    vi.doMock("@ai-sdk/openai", () => {
      throw Object.assign(new Error("Cannot find package '@ai-sdk/openai'"), { code: "ERR_MODULE_NOT_FOUND" });
    });
    const err = await resolveModel("openai/gpt-5.5", { OPENAI_API_KEY: "k" }).catch((e) => e);
    expect(err).toBeInstanceOf(ModelUnavailableError);
    expect(err).toMatchObject({ code: "missing_package", message: /Install @ai-sdk\/openai/ });
  });

  it("uses the gateway for a slash id without the provider's key", async () => {
    const r = await resolveModel("openai/gpt-5.5", { AI_GATEWAY_API_KEY: "g" });
    expect(r.provider).toBe("openai");
    expect((r.model as { modelId: string }).modelId).toBe("openai/gpt-5.5");
  });
});

describe("providerOptionsFor", () => {
  it("spells each provider's reasoning knob its own way", () => {
    expect(providerOptionsFor("anthropic", "low")).toEqual({ anthropic: { effort: "low", fallbacks: "default" } });
    expect(providerOptionsFor("anthropic", "off")).toEqual({ anthropic: { effort: "low", fallbacks: "default" } });
    expect(providerOptionsFor("openai", "high")).toEqual({ openai: { reasoningEffort: "high", reasoningSummary: "auto" } });
    expect(providerOptionsFor("openai", "off")).toEqual({ openai: { reasoningEffort: "minimal", reasoningSummary: "auto" } });
    expect(providerOptionsFor("google", "medium")).toEqual({
      google: { thinkingConfig: { thinkingLevel: "medium", includeThoughts: true } },
    });
    expect(providerOptionsFor("deepseek", "medium")).toBeUndefined();
    expect(providerOptionsFor("deepseek", "high")).toEqual({ deepseek: { reasoningEffort: "high" } });
    expect(providerOptionsFor("openrouter", "low")).toEqual({ openrouter: { reasoning: { effort: "low" } } });
    expect(providerOptionsFor("openrouter", "off")).toBeUndefined();
    // through the gateway, the upstream provider's object keyed by the id's prefix
    expect(providerOptionsFor("gateway", "low", "openai/gpt-5.5")).toEqual({
      openai: { reasoningEffort: "low", reasoningSummary: "auto" },
    });
    expect(providerOptionsFor("gateway", "low", "acme/zed")).toBeUndefined();
  });
});

describe("displayName", () => {
  it("reads like a product name", () => {
    expect(displayName("anthropic/claude-opus-5-5")).toBe("Claude Opus 5.5");
    expect(displayName("claude-sonnet-5-5")).toBe("Claude Sonnet 5.5");
    expect(displayName("openai/gpt-5.5")).toBe("GPT-5.5");
    expect(displayName("openai/gpt-5.5-mini")).toBe("GPT-5.5 Mini");
    expect(displayName("openrouter/deepseek/deepseek-v4")).toBe("DeepSeek V4 via OpenRouter");
    expect(displayName("google/gemini-3-pro")).toBe("Gemini 3 Pro");
  });
});
