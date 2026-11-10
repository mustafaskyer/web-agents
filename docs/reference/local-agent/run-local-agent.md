---
description: "The on-device agent loop, the same for every provider: rank the page's tools, generate, parse and validate tool calls, run them on the page one at a time, feed the results back, repeat."
---

# `runLocalAgent`

The on-device agent loop, the same for every provider: rank the page's tools, generate, parse and validate tool calls, run them on the page one at a time, feed the results back, repeat. It is the body of `createLocalAdapter`'s `run()`; reach for it to build an adapter around your own provider.

## Import

```ts
import { runLocalAgent } from "@webmcp-agents/local-agent";
import type { LocalLoopOptions } from "@webmcp-agents/local-agent";
```

## Example

An adapter around a provider you made, with the loop's limits set.

<include meta='title="adapter.ts"'>/_examples/shared/reference/local-agent/run-local-agent.ts</include>

## Options

`runLocalAgent(provider, req, options?)` takes two arguments and a `LocalLoopOptions`.

| Name | Type | Default | Description |
|---|---|---|---|
| `provider` | `LocalProvider` | required | The engine that generates text. It must be ready (`prepare()` done). |
| `req` | `AgentRunRequest` | required | What the chat hands an adapter's `run()`: the messages, a `tools` getter, `signal` and `callTool`. |
| `maxSteps` | `number` | `6` | Model steps per user message: enough to find, open and add; small models plan poorly beyond that. The page's agent (`req.agent?.maxSteps`) wins. |
| `stepTimeoutMs` | `number` | `60000` | Time limit per generation, in ms. A timeout ends the run with a message. |
| `maxTools` | `number` | `8` | Most tools shown to the model per step. Fewer tools and shorter lists make small models choose better. |
| `toolsInline` | `boolean` | `false` | List the tools in the prompt text, with a JSON reply format, for providers without chat-template tools. `createLocalAdapter` passes `provider.toolsInline`. |
| `instructions` | `string` | none | What the site is and how its tools fit together ("To buy: search, open_product, then add_to_cart"). Added under "About this site". The page's agent (`req.agent?.instructions`) wins; with sub-agents a delegation note is added too. |

## Returns

An async generator of [`AgentStreamPart`](../chat/adapter-types.md#agentstreampart)s that ends with `finish` or `error`.

### What the loop does

1. **History.** The conversation becomes chat-template turns (last 12, starting on a user turn); earlier calls are written back in the provider's `callFormat`, and results are cut to 1500 characters.
2. **Resume.** If the history ends on a tool result (Retry resumed after a finished call), the loop adds a "next step for my request" turn and continues. That turn's finished calls count toward loop detection and the last failure.
3. **Tool ranking.** Each step reads `req.tools` fresh and keeps at most `maxTools`, ranked against the last user message by [`rankTools`](./tools.md) (recently used tools get a bonus), with compact schemas.
4. **Prompt fitting.** With `provider.fits`, the loop tries `maxTools`, then 4, 2 and 1 tools; then drops the oldest turns (the newest user turn always stays). Still too long: `error` "This request is too long for the on-device model. …"
5. **Generate.** One generation per attempt, raced against Stop and `stepTimeoutMs`. A timeout is `error` "The on-device model took too long. …"; a provider error is `error` "The on-device model failed: …".
6. **Read before showing.** The reply is parsed with [`parseToolCalls`](./tool-call-parser.md) and each call checked with [`validateArgs`](./tools.md). Prose is shown only after these checks (no token streaming).
7. **Corrections (once per step).** A plain reply that ignores the last failed call is sent back with the error and "Don't say it worked". A reply to an action request that tells the user to use a tool that is right here ("click Add to cart") is sent back with "you do it. Call <tool> now". A reply that only echoes an earlier result is replaced by the gist of the last result.
8. **Repair (once per step).** An unknown tool, unreadable call or invalid arguments go back as a tool error ("Error: … Try again."). A second bad reply ends the run with an apology.
9. **Run calls.** Calls run in order through `req.callTool`, each as `tool-call` then `tool-result` or `tool-error`. After the step, the request is restated as a user turn, so a small model continues it instead of echoing the last result.
10. **Loop detection.** A call with the same name and arguments that returns the same answer as before is flagged to the model once; the second time the run stops: "I stopped because I was going in circles. …"
11. **Max steps.** After `maxSteps` steps the run ends with a message (the last result's gist, then "I stopped after N steps without finishing. …") and `finish` with `reason: "max-steps"`.

## Notes

- Stop (`req.signal`) ends the run with `finish` `"aborted"`.
- Every step opens a new assistant message (`message-start`).
- The system prompt also carries the page's path, title and main `h1` (outside the chat's own UI), and a worked example call for the first tool.
- Tool failures arrive as `Error [code]: …`; the prompt tells the model what each code means. See [tool error codes](../core/tool-error.md).
- `LocalAdapterOptions` takes `maxSteps`, `stepTimeoutMs` and `instructions` from this type; `maxTools` and `toolsInline` are set only here.

## See also

- [On-device agent](../../more/on-device-agent.mdx), the page that teaches it
- [`createLocalAdapter`](./create-local-adapter.md)
- [`parseToolCalls`](./tool-call-parser.md)
- [`rankTools`, `compactSchema`, `validateArgs`](./tools.md)
- [Provider types](./provider-types.md)
