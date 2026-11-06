import { type FormEvent, useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import { money } from "../data/flights";
import { formatDate } from "../lib/dates";
import { routeText } from "../lib/itinerary";
import { useTitle } from "../lib/useTitle";
import { useBooking } from "../store/booking";
import styles from "./MyBookings.module.css";

export function MyBookings() {
  const { bookings, getBooking } = useBooking();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  useTitle("My bookings");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ref = String(new FormData(e.currentTarget).get("reference") ?? "")
      .trim()
      .toUpperCase();
    if (getBooking(ref)) void navigate(`/bookings/${ref}`);
    else setError(`No booking ${ref || "with that reference"}. References look like SK-7F3K2Q.`);
  }

  return (
    <div className="page">
      <h1 className={styles.title}>My bookings</h1>
      <form className={`card ${styles.lookup}`} onSubmit={onSubmit}>
        <label className="field">
          <span className="label">Booking reference</span>
          <input
            name="reference"
            className="input"
            placeholder="SK-7F3K2Q"
            required
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={() => setError(null)}
          />
        </label>
        <button type="submit" className="btn primary">
          Find booking
        </button>
        {error && (
          <p id={errorId} className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>

      {bookings.length > 0 ? (
        <ul className={styles.list}>
          {bookings.toReversed().map((b) => (
            <li key={b.ref}>
              <Link to={`/bookings/${b.ref}`} className={`card ${styles.item}`}>
                <span className={`${styles.ref} tabular`}>{b.ref}</span>
                <span>{routeText(b.query)}</span>
                <span className="muted">{formatDate(b.query.date)}</span>
                <span className="tabular">{money(b.fare.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`muted ${styles.none}`}>Bookings you make on this device show up here.</p>
      )}
    </div>
  );
}
