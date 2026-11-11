import { useParams } from "react-router";
import type { Booking } from "../store/booking";
import { useBooking } from "./use-booking";

/**
 * The confirmation page: the booking named by the URL's reference.
 *
 * Returns `ref` (as the URL has it, upper-cased), `booking` (undefined when there is none) and `travelerNames`
 * ("Ada Lovelace, Alan Turing").
 */
export function useConfirmation(): { ref: string; booking: Booking | undefined; travelerNames: string } {
  const { ref = "" } = useParams();
  const booking = useBooking().getBooking(ref);
  return {
    ref: ref.toUpperCase(),
    booking,
    travelerNames: booking?.travelers.map((t) => `${t.firstName} ${t.lastName}`).join(", ") ?? "",
  };
}
