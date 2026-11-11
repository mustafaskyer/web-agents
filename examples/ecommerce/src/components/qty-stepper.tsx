import { Button } from "@webmcp-agents/examples-ui/components/button";
import { ButtonGroup } from "@webmcp-agents/examples-ui/components/button-group";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";

export interface QtyStepperProps {
  value: number;
  onChange(value: number): void;
  onBlur?(): void;
  max: number;
  /** Names the input for screen readers, e.g. "Quantity of Ocean Tee (M)": update_cart_item's target. */
  label?: string;
  /** The field's name: a tool's parameter of the same name is typed into it. */
  name?: string;
  /** For a visible <label htmlFor>. */
  id?: string;
  size?: "sm" | "default";
}

/** A native number field between − and +: the agent cursor types into the field like a person would. */
export function QtyStepper({ value, onChange, onBlur, max, label = "Quantity", name, id, size = "default" }: QtyStepperProps) {
  const icon = size === "sm" ? "icon-sm" : "icon-lg";

  return (
    <ButtonGroup>
      <Button
        type="button"
        variant="outline"
        size={icon}
        aria-label="Decrease quantity"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <MinusIcon />
      </Button>

      <input
        data-slot="input"
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        required
        aria-label={label}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        onBlur={onBlur}
        className={cn(
          "w-12 flex-none border border-input bg-transparent text-center text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [appearance:textfield] dark:bg-input/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          size === "sm" ? "h-7" : "h-9",
        )}
      />

      <Button
        type="button"
        variant="outline"
        size={icon}
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <PlusIcon />
      </Button>
    </ButtonGroup>
  );
}
