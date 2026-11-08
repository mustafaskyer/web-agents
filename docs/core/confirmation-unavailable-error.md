# `ConfirmationUnavailableError`

The error a confirm-gated tool fails with when the person can't confirm because there is nothing to click on. The gate fails closed: the call errors rather than run unconfirmed or hang.

```ts
import { ConfirmationUnavailableError } from "@web-agents/core";
```

## Signature

```ts
class ConfirmationUnavailableError extends Error {
  name: "ConfirmationUnavailableError";
}
```

## Parameters

Takes the standard `Error` message. The library's message reads: `"<tool id>" needs the user's confirmation, but there is nothing to confirm on (<selector>) on the page right now.`

## Returns

An `Error` instance.

## Example

```ts
import { ConfirmationUnavailableError } from "@web-agents/core";

try {
  await runSomething();
} catch (err) {
  if (err instanceof ConfirmationUnavailableError) showHint("Open the cart to confirm.");
}
```

## Notes

- It is thrown for a tool with `requireConfirmation: true` (see [`defineWebTool`](./define-web-tool.md)) when the target element is missing or `:disabled` at call time, or stops being clickable while waiting.
- [`toModelContextTool`](./to-model-context-tool.md) turns it into an `isError` result with code `unavailable`, so the agent reads the message.
- Only a trusted click on the target confirms. A script calling `el.click()` cannot. The confirming click is swallowed, so the element's own click handler doesn't run the action a second time.

## See also

- [`defineWebTool`](./define-web-tool.md)
- [`toModelContextTool`](./to-model-context-tool.md)
- [`toolError`](./tool-error.md)
