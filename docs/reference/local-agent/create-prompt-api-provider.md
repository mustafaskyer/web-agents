# `createPromptApiProvider`

A `LocalProvider` backed by Chrome's built-in model (the Prompt API, `LanguageModel`). Nothing to download per site
once Chrome has the model.

```ts
import { createPromptApiProvider } from "@webmcp-agents/local-agent";
```

## Signature

```ts
function createPromptApiProvider(): LocalProvider;
```

## Parameters

None.

## Returns

A [`LocalProvider`](./provider-types.md#localprovider) with `id: "prompt-api"`, `label: "Chrome built-in"`,
`toolsInline: true`, and `availability`, `prepare`, `generate`, `fits`, `dispose`.

| Member | Behaviour |
|---|---|
| `availability()` | No `LanguageModel`: `unavailable`. `"available"`: `available`. `"downloadable"` / `"downloading"`: `needs-download` with a note (Chrome downloads its model once, for every site). Anything else, or a throw: `unavailable`. |
| `prepare(onProgress, signal)` | Creates the base session (text in, text out), which starts Chrome's download; `downloadprogress` events feed `onProgress`. |
| `generate(req)` | Clones the base session, prompts with a JSON `responseConstraint` (a message or one tool call), destroys the clone. Nothing streams. |
| `fits(req)` | Measures the prompt with `measureContextUsage` (or `measureInputUsage`) against `contextWindow` (or `inputQuota`), keeping 200 tokens for the reply. Without those, everything fits. |
| `dispose()` | Destroys the base session. |
| `broken` | Set when a session can't be created; the adapter then moves to the next provider. |

## Example

```ts
import { createLocalAdapter, createPromptApiProvider } from "@webmcp-agents/local-agent";

// Chrome's built-in model only: no download fallback
const chromeOnly = createLocalAdapter({ providers: [createPromptApiProvider()], label: "Chrome AI" });
```

## Notes

- Tool calls come from JSON-constrained output, not the API's native tools: those run `execute` inside `prompt()`,
  which would bypass the loop's validation and the cursor's pacing.
- The system prompt rides on the first turn; tool results are sent as user turns ("Result of <tool>: …").
- Some devices report `available` but refuse to create a session. The provider then sets `broken`, remembers it in
  localStorage for this browser version (`web-agents:prompt-api-broken`), and throws "… Switching to the downloadable
  model."
- A preview API whose shape changes between Chrome versions: every call is guarded, and anything unexpected reads as
  unavailable. Desktop Chrome only.
- Some devices give the model a window of about 1000 tokens; the loop shrinks the prompt until `fits` says yes.

## See also

- [`createTransformersProvider`](./create-transformers-provider.md)
- [`createLocalAdapter`](./create-local-adapter.md)
- [Provider types](./provider-types.md)
