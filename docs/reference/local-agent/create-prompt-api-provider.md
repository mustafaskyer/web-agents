---
description: "A LocalProvider backed by Chrome's built-in model (the Prompt API, LanguageModel)."
---

# `createPromptApiProvider`

A `LocalProvider` backed by Chrome's built-in model (the Prompt API, `LanguageModel`). Reach for it when you build your own provider list; `createLocalAdapter` already tries it first. There is nothing to download per site once Chrome has the model.

## Import

```ts
import { createPromptApiProvider } from "@webmcp-agents/local-agent";
```

## Example

<include meta='title="chrome-only.ts"'>/_examples/shared/reference/local-agent/create-prompt-api-provider.ts</include>

## Options

None: `createPromptApiProvider()` takes no arguments.

## Returns

A [`LocalProvider`](./provider-types.md#localprovider) with `id: "prompt-api"`, `label: "Chrome built-in"`, `toolsInline: true`, and these members:

| Member | Behaviour |
|---|---|
| `availability()` | No `LanguageModel`: `unavailable`. `"available"`: `available`. `"downloadable"` or `"downloading"`: `needs-download` with a note (Chrome downloads its model once, for every site). Anything else, or a throw: `unavailable`. |
| `prepare(onProgress, signal)` | Creates the base session (text in, text out), which starts Chrome's download; `downloadprogress` events feed `onProgress`. |
| `generate(req)` | Clones the base session, prompts with a JSON `responseConstraint` (a message or one tool call), destroys the clone. Nothing streams. |
| `fits(req)` | Measures the prompt with `measureContextUsage` (or `measureInputUsage`) against `contextWindow` (or `inputQuota`), keeping 200 tokens for the reply. Without those, everything fits. |
| `dispose()` | Destroys the base session. |
| `broken` | Set when a session cannot be created; the adapter then moves to the next provider. |

## Notes

- Tool calls come from JSON-constrained output, not the API's native tools: those run `execute` inside `prompt()`, which would bypass the loop's validation and the cursor's pacing.
- The system prompt rides on the first turn; tool results are sent as user turns ("Result of <tool>: …").
- Some devices report `available` but refuse to create a session. The provider then sets `broken`, remembers it in localStorage for this browser version (`web-agents:prompt-api-broken`), and throws "… Switching to the downloadable model."
- A preview API whose shape changes between Chrome versions: every call is guarded, and anything unexpected reads as unavailable. Desktop Chrome only.
- Some devices give the model a window of about 1000 tokens; the loop shrinks the prompt until `fits` says yes.

## See also

- [On-device agent](../../more/on-device-agent.mdx)
- [`createTransformersProvider`](./create-transformers-provider.md)
- [`createLocalAdapter`](./create-local-adapter.md)
- [Provider types](./provider-types.md)
