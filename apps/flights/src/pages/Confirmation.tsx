import { Link, useParams } from "react-router";
import { AirlineBadge } from "../components/AirlineBadge";
import { CheckIcon } from "../components/icons";
import { airline, CABIN_LABEL, durationText, money, stopsText } from "../data/flights";
import { formatDate } from "../lib/dates";
import { routeText, timesText, travelersText } from "../lib/itinerary";
import { useTitle } from "../lib/useTitle";
import { useBooking } from "../store/booking";
import { NotFound } from "./NotFound";
import styles from "./Confirmation.module.css";

export function Confirmation() {
  const { ref = "" } = useParams();
  const b = useBooking().getBooking(ref);
  useTitle(b ? `Booking ${b.ref}` : "Booking not found");
  if (!b) return <NotFound title={`No booking ${ref.toUpperCase()}`} body="Check the reference in your confirmation email." />;
  const { query: q, flight: f } = b;
  return (
    <div className="page">
      <div className={`card ${styles.card}`}>
        <span className={styles.check}>
          <CheckIcon />
        </span>
        <h1>You're booked</h1>
        <p className={styles.ref}>
          Reference <strong className="tabular">{b.ref}</strong>
        </p>
        <p className="muted">E-tickets are on their way to {b.contact.email}.</p>

        <div className={styles.itinerary}>
          <AirlineBadge code={f.airline} />
          <div>
            <p className={styles.strong}>{routeText(q)}</p>
            <p className="muted">
              {airline(f.airline)?.name} {f.flightNo} · {CABIN_LABEL[q.cabin]} · {durationText(f.durationMin)} · {stopsText(f)}
            </p>
            <p className="muted tabular">{timesText(q, f)}</p>
            {q.returnDate && <p className="muted">Return {formatDate(q.returnDate)}</p>}
          </div>
        </div>

        <dl className={styles.facts}>
          <div>
            <dt className="label">Travelers</dt>
            <dd>
              {b.travelers.map((t) => `${t.firstName} ${t.lastName}`).join(", ")}
              <span className="muted"> ({travelersText(q)})</span>
            </dd>
          </div>
          <div>
            <dt className="label">Total paid</dt>
            <dd className="tabular">{money(b.fare.total)}</dd>
          </div>
        </dl>
        <Link to="/" className="btn primary lg">
          Book another trip
        </Link>
      </div>
    </div>
  );
}
