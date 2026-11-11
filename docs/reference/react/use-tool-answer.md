---
description: "For declarative forms, the earlier form, whose own action hides them: it answers the agent's submit and keeps the form in place until the agent has its answer."
---

# `useToolAnswer`

For [declarative forms](../../more/declarative-forms.mdx), the earlier form, whose own action hides them: it answers the agent's submit and keeps the form in place until the agent has its answer. Chrome cancels a tool call whose definition changes mid-flight, and unmounting or un-naming a declarative form changes it.

A tool from [`useWebTool`](./use-web-tool.md) does not need it: its `execute` simply returns the answer, and the hook keeps the tool registered until the call is answered.

## Import

```ts
import { useToolAnswer } from "@webmcp-agents/react";
import type { ToolAnswer } from "@webmcp-agents/react";
```

## Example

Applying a code hides the form, so it stays for a moment after the agent's submit. `answer` takes the native event and the result as a promise.

<include meta='title="components/apply-promo-form.tsx"'>/_examples/shared/reference/react/use-tool-answer.tsx</include>

## Options

None. The hook takes no arguments.

## Returns

A `ToolAnswer`:

| Name | Type | Description |
|---|---|---|
| `answering` | `boolean` | True from an agent's submit until 500 ms (`RESPONSE_GRACE_MS`) after its result settles. Keep the form rendered meanwhile. |
| `answer(event, result)` | `(event: SubmitEvent, result: Promise<unknown>) => void` | Answers an agent-invoked submit: calls `event.respondWith(result)` and sets `answering`. Does nothing for a person's submit (`event.agentInvoked` is falsy). |

## Notes

- Pass the native event: in a React handler that is `e.nativeEvent as SubmitEvent`. `agentInvoked` and `respondWith` live on it.
- A rejected `result` also ends `answering` after the grace, without leaving a second unhandled rejection behind.
- A form that navigates away after answering should navigate after the grace too (`RESPONSE_GRACE_MS`, exported by core).
- Call `answer` synchronously in the submit handler. The polyfill reads the response when the event's dispatch returns, and answers `"Form submitted."` if none was given.
- `useAnswerGrace` is the same function under its old name. It is deprecated.

## See also

- [Tools with input](../../build/tools-with-input.mdx), the way new code writes a form
- [Declarative forms](../../more/declarative-forms.mdx)
- [JSX attributes](./jsx-attributes.md)
- [`useWebTool`](./use-web-tool.md)
- [`PolyfillModelContext`](../polyfill/polyfill-model-context.md) (declarative forms, `agentInvoked`, `respondWith`)
- [Tool error codes](../core/tool-error.md)
