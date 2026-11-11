import { Card, CardContent, CardHeader } from "@webmcp-agents/examples-ui/components/card";
import { Separator } from "@webmcp-agents/examples-ui/components/separator";
import { BriefcaseIcon, UsersIcon } from "lucide-react";
import {
  CABIN_LABEL,
  durationText,
  type Fare,
  type Flight,
  type FlightQuery,
  INFANT_RATE,
  money,
  stopsText,
  TAX_RATE,
} from "../data/flights";
import { formatDate } from "../lib/dates";
import { airlineName, routeText, timesText, travelersText } from "../lib/itinerary";
import { AirlineBadge } from "./airline-badge";

const heading = "mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase";
const row = "flex justify-between gap-4";

/** The trip being booked, beside the forms: what the person is about to pay for, line by line. */
export function BookingSummary({ query: q, flight: f, fare }: { query: FlightQuery; flight: Flight; fare: Fare }) {
  return (
    <aside aria-labelledby="summary-title" className="lg:sticky lg:top-20 lg:self-start">
      <Card>
        <CardHeader>
          <h2 id="summary-title" className="text-base font-semibold">
            Your trip
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-3">
            <AirlineBadge code={f.airline} className="size-9" />
            <div className="flex flex-col gap-0.5">
              <p className="font-medium">{routeText(q)}</p>
              <p className="text-muted-foreground">
                {airlineName(f.airline)} {f.flightNo} · {CABIN_LABEL[f.cabin]}
              </p>
              <p className="text-muted-foreground tabular-nums">{timesText(q, f)}</p>
              <p className="text-muted-foreground">
                {durationText(f.durationMin)} · {stopsText(f)}
              </p>
              {q.returnDate && <p className="text-muted-foreground">Return {formatDate(q.returnDate)}</p>}
            </div>
          </div>

          <Separator />

          <section>
            <h3 className={heading}>Travelers</h3>
            <p className="flex items-center gap-2">
              <UsersIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              {travelersText(q)}
            </p>
          </section>

          <section>
            <h3 className={heading}>Baggage allowance</h3>
            <p className="flex items-center gap-2">
              <BriefcaseIcon className="size-4 text-muted-foreground" aria-hidden="true" />1 cabin bag (8 kg)
              {q.cabin === "economy" ? "" : " + 2 checked bags (23 kg)"}
            </p>
          </section>

          <Separator />

          <section>
            <h3 className={heading}>Price details</h3>
            <dl className="flex flex-col gap-1.5">
              <div className={row}>
                <dt className="text-muted-foreground">
                  Fare × {fare.seats} seat{fare.seats === 1 ? "" : "s"}
                </dt>
                <dd className="tabular-nums">{money(f.price * fare.seats)}</dd>
              </div>
              {q.infants > 0 && (
                <div className={row}>
                  <dt className="text-muted-foreground">
                    Infants × {q.infants} ({INFANT_RATE * 100}%)
                  </dt>
                  <dd className="tabular-nums">{money(fare.base - f.price * fare.seats)}</dd>
                </div>
              )}
              <div className={row}>
                <dt className="text-muted-foreground">Taxes and fees ({TAX_RATE * 100}%)</dt>
                <dd className="tabular-nums">{money(fare.taxes)}</dd>
              </div>
              <div className={`${row} mt-2 border-t pt-3 text-base font-semibold`}>
                <dt>Total</dt>
                <dd className="tabular-nums">{money(fare.total)}</dd>
              </div>
            </dl>
          </section>
        </CardContent>
      </Card>
    </aside>
  );
}
