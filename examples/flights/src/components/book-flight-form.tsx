/**
 * The fare rules and the "Book flight" button. Its tool, book_flight (confirm-gated), lives in `useBookFlight`
 * (src/webmcp-agents/hooks/use-book-flight.ts): the cursor ticks the box and parks on the button until the person clicks.
 */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { LockIcon } from "lucide-react";
import { useId } from "react";
import { money } from "../data/flights";
import { type UseBookFlightOptions, useBookFlight } from "../webmcp-agents/hooks/use-book-flight";

export function BookFlightForm(props: UseBookFlightOptions) {
  const { form, error, termsError, clearError, submit } = useBookFlight(props);
  const errorId = useId();

  return (
    <form
      className="flex flex-col gap-4"
      // A person submits this.
      onSubmit={submit}
    >
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 text-sm has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5">
        <input
          type="checkbox"
          required
          className="mt-0.5 size-4 shrink-0 accent-primary"
          aria-invalid={termsError || undefined}
          {...form.register("acceptTerms", { onChange: clearError })}
        />
        <span>I accept the fare rules: changes cost USD 75, the fare is non-refundable after 24 hours.</span>
      </label>

      {error && (
        <p id={errorId} role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 w-full text-base" aria-describedby={error ? errorId : undefined}>
        <LockIcon />
        Book flight · <span className="tabular-nums">{money(props.total)}</span>
      </Button>
      <p className="text-center text-xs text-muted-foreground">Demo site: no payment is taken and no ticket is issued.</p>
    </form>
  );
}
