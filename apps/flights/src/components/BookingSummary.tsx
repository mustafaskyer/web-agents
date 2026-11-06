import {
  airline,
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
import { routeText, timesText, travelersText } from "../lib/itinerary";
import { AirlineBadge } from "./AirlineBadge";
import styles from "./BookingSummary.module.css";
import { BagIcon } from "./icons";

export function BookingSummary({ query: q, flight: f, fare }: { query: FlightQuery; flight: Flight; fare: Fare }) {
  return (
    <aside className={`card ${styles.summary}`} aria-labelledby="summary-title">
      <h2 id="summary-title">Your trip</h2>
      <div className={styles.flight}>
        <AirlineBadge code={f.airline} size={36} />
        <div>
          <p className={styles.strong}>{routeText(q)}</p>
          <p className="muted">
            {airline(f.airline)?.name} {f.flightNo} · {CABIN_LABEL[f.cabin]}
          </p>
          <p className="muted tabular">{timesText(q, f)}</p>
          <p className="muted">
            {durationText(f.durationMin)} · {stopsText(f)}
          </p>
          {q.returnDate && <p className="muted">Return {formatDate(q.returnDate)}</p>}
        </div>
      </div>

      <section>
        <h3 className="label">Travelers</h3>
        <p>{travelersText(q)}</p>
      </section>

      <section>
        <h3 className="label">Baggage allowance</h3>
        <p className={styles.bag}>
          <BagIcon /> 1 cabin bag (8 kg){q.cabin === "economy" ? "" : " + 2 checked bags (23 kg)"}
        </p>
      </section>

      <section>
        <h3 className="label">Price details</h3>
        <dl className={styles.prices}>
          <div>
            <dt>
              Fare × {fare.seats} seat{fare.seats === 1 ? "" : "s"}
            </dt>
            <dd className="tabular">{money(f.price * fare.seats)}</dd>
          </div>
          {q.infants > 0 && (
            <div>
              <dt>
                Infants × {q.infants} ({INFANT_RATE * 100}%)
              </dt>
              <dd className="tabular">{money(fare.base - f.price * fare.seats)}</dd>
            </div>
          )}
          <div>
            <dt>Taxes and fees ({TAX_RATE * 100}%)</dt>
            <dd className="tabular">{money(fare.taxes)}</dd>
          </div>
          <div className={styles.total}>
            <dt>Total</dt>
            <dd className="tabular">{money(fare.total)}</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
