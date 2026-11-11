import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { airlineColor } from "../lib/itinerary";

/** A monogram in the airline's colour: fictional airlines, no logos. Decorative: the airline's name is next to it. */
export function AirlineBadge({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wide text-white ring-2 ring-background",
        className,
      )}
      style={{ background: airlineColor(code) }}
      aria-hidden="true"
    >
      {code}
    </span>
  );
}
