import { Button } from "@webmcp-agents/examples-ui/components/button";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { SORT_LABEL, SORTS, type SortKey } from "../data/flights";

/** Segmented sort control. sort_results presses the button named like the sort ("Price: high to low"). */
export function SortBar({ value, onChange, className }: { value: SortKey; onChange(by: SortKey): void; className?: string }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a group of toggle buttons, not a form fieldset
    <div
      role="group"
      aria-label="Sort by"
      className={cn("flex gap-1 overflow-x-auto rounded-xl border bg-card p-1 [scrollbar-width:none]", className)}
    >
      {SORTS.map((s) => (
        <Button
          key={s}
          type="button"
          variant={value === s ? "default" : "ghost"}
          size="sm"
          className="flex-1 px-3"
          aria-pressed={value === s}
          onClick={() => onChange(s)}
        >
          {SORT_LABEL[s]}
        </Button>
      ))}
    </div>
  );
}
