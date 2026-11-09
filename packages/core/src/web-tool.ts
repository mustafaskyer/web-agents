/**
 * WebTool: one tool definition for every place a tool runs.
 *
 * The config is a structural superset of Mastra's `createTool` config and the
 * AI SDK's `tool()` input (`id`, `description`, `inputSchema`, `outputSchema`,
 * `execute`), so the same object registers with the browser
 * (`document.modelContext.registerTool`), shows up in devtools, and can be sent
 * to a server agent as a client-side tool. Schemas are Standard Schema (zod 4,
 * valibot, arktype), exported to JSON Schema through Standard JSON Schema, or
 * plain JSON Schema objects.
 *
 *   const addToCart = defineWebTool({
 *     id: "add_to_cart",
 *     description: "Add a product to the cart",
 *     inputSchema: z.object({ sku: z.string(), qty: z.number().int().min(1) }),
 *     execute: ({ sku, qty }, ctx) => ctx.context!.add(sku, qty),
 *   });
 */
import type { StandardJSONSchemaV1, StandardSchemaV1 } from "@standard-schema/spec";
import { CONFIRM, ConfirmationUnavailableError, TARGET, waitForConfirmation } from "./confirm";
import type { CallTracker } from "./deferred";
import { abortError, errorResult, isAbortError, toToolResult } from "./result";

/**
 * Augment to type `ctx.context` (the provider's `context` prop / the registry's `context` option):
 *
 *   declare module "@webmcp-agents/core" { interface Register { context: CartApi } }
 */
// biome-ignore lint/suspicious/noEmptyInterface: an augmentation point, empty until the app fills it
export interface Register {}

/** The app state tools receive as `ctx.context`: `unknown` until `Register` is augmented. */
export type RegisteredContext = Register extends { context: infer C } ? C : unknown;

/** MCP tool annotations: hints for the agent, never enforced. */
export interface WebToolAnnotations {
  /** The tool only reads. */
  readOnlyHint?: boolean;
  /** The tool may destroy or overwrite data. */
  destructiveHint?: boolean;
  /** Calling again with the same input has no further effect. */
  idempotentHint?: boolean;
  /** The tool reaches beyond the page (network, other systems). */
  openWorldHint?: boolean;
  /** The result may contain content the agent should not trust as instructions. */
  untrustedContentHint?: boolean;
  [hint: string]: unknown;
}

/** What `execute` gets besides its input. */
export interface WebToolContext {
  /** Aborts when the call is cancelled (the agent gave up, the user cancelled). */
  signal: AbortSignal;
  /** Who called: the browser's WebMCP, a chat widget, devtools or a test. */
  source: "webmcp" | "chat" | "devtools" | "test";
  toolCallId?: string;
  /** App state from the provider's `context` prop (or the registry's `context` option). Typed via `Register`. */
  context?: RegisteredContext;
}

export interface WebToolConfig<I = unknown, O = unknown> {
  /** The WebMCP tool name: 1–128 of `a-z A-Z 0-9 _ . -`. Snake case reads best to agents (`clear_cart`). */
  id: string;
  /** Human-readable name, for UIs that list tools. */
  title?: string;
  /** What the tool does and when to use it: the agent reads this to decide. */
  description: string;
  /** Standard Schema (zod 4 / valibot / arktype) or a JSON Schema object. Must describe an object. Default: no input. */
  inputSchema?: StandardSchemaV1<unknown, I> | JSONSchema;
  /** Checked in development only: a mismatch warns, never throws. */
  outputSchema?: StandardSchemaV1<unknown, O>;
  annotations?: WebToolAnnotations;
  /**
   * Wait for the person to click the tool's element (`target`) before running.
   * For destructive or consequential actions. With the visuals installed, the
   * cursor parks on the element instead of clicking it. Default false.
   */
  requireConfirmation?: boolean;
  /**
   * Where the cursor goes. Usually unnecessary: put `toolname="<id>"` on the element the tool acts on and leave this
   * out (the default is `[toolname="<id>"]`; a tool with no element on the page runs at once, unseen). Use a
   * function only when the element depends on the call, e.g. one row of a list:
   * `({ slug }) => \`[data-line="${slug}"] button\``. A selector that matches nothing (or a function returning
   * undefined) falls back to the default.
   */
  target?: string | TargetFn<I>;
  /** Do the work. Throw for bad input or failures: the agent gets the message as an error result. */
  execute(input: I, ctx: WebToolContext): O | Promise<O>;
}

/** A defined tool: the config, its input as JSON Schema, and `run` (validate, then execute). */
export interface WebTool<I = unknown, O = unknown> extends Readonly<Omit<WebToolConfig<I, O>, "execute">> {
  readonly kind: "web-tool";
  /** The input schema as JSON Schema draft-07, without `$schema`. Computed on first read. */
  readonly jsonSchema: JSONSchema;
  /** The config's `execute`, always async. */
  execute(input: I, ctx: WebToolContext): Promise<O>;
  /** Validate `input` against `inputSchema` (Standard Schema only; JSON Schema input passes through). Throws `WebToolInputError`. */
  parse(input: unknown): Promise<I>;
  /** `parse`, then `execute`. */
  run(input: unknown, ctx: WebToolContext): Promise<O>;
}

/** The input failed the tool's schema. The message names each bad field, for the agent to fix its call. */
export class WebToolInputError extends Error {
  override name = "WebToolInputError";
  constructor(
    readonly toolId: string,
    readonly issues: ReadonlyArray<StandardSchemaV1.Issue>,
  ) {
    super(`Invalid input for ${toolId}: ${issues.map(describeIssue).join("; ")}`);
  }
}

function describeIssue(issue: StandardSchemaV1.Issue): string {
  const path = (issue.path ?? []).map((p) => String(typeof p === "object" ? p.key : p)).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

const ID_PATTERN = /^[a-zA-Z0-9_.-]{1,128}$/;

const isStandardSchema = (s: unknown): s is StandardSchemaV1 => typeof s === "object" && s !== null && "~standard" in s;

function deriveJsonSchema(id: string, schema: WebToolConfig["inputSchema"]): JSONSchema {
  if (schema === undefined) return { type: "object", properties: {} };
  let json: JSONSchema;
  if (isStandardSchema(schema)) {
    const converter = (schema["~standard"] as Partial<StandardJSONSchemaV1.Props>).jsonSchema;
    if (!converter?.input) {
      throw new TypeError(
        `WebTool "${id}": this schema library doesn't implement Standard JSON Schema. Pass a JSON Schema object instead, e.g. z.toJSONSchema(schema, { target: "draft-07", io: "input" }).`,
      );
    }
    json = { ...converter.input({ target: "draft-07" }) };
  } else {
    json = { ...schema };
  }
  delete json.$schema;
  json.type ??= "object";
  if (json.type !== "object")
    throw new TypeError(
      `WebTool "${id}": inputSchema must describe an object (WebMCP tools take named arguments), got type ${JSON.stringify(json.type)}.`,
    );
  return json;
}

const isDev = (): boolean => (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !== "production";

/** Define a tool. Checks the id now; derives the JSON Schema on first use. */
export function defineWebTool<I, O>(
  config: WebToolConfig<I, O> & { inputSchema: StandardSchemaV1<unknown, I> },
): WebTool<I, O> & { readonly inputSchema: StandardSchemaV1<unknown, I> };
export function defineWebTool<I = unknown, O = unknown>(config: WebToolConfig<I, O>): WebTool<I, O>;
export function defineWebTool<I, O>(config: WebToolConfig<I, O>): WebTool<I, O> {
  const { id, inputSchema, outputSchema } = config;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    throw new TypeError(`WebTool id ${JSON.stringify(id)} is invalid: use 1–128 letters, digits, "_", "." or "-" (e.g. "clear_cart").`);
  }
  const execute = async (input: I, ctx: WebToolContext): Promise<O> => config.execute(input, ctx);
  const parse = async (input: unknown): Promise<I> => {
    const value = input ?? {};
    if (!isStandardSchema(inputSchema)) return value as I;
    const checked = await inputSchema["~standard"].validate(value);
    if (checked.issues) throw new WebToolInputError(id, checked.issues);
    return checked.value as I;
  };
  let jsonSchema: JSONSchema | undefined;

  const tool: WebTool<I, O> = {
    id,
    title: config.title,
    description: config.description,
    inputSchema,
    outputSchema,
    annotations: config.annotations,
    requireConfirmation: config.requireConfirmation,
    target: config.target,
    kind: "web-tool",
    get jsonSchema() {
      jsonSchema ??= deriveJsonSchema(id, inputSchema);
      return jsonSchema;
    },
    execute,
    parse,
    async run(input, ctx) {
      const output = await execute(await parse(input), ctx);
      if (outputSchema && isDev()) {
        const checked = await outputSchema["~standard"].validate(output);
        if (checked.issues) console.warn(`[web-agents] "${id}" returned output that doesn't match its outputSchema:`, checked.issues);
      }
      return output;
    },
  };
  return Object.freeze(tool);
}

/** What WebMCP sees of a tool. When it changes, the tool must re-register; when it doesn't, it mustn't (Chrome cancels its calls). */
export const webToolSignature = (t: WebTool): string =>
  JSON.stringify([t.id, t.title, t.description, t.jsonSchema, t.annotations ?? null, !!t.requireConfirmation, t.target ?? null]);

/** Options for `toModelContextTool` / `registerWebTool`. */
export interface ToModelContextToolOptions {
  /** Read on every call and passed to execute as `ctx.context`. */
  context?: () => unknown;
  /** Counts each call (confirmation wait included), so unregistering can wait for it. */
  calls?: CallTracker;
}

/**
 * A per-call target. It gets the call's arguments as sent (the cursor moves before validation), so read them
 * defensively; a throw falls back to the default. Declared as a method so a `WebTool<Input>` still fits where a
 * `WebTool<unknown>` is expected (registries hold mixed tools).
 */
export type TargetFn<I> = { pick(input: I): string | undefined }["pick"];

/** Adapt a WebTool to the shape `document.modelContext.registerTool` takes. Failures become `isError` results; cancellation rejects. */
export function toModelContextTool(tool: WebTool, { context, calls }: ToModelContextToolOptions = {}): ModelContextTool {
  // Ids are [a-zA-Z0-9_.-]: safe inside a quoted attribute selector without CSS.escape (absent in Node).
  const fallback = `[toolname="${tool.id}"]`;
  /** The selector for this call: a function target sees the input; a throwing one falls back. */
  const targetFor = (input: unknown): string | undefined => {
    if (typeof tool.target !== "function") return tool.target;
    try {
      const selector = tool.target(typeof input === "string" ? JSON.parse(input || "{}") : input);
      if (selector && typeof document !== "undefined") document.querySelector(selector); // throws on invalid CSS
      return selector;
    } catch {
      return undefined; // built from agent input: never let a bad selector break the run
    }
  };
  /** Where a confirmation click must land: the tool's own target when something matches it right now, else `[toolname]`. */
  const confirmSelector = (input: unknown): string => {
    const own = targetFor(input);
    return own && typeof document !== "undefined" && document.querySelector(own) ? own : fallback;
  };
  const call = async (args: unknown, signal: AbortSignal): Promise<ModelContextToolResult> => {
    try {
      // Chrome 150 passed the arguments as a JSON string.
      const input = await tool.parse(typeof args === "string" ? JSON.parse(args || "{}") : args);
      // Only a valid call asks the user: they must never approve something that then fails validation.
      if (tool.requireConfirmation) await waitForConfirmation(confirmSelector(input), signal, tool.id);
      if (signal.aborted) throw abortError(signal); // cancelled while validating: don't start the work
      return toToolResult(await tool.execute(input, { signal, source: "webmcp", context: context?.() as RegisteredContext }));
    } catch (err) {
      if (isAbortError(err)) throw err;
      return errorResult(
        err,
        err instanceof WebToolInputError ? "invalid_input" : err instanceof ConfirmationUnavailableError ? "unavailable" : "failed",
      );
    }
  };
  return {
    name: tool.id,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.jsonSchema,
    annotations: tool.annotations,
    // Read by the visuals layer: park instead of click, and where to point.
    // where the cursor parks to wait (a per-call target is resolved by the visuals from the arguments)
    [CONFIRM]: tool.requireConfirmation ? (typeof tool.target === "string" ? tool.target : fallback) : undefined,
    [TARGET]: typeof tool.target === "function" ? targetFor : tool.target,
    execute(args: unknown, options?: ModelContextExecuteOptions) {
      const signal = options?.signal ?? new AbortController().signal;
      return calls ? calls.track(() => call(args, signal)) : call(args, signal);
    },
  } as ModelContextTool;
}

let warnedUnavailable = false;

/** The live registration per tool id, so a stale unregister can't remove a newer registration of the same id. */
const owners = new Map<string, () => void>();

/** True when the page has `document.modelContext` (native WebMCP or the polyfill). */
export const isWebMCPAvailable = (): boolean => typeof document !== "undefined" && !!document.modelContext;

/**
 * Register a WebTool with `document.modelContext`. Returns an unregister
 * function (idempotent; aborting `signal` does the same). Without WebMCP it
 * warns once and returns a no-op, so the app still renders.
 *
 * Registering an id that is already registered through this function
 * replaces that registration; the replaced one's unregister becomes a no-op.
 *
 * Unregistering cancels the tool's in-flight calls in Chrome: from UI code,
 * release through `deferRelease` with a `CallTracker` (the registry and the
 * React hooks do).
 */
export function registerWebTool(
  tool: WebTool,
  { signal, ...options }: ToModelContextToolOptions & { signal?: AbortSignal } = {},
): () => void {
  const mc = typeof document !== "undefined" ? document.modelContext : undefined;
  if (!mc) {
    if (!warnedUnavailable && typeof document !== "undefined") {
      warnedUnavailable = true;
      console.warn(
        '[web-agents] document.modelContext is unavailable; import "@webmcp-agents/polyfill/auto" in dev or use a WebMCP-enabled Chrome.',
      );
    }
    return () => {};
  }
  const ac = new AbortController();
  let done = false;
  const unregister = (): void => {
    if (done) return;
    done = true;
    signal?.removeEventListener("abort", unregister);
    if (owners.get(tool.id) !== unregister) return; // replaced: the id belongs to a newer registration
    owners.delete(tool.id);
    ac.abort();
    mc.unregisterTool?.(tool.id);
  };
  if (signal?.aborted) return () => {};
  owners.get(tool.id)?.(); // Chrome rejects a duplicate name: the newest registration wins
  signal?.addEventListener("abort", unregister, { once: true });
  mc.registerTool(toModelContextTool(tool, options), { signal: ac.signal });
  owners.set(tool.id, unregister);
  return unregister;
}
