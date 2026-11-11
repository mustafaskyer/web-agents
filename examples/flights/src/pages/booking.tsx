import { ArrowLeftIcon } from "lucide-react";
import { Navigate } from "react-router";
import { BookFlightForm } from "../components/book-flight-form";
import { BookingSummary } from "../components/booking-summary";
import { Page } from "../components/page";
import { TravelerDetailsForm } from "../components/traveler-details-form";
import { useBookingPage } from "../hooks/use-booking-page";
import { useTitle } from "../hooks/use-title";
import { routeText } from "../lib/itinerary";

export function Booking() {
  const { trip, keep, back } = useBookingPage();
  useTitle("Book your flight");
  if (!trip) return <Navigate to="/" replace />;

  return (
    <Page className="flex flex-col gap-6 py-6 sm:py-8">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          onClick={back}
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Back to results
        </button>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Book your flight</h1>
        <p className="text-muted-foreground">{routeText(trip.query)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <TravelerDetailsForm kinds={trip.kinds} />
          <section
            aria-labelledby="review-title"
            className="flex flex-col gap-4 rounded-xl bg-card p-4 text-sm text-card-foreground ring-1 ring-foreground/10 sm:p-5"
          >
            <h2 id="review-title" className="text-base font-semibold">
              Review and book
            </h2>
            <BookFlightForm total={trip.fare.total} travelers={trip.kinds.length} onBooked={keep} />
          </section>
        </div>
        <BookingSummary query={trip.query} flight={trip.flight} fare={trip.fare} />
      </div>
    </Page>
  );
}
