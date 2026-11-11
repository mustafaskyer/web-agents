import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Input } from "@webmcp-agents/examples-ui/components/input";
import { Label } from "@webmcp-agents/examples-ui/components/label";
import { ChevronRightIcon, TicketIcon } from "lucide-react";
import { type FormEvent, useId } from "react";
import { Link } from "react-router";
import { AirlineBadge } from "../components/airline-badge";
import { EmptyState } from "../components/empty-state";
import { Page } from "../components/page";
import { money } from "../data/flights";
import { useMyBookings } from "../hooks/use-my-bookings";
import { useTitle } from "../hooks/use-title";
import { formatDate } from "../lib/dates";
import { routeText } from "../lib/itinerary";

export function MyBookings() {
  const { bookings, find, error, clearError } = useMyBookings();
  const errorId = useId();
  useTitle("My bookings");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    find(String(new FormData(e.currentTarget).get("reference") ?? ""));
  }

  return (
    <Page className="flex max-w-3xl flex-col gap-6 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My bookings</h1>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-end sm:p-5"
      >
        <div className="grid flex-1 gap-2">
          <Label htmlFor="booking-reference">Booking reference</Label>
          <Input
            id="booking-reference"
            name="reference"
            placeholder="SK-7F3K2Q"
            required
            autoComplete="off"
            spellCheck={false}
            className="h-10 font-mono uppercase placeholder:normal-case"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={clearError}
          />
        </div>
        <Button type="submit" size="lg" className="h-10 px-5">
          Find booking
        </Button>
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive sm:basis-full">
            {error}
          </p>
        )}
      </form>

      {bookings.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {bookings.map((b) => (
            <li key={b.ref}>
              <Link
                to={`/bookings/${b.ref}`}
                className="group flex items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <AirlineBadge code={b.flight.airline} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium">{routeText(b.query)}</span>
                  <span className="text-sm text-muted-foreground">
                    <span className="font-mono">{b.ref}</span> · {formatDate(b.query.date)}
                  </span>
                </div>
                <span className="font-semibold tabular-nums">{money(b.fare.total)}</span>
                <ChevronRightIcon className="size-4 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<TicketIcon />} title="No bookings yet" body="Bookings you make on this device show up here." />
      )}
    </Page>
  );
}
