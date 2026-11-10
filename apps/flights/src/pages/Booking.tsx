import { useState } from "react";
import { Navigate } from "react-router";
import { BookingSummary } from "../components/BookingSummary";
import { fareFor } from "../data/flights";
import { routeText } from "../lib/itinerary";
import { useTitle } from "../lib/useTitle";
import { travelerKinds, useBooking } from "../store/booking";
import { BookFlightForm } from "../tools/BookFlightForm";
import { TravelerDetailsForm } from "../tools/TravelerDetailsForm";
import styles from "./Booking.module.css";

export function Booking() {
  const booking = useBooking();
  // Booking clears the selection: keep showing this flight (no redirect home) until the page moves to the booking.
  const [snapshot, setSnapshot] = useState<{
    query: NonNullable<typeof booking.query>;
    flight: NonNullable<typeof booking.selected>;
  } | null>(null);
  useTitle("Book your flight");
  const query = snapshot?.query ?? booking.query;
  const flight = snapshot?.flight ?? booking.selected;
  if (!query || !flight) return <Navigate to="/" replace />;
  const fare = fareFor(query, flight);
  const kinds = travelerKinds(query);

  return (
    <div className="page">
      <div className={styles.head}>
        <h1>Book your flight</h1>
        <p className="muted">{routeText(query)}</p>
      </div>
      <div className={styles.layout}>
        <div className={styles.main}>
          <TravelerDetailsForm kinds={kinds} />
          <section className={`card ${styles.review}`} aria-labelledby="review-title">
            <h2 id="review-title">Review and book</h2>
            <BookFlightForm total={fare.total} travelers={kinds.length} onBooked={() => setSnapshot({ query, flight })} />
          </section>
        </div>
        <BookingSummary query={query} flight={flight} fare={fare} />
      </div>
    </div>
  );
}
