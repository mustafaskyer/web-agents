# `useToolAnswer`

For declarative `<form toolname>` tools whose own action hides them. Chrome cancels a tool call whose definition changes mid-flight, and unmounting or un-naming a declarative form changes it. `useToolAnswer` answers the agent's submit and keeps the form in place until the agent has its answer.

```ts
import { useToolAnswer } from "@web-agents/react";
import type { ToolAnswer } from "@web-agents/react";
```

## Signature

```ts
function useToolAnswer(): ToolAnswer;

interface ToolAnswer {
  answering: boolean;
  answer(event: SubmitEvent, result: Promise<unknown>): void;
}

/** @deprecated Renamed to `useToolAnswer`. */
const useAnswerGrace: typeof useToolAnswer;
```

## Parameters

—

## Returns

`ToolAnswer`:

| Name | Type | Description |
|---|---|---|
| `answering` | `boolean` | True from an agent's submit until 500 ms (`RESPONSE_GRACE_MS`) after its result settles. Keep the form rendered meanwhile. |
| `answer(event, result)` | `(event: SubmitEvent, result: Promise<unknown>) => void` | Answers an agent-invoked submit: calls `event.respondWith(result)` and sets `answering`. Does nothing for a person's submit (`event.agentInvoked` is falsy). |

## Example

From `apps/ecommerce/src/tools/ApplyPromoForm.tsx`, trimmed. Applying a code hides the form, so it stays for a moment after answering.

```tsx
import { useToolAnswer } from "@web-agents/react";

export function ApplyPromoForm() {
  const cart = useCart();
  const { answering, answer } = useToolAnswer();

  if (cart.promo && !answering) return null;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    let message: string;
    try {
      message = cart.applyPromo(String(new FormData(e.currentTarget).get("code") ?? ""));
    } catch (err) {
      message = `Error: ${errorText(err)}`;
    }
    answer(e.nativeEvent as SubmitEvent, Promise.resolve(message));
  }

  return (
    <form toolname="apply_promo" tooldescription="Apply a promo code the user gave you to the cart." toolautosubmit="" onSubmit={onSubmit}>
      <input name="code" required toolparamdescription="The promo code, e.g. WELCOME10" />
      <button type="submit">Apply</button>
    </form>
  );
}
```

## Notes

- Pass the native event: in a React handler that is `e.nativeEvent as SubmitEvent`. `agentInvoked` and `respondWith` live on it.
- A rejected `result` also ends `answering` after the grace, without leaving a second unhandled rejection behind.
- A form that navigates away after answering should navigate after the grace too. The example apps do this with `afterAnswer` (`apps/*/src/lib/afterAnswer.ts`).
- Call `answer` synchronously in the submit handler. The polyfill reads the response when the event's dispatch returns, and answers `"Form submitted."` if none was given.
- `useAnswerGrace` is the same function under its old name. It is deprecated.

## See also

- [JSX attributes](./jsx-attributes.md)
- [`PolyfillModelContext`](../polyfill/polyfill-model-context.md) (declarative forms, `agentInvoked`, `respondWith`)
- [Tool error codes](../core/tool-error.md)
