import { useState } from "react";
import { useNavigate } from "react-router";
import type { Booking } from "../store/booking";
import { useBooking } from "./use-booking";

/**
 * My bookings: the bookings made on this device and the lookup by reference.
 *
 * Returns `bookings` (newest first), `find` (open a reference's confirmation, or set `error`), `error` and
 * `clearError` (the person types again).
 */
export function useMyBookings(): {
  bookings: Booking[];
  find(reference: string): void;
  error: string | null;
  clearError(): void;
} {
  const { bookings, getBooking } = useBooking();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  return {
    bookings: bookings.toReversed(),
    find: (reference) => {
      const ref = reference.trim().toUpperCase();
      if (getBooking(ref)) void navigate(`/bookings/${ref}`);
      else setError(`No booking ${ref || "with that reference"}. References look like SK-7F3K2Q.`);
    },
    error,
    clearError: () => setError(null),
  };
}
