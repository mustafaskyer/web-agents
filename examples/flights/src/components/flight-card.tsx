import { Badge } from "@webmcp-agents/examples-ui/components/badge";
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Skeleton } from "@webmcp-agents/examples-ui/components/skeleton";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { arrivalDayOffset, CABIN_LABEL, clock, durationText, type Flight, type FlightQuery, money } from "../data/flights";
import { airlineName } from "../lib/itinerary";
import { AirlineBadge } from "./airline-badge";

/** The shadcn Card surface, on an <article> (one per flight). */
const cardGrid =
  "rounded-xl bg-card text-sm text-card-foreground ring-1 ring-foreground/10 grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(10rem,13rem)_1fr_9.5rem] md:items-center md:gap-6";

/**
 * One flight. Its Select button is named "Select <airline> <flight no>", so select_flight's `target` finds this
 * flight's button and no other; `data-flight-id` and `data-price` are for the e2e tests.
 */
export function FlightCard({ flight: f, query, onSelect }: { flight: Flight; query: FlightQuery; onSelect(): void }) {
  const name = airlineName(f.airline);
  const offset = arrivalDayOffset(f);
  const stops = f.stops === 0 ? "Direct" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`;

  return (
    <article
      className={cn(cardGrid, "transition-shadow hover:ring-foreground/20 hover:shadow-md")}
      data-flight-id={f.id}
      aria-label={`${name} ${f.flightNo}, ${money(f.price)}`}
    >
      <div className="flex items-center gap-3">
        <AirlineBadge code={f.airline} />
        <div className="min-w-0">
          <p className="truncate font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">
            {f.flightNo} · {CABIN_LABEL[f.cabin]}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <div>
          <p className="text-xl font-semibold tabular-nums">{clock(f.departMin)}</p>
          <p className="text-xs font-medium text-muted-foreground">{query.from}</p>
        </div>

        <div className="flex flex-col items-center gap-1 text-xs">
          <span className="text-muted-foreground tabular-nums">{durationText(f.durationMin)}</span>
          <div className="flex h-px w-full items-center justify-evenly bg-border" aria-hidden="true">
            {f.stopCodes.map((code, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that may repeat a code
              <span key={i} className="size-2 rounded-full border-2 border-background bg-muted-foreground" title={code} />
            ))}
          </div>
          <span
            className={cn("font-medium", f.stops === 0 ? "text-emerald-600" : "text-amber-700")}
            data-direct={f.stops === 0 || undefined}
          >
            {stops}
            {f.stops > 0 && <span className="font-normal text-muted-foreground"> · {f.stopCodes.join(", ")}</span>}
          </span>
        </div>

        <div className="text-right">
          <p className="text-xl font-semibold tabular-nums">
            {clock(f.departMin + f.durationMin)}
            {offset > 0 && (
              <sup className="ml-0.5 text-xs font-medium text-amber-700" title={`Arrives ${offset} day${offset > 1 ? "s" : ""} later`}>
                +{offset}
              </sup>
            )}
          </p>
          <p className="text-xs font-medium text-muted-foreground">{query.to}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4 md:flex-col md:items-end md:border-t-0 md:border-l md:pt-0 md:pl-6">
        <div className="md:text-right">
          {f.seatsLeft <= 3 && (
            <Badge variant="destructive" className="mb-1">
              Only {f.seatsLeft} {f.seatsLeft === 1 ? "seat" : "seats"} left
            </Badge>
          )}
          <p className="text-2xl font-semibold tabular-nums" data-price={f.price}>
            {money(f.price)}
          </p>
          <p className="text-xs text-muted-foreground">per adult</p>
        </div>
        <Button type="button" size="lg" className="px-5" onClick={onSelect} aria-label={`Select ${name} ${f.flightNo}`}>
          Select
        </Button>
      </div>
    </article>
  );
}

/** A loading card with the same layout, so nothing jumps when results land. */
export function FlightCardSkeleton() {
  return (
    <div className={cardGrid} aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-1 w-full" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}
