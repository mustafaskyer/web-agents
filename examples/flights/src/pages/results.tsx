import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Card } from "@webmcp-agents/examples-ui/components/card";
import { SearchXIcon } from "lucide-react";
import { EmptyState } from "../components/empty-state";
import { FiltersSidebar } from "../components/filters-sidebar";
import { FlightCard, FlightCardSkeleton } from "../components/flight-card";
import { Page } from "../components/page";
import { SearchFlightsForm } from "../components/search-flights-form";
import { SortBar } from "../components/sort-bar";
import { CABIN_LABEL } from "../data/flights";
import { useResults } from "../hooks/use-results";
import { useTitle } from "../hooks/use-title";
import { formatDate } from "../lib/dates";
import { travelersText } from "../lib/itinerary";

export function Results() {
  const { query: q, key, from, to, ready, total, visible, sort, setSort, filters, select } = useResults();
  useTitle(`${from} → ${to}`);

  return (
    <Page className="flex flex-col gap-6 py-6 sm:py-8">
      <Card className="[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(5)]">
        <div className="px-(--card-spacing)">
          {/* keyed: Back / a new search re-seeds the fields from the URL */}
          <SearchFlightsForm key={key} initial={q} compact />
        </div>
      </Card>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {from} <span aria-hidden="true">→</span>
          <span className="sr-only">to</span> {to}
        </h1>
        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {ready ? `${visible.length} of ${total} flights` : "Searching…"} · {formatDate(q.date, { year: false })}
          {q.returnDate && ` – ${formatDate(q.returnDate, { year: false })}`} · {travelersText(q)} · {CABIN_LABEL[q.cabin]}
        </p>
      </div>

      <div className="grid gap-4 min-[900px]:grid-cols-[15rem_minmax(0,1fr)] min-[900px]:gap-6">
        <div className="flex gap-2 min-[900px]:contents">
          <FiltersSidebar filters={filters} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <SortBar value={sort} onChange={setSort} />
          <div className="flex flex-col gap-3" aria-busy={!ready}>
            {!ready ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: identical placeholders
              Array.from({ length: 4 }, (_, i) => <FlightCardSkeleton key={i} />)
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<SearchXIcon />}
                title="No flights match these filters"
                body={`${total} flights are hidden by the stops or airline filters.`}
                action={
                  <Button type="button" onClick={filters.clear}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              visible.map((f) => <FlightCard key={f.id} flight={f} query={q} onSelect={() => select(f)} />)
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
