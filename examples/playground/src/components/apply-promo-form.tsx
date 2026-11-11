/**
 * apply_promo: the playground's one declarative form, kept to show the alternative to `useWebTool`. The browser
 * registers this `<form toolname>` by itself: `tooldescription` and `toolparamdescription` describe it, and
 * `toolautosubmit` lets the agent submit without a pause. What a submit does (check and apply the code, answer the
 * agent, keep the form until it has its answer) is `useApplyPromo` (webmcp-agents/hooks).
 */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Input } from "@webmcp-agents/examples-ui/components/input";
import { Label } from "@webmcp-agents/examples-ui/components/label";
import { useId } from "react";
import { useApplyPromo } from "../webmcp-agents/hooks/use-apply-promo";

export function ApplyPromoForm() {
  const { shown, applied, code, error, changeCode, submit } = useApplyPromo();
  const inputId = useId();
  const errorId = useId();

  if (!shown) return null;

  return (
    <form
      toolname="apply_promo"
      tooldescription="Apply a promo code the user gave you to the cart, before place_order. The discount shows in the cart total and is used when the order is placed. remove_promo takes it off."
      toolautosubmit=""
      // An agent submits this, and so does a person.
      onSubmit={submit}
      className="flex flex-col gap-2"
    >
      <Label htmlFor={inputId}>Promo code</Label>

      <div className="flex gap-2">
        <Input
          id={inputId}
          name="code"
          type="text"
          required
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(e) => changeCode(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          toolparamdescription="The code exactly as the user gave it, e.g. 123"
        />

        <Button type="submit" variant="outline" disabled={applied}>
          {applied ? "Applied" : "Apply"}
        </Button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        A declarative form (<code>&lt;form toolname&gt;</code>), the alternative to <code>useWebTool</code>.
      </p>
    </form>
  );
}
