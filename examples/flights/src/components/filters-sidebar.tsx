/**
 * Stops and airline filters. On wide screens a card beside the results; on phones a bottom sheet behind a Filters
 * button. filter_results finds them by their names: the stops radio it sets (named `stops`, valued like its
 * parameter, so the cursor ticks it), an airline's checkbox, or on a phone the Filters button.
 *
 * The controls are native radios and checkboxes (styled, not replaced): the cursor writes native controls only. The
 * sheet is non-modal in the top-layer sense (`useSheet`: a portal, the page behind it `inert`).
 */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import { useId } from "react";
import { createPortal } from "react-dom";
import { useMediaQuery } from "../hooks/use-media-query";
import type { FiltersView } from "../hooks/use-results";
import { useSheet } from "../hooks/use-sheet";

const option =
  "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50";
const box = "size-4 shrink-0 accent-primary";
const count = "ml-auto text-xs text-muted-foreground tabular-nums";
const legend = "mb-1 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase";

function FiltersPanel({ filters }: { filters: FiltersView }) {
  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className={legend}>Stops</legend>
        {filters.stops.map((s) => (
          <label key={s.label} className={option}>
            <input
              type="radio"
              name="stops"
              value={s.param}
              className={box}
              checked={s.checked}
              onChange={() => filters.setStops(s.value)}
            />
            <span>{s.label}</span>
            <span className={count}>{s.count}</span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className={legend}>Airlines</legend>
        {filters.airlines.map((a) => (
          <label key={a.code} className={option}>
            <input type="checkbox" className={box} checked={a.checked} onChange={(e) => filters.toggleAirline(a.code, e.target.checked)} />
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: a.color }} aria-hidden="true" />
            <span>{a.name}</span>
            <span className={count}>{a.count}</span>
          </label>
        ))}
      </fieldset>

      {filters.active > 0 && (
        <Button type="button" variant="outline" className="w-full" onClick={filters.clear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

export function FiltersSidebar({ filters }: { filters: FiltersView }) {
  const phone = useMediaQuery("(max-width: 899px)");
  const sheet = useSheet();
  const titleId = useId();

  if (!phone) {
    return (
      <aside
        aria-label="Filters"
        className="sticky top-20 flex flex-col gap-3 self-start rounded-xl bg-card p-3 text-card-foreground ring-1 ring-foreground/10"
      >
        <h2 className="px-2 pt-1 text-base font-semibold">Filters</h2>
        <FiltersPanel filters={filters} />
      </aside>
    );
  }

  return (
    <>
      <Button type="button" variant="outline" size="lg" onClick={sheet.show}>
        <SlidersHorizontalIcon />
        Filters{filters.active > 0 && <span className="tabular-nums"> ({filters.active})</span>}
      </Button>
      {sheet.open &&
        createPortal(
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40 animate-in fade-in-0" onClick={sheet.hide} aria-hidden="true" />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-2xl bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom"
            >
              <div className="flex items-center justify-between">
                <h2 id={titleId} className="text-base font-semibold">
                  Filters
                </h2>
                <Button ref={sheet.closeRef} type="button" variant="ghost" size="icon" aria-label="Close filters" onClick={sheet.hide}>
                  <XIcon />
                </Button>
              </div>
              <FiltersPanel filters={filters} />
              <Button type="button" size="lg" className="w-full" onClick={sheet.hide}>
                Show {filters.total ? "results" : "flights"}
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
