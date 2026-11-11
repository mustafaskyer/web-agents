import { useSyncExternalStore } from "react";
import { type BookingApi, snapshot, subscribe } from "../store/booking";

/**
 * The booking store in React: the search, the results as the page shows them, the selection and the bookings,
 * re-rendering on every change. The store itself stays React-free (tools and the server import it).
 */
export function useBooking(): BookingApi {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
