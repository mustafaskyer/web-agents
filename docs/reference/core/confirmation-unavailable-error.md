---
description: "The error a confirm-gated tool fails with when the person cannot confirm because there is nothing to click."
---

# `ConfirmationUnavailableError`

The error a confirm-gated tool fails with when the person cannot confirm because there is nothing to click. The gate fails closed: the call errors instead of running unconfirmed or hanging. You rarely construct it; you meet it as the `unavailable` code of a failed call.

## Import

```ts
import { ConfirmationUnavailableError } from "@webmcp-agents/core";
```

## Example

A tool with `requireConfirmation` parks the cursor on its button and waits for the person's own click. When there is no button to park on, the call fails with `unavailable`; `invoke` rethrows that as a [`WebToolError`](./web-tool-error.md).

<include meta='title="confirm-without-a-button.ts"'>/_examples/shared/reference/core/confirmation-unavailable-error.ts</include>

## Options

`new ConfirmationUnavailableError(message)` takes the standard `Error` argument and sets `name` to `"ConfirmationUnavailableError"`.

| Name | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | required | What the agent reads. The library's own message is `"<tool id>" needs the user's confirmation, but there is nothing to confirm on (<what it looked for>) on the page right now.`, or, when a name matches several controls, `… but N controls match <name>. Set a \`target\` that picks one.` |

## Returns

An `Error` instance whose `name` is `"ConfirmationUnavailableError"`.

## Notes

- It is thrown for a tool with `requireConfirmation: true` (see [`defineWebTool`](./define-web-tool.md)) when its control is missing, hidden (`display: none`, `visibility: hidden`, inside `inert`) or `:disabled` at call time, when a control found by name (its `title`, or a locator `target`) matches several, or when the control stops being clickable while waiting.
- A tool that needs confirming needs exactly one matching control: give it a `title` that names one button, or a [`target`](./define-web-tool.md#where-the-cursor-goes) that picks one.
- [`toModelContextTool`](./to-model-context-tool.md) turns it into an `isError` result with code `unavailable`, so the agent reads the message. Any other error is `failed`.
- Only a trusted click on the control confirms; a script calling `el.click()` cannot.
- The confirming click is swallowed, so the element's own click handler does not run the action a second time. For 300 ms afterwards a scripted click on the same element (or one around or inside it) is swallowed too: press libraries such as React Aria call `el.click()` themselves when the real click never reached their element, which would otherwise fire `onPress` or follow the link after all.
- A tool's `execute` should do the action itself rather than `click()` its own element.

## See also

- [Confirm before it runs](../../build/confirm-before-it-runs.mdx), the page that teaches it
- [`defineWebTool`](./define-web-tool.md)
- [`toModelContextTool`](./to-model-context-tool.md)
- [`toolError`](./tool-error.md) and [`WebToolError`](./web-tool-error.md)
