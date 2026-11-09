# Provider types

The contract between the on-device agent loop and the engines that run a model. A provider only generates; the loop
owns tools, validation and the conversation. Implement `LocalProvider` to plug in your own engine.

```ts
import type {
  CallFormat, ChatTurn, CompactTool, GenerateRequest, GenerateResult, LocalProvider, ProviderAvailability,
} from "@webmcp-agents/local-agent";
```

## `LocalProvider`

```ts
interface LocalProvider {
  readonly id: "transformers" | "prompt-api" | (string & {});
  readonly label: string;
  readonly toolsInline?: boolean;
  readonly callFormat?: CallFormat;
  readonly broken?: string;
  availability(): Promise<ProviderAvailability>;
  prepare(onProgress: (progress: number) => void, signal?: AbortSignal): Promise<void>;
  generate(req: GenerateRequest): Promise<GenerateResult>;
  fits?(req: Pick<GenerateRequest, "system" | "messages" | "tools">): Promise<boolean>;
  dispose?(): void;
}
```

| Member | Default | Description |
|---|---|---|
| `id`, `label` | — | Identify the provider. |
| `toolsInline` | `false` | List the tools in the prompt text (no chat-template tools support); replies use a JSON format. |
| `callFormat` | `"tags"` | How the model writes tool calls, and so how its earlier calls go back into the history. |
| `broken` | — | Set once the provider found it can't run here after all: the adapter moves on to the next provider. |
| `availability()` | — | Whether it can run, and what it needs first. |
| `prepare(onProgress, signal)` | — | Download and load the model. `onProgress` gets 0 to 1. Aborting stops the download. |
| `generate(req)` | — | One generation. |
| `fits(req)` | everything fits | Whether a prompt fits the model's input window, with room for the reply. The loop offers fewer tools and less history until it does. |
| `dispose()` | — | Free the model (terminate the worker, destroy the session). |

## `ProviderAvailability`

```ts
type ProviderAvailability =
  | { state: "available" }
  | { state: "needs-download"; bytes?: number; note?: string; cached?: boolean }
  | { state: "downloading"; progress: number }
  | { state: "unavailable"; reason: string };
```

`cached`: downloaded before, so the person already agreed; it loads from the browser cache on first use, with no
click.

## `CallFormat`

```ts
type CallFormat = "tags" | "pythonic";
```

`"tags"`: `<tool_call>{json}</tool_call>` (Qwen, Hermes). `"pythonic"`:
`<|tool_call_start|>[name(arg="x")]<|tool_call_end|>` (Liquid LFM2).

## `CompactTool`

```ts
interface CompactTool {
  name: string;
  description: string;
  parameters: JSONSchema;
}
```

A tool as small models see it: compact schema, short description (see [`rankTools`](./tools.md#ranktools)).

## `ChatTurn`

```ts
interface ChatTurn {
  role: "user" | "assistant" | "tool";
  content: string;
  name?: string; // the tool's name, on tool turns
}
```

## `GenerateRequest` and `GenerateResult`

```ts
interface GenerateRequest {
  system: string;
  messages: ChatTurn[];
  tools: CompactTool[];
  signal: AbortSignal;
  onToken?(delta: string): void;
}

interface GenerateResult {
  text: string;
}
```

`tools` holds at most a handful, compacted. `onToken` gets raw text as it is generated. `text` is the raw reply; the
loop parses tool calls out of it.

## Example

```ts
const echoProvider: LocalProvider = {
  id: "echo",
  label: "Echo",
  async availability() { return { state: "available" }; },
  async prepare() {},
  async generate(req) {
    const last = req.messages.findLast((t) => t.role === "user");
    return { text: `You said: ${last?.content ?? ""}` };
  },
};
const adapter = createLocalAdapter({ providers: [echoProvider] });
```

## Notes

- `generate` should honour `req.signal`. The loop also races it against Stop and the step timeout, so a provider that
  ignores it can't hang the run.
- Throwing from `generate` after setting `broken` makes `createLocalAdapter` switch providers instead of showing the
  error.

## See also

- [`runLocalAgent`](./run-local-agent.md)
- [`createLocalAdapter`](./create-local-adapter.md)
- [`createTransformersProvider`](./create-transformers-provider.md)
- [`createPromptApiProvider`](./create-prompt-api-provider.md)
