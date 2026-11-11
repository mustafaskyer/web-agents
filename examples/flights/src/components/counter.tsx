import { Button } from "@webmcp-agents/examples-ui/components/button";
import { MinusIcon, PlusIcon } from "lucide-react";

export interface CounterProps {
  name: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange(value: number): void;
  onBlur?(): void;
}

/**
 * A labelled number field with −/+ buttons. The input is a real, native field: a tool's parameter named like it
 * (`adults`) is written there by the cursor.
 */
export function Counter({ name, label, hint, value, min, max, onChange, onBlur }: CounterProps) {
  const id = `count-${name}`;
  return (
    <div className="flex items-center justify-between gap-x-3 gap-y-1.5 rounded-lg border bg-background px-3 py-2 sm:flex-col sm:items-start">
      <label htmlFor={id} className="flex flex-col leading-tight">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </label>
      <div className="flex items-center gap-1 sm:self-stretch sm:justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-full"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <MinusIcon />
        </Button>
        <input
          id={id}
          name={name}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          className="w-9 appearance-none bg-transparent text-center text-sm font-medium tabular-nums outline-none [-moz-appearance:textfield] focus-visible:rounded focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={Number.isNaN(value) ? "" : value}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          onBlur={onBlur}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-full"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}
