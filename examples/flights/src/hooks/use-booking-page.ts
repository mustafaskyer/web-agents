import { useState } from "react";
import { useNavigate } from "react-router";
import { type Fare, type Flight, type FlightQuery, fareFor } from "../data/flights";
import { type TravelerKind, travelerKinds } from "../store/booking";
import { useBooking } from "./use-booking";

/** The trip on the booking page. */
export interface Trip {
  query: FlightQuery;
  flight: Flight;
  fare: Fare;
  /** One per traveler, in order: "Adult", "Adult", "Child". */
  kinds: TravelerKind[];
}

/**
 * The booking page: the selected flight and its fare. Booking clears the selection, so `keep` holds this trip on the
 * page (no redirect home) until it moves to the confirmation.
 *
 * Returns `trip` (null when nothing is selected: the page goes home), `keep` (book_flight calls it as it books) and
 * `back` (to the results).
 */
export function useBookingPage() {
  const booking = useBooking();
  const navigate = useNavigate();
  const [kept, setKept] = useState<{ query: FlightQuery; flight: Flight } | null>(null);

  const query = kept?.query ?? booking.query;
  const flight = kept?.flight ?? booking.selected;
  const trip: Trip | null = query && flight ? { query, flight, fare: fareFor(query, flight), kinds: travelerKinds(query) } : null;

  return {
    trip,
    keep: () => {
      if (trip) setKept({ query: trip.query, flight: trip.flight });
    },
    back: () => void navigate(-1),
  };
}
