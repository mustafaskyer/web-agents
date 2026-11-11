import { buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import { Card, CardContent } from "@webmcp-agents/examples-ui/components/card";
import { Separator } from "@webmcp-agents/examples-ui/components/separator";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { CheckIcon } from "lucide-react";
import { Link } from "react-router";
import { AirlineBadge } from "../components/airline-badge";
import { Page } from "../components/page";
import { CABIN_LABEL, durationText, money, stopsText } from "../data/flights";
import { useConfirmation } from "../hooks/use-confirmation";
import { useTitle } from "../hooks/use-title";
import { formatDate } from "../lib/dates";
import { airlineName, routeText, timesText, travelersText } from "../lib/itinerary";
import { NotFound } from "./not-found";

const term = "text-xs font-medium tracking-wide text-muted-foreground uppercase";

export function Confirmation() {
  const { ref, booking: b, travelerNames } = useConfirmation();
  useTitle(b ? `Booking ${b.ref}` : "Booking not found");
  if (!b) return <NotFound title={`No booking ${ref}`} body="Check the reference in your confirmation email." />;
  const { query: q, flight: f } = b;

  return (
    <Page className="max-w-2xl py-10 sm:py-14">
      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <span className="mb-2 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
            <CheckIcon className="size-7" strokeWidth={2.5} />
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">You're booked</h1>
          <p className="text-base">
            Reference <strong className="font-mono text-lg font-semibold tracking-wider">{b.ref}</strong>
          </p>
          <p className="text-muted-foreground">E-tickets are on their way to {b.contact.email}.</p>
        </CardContent>

        <Separator />

        <CardContent className="flex flex-col gap-5">
          <div className="flex gap-3">
            <AirlineBadge code={f.airline} />
            <div className="flex flex-col gap-0.5">
              <p className="font-medium">{routeText(q)}</p>
              <p className="text-muted-foreground">
                {airlineName(f.airline)} {f.flightNo} · {CABIN_LABEL[q.cabin]} · {durationText(f.durationMin)} · {stopsText(f)}
              </p>
              <p className="text-muted-foreground tabular-nums">{timesText(q, f)}</p>
              {q.returnDate && <p className="text-muted-foreground">Return {formatDate(q.returnDate)}</p>}
            </div>
          </div>

          <dl className="grid gap-4 rounded-lg bg-muted/60 p-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className={term}>Travelers</dt>
              <dd>
                {travelerNames}
                <span className="text-muted-foreground"> ({travelersText(q)})</span>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className={term}>Total paid</dt>
              <dd className="text-lg font-semibold tabular-nums">{money(b.fare.total)}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}>
              Book another trip
            </Link>
            <Link to="/bookings" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5")}>
              My bookings
            </Link>
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}
