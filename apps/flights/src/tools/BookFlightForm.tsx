/**
 * Declarative WebMCP tool: book_flight (booking page)
 *
 * Booking spends money, so there's no `toolautosubmit`: the agent ticks the
 * fare rules, and the browser waits on "Book flight · USD …" until the person
 * clicks it. Missing traveler details are an error for the agent (naming the
 * fields) and focus the first missing field for the person.
 */
import { errorText } from "@webmcp-agents/core";
import { useToolAnswer } from "@webmcp-agents/react";
import { type FormEvent, useId, useState } from "react";
import { useNavigate } from "react-router";
import { money } from "../data/flights";
import { afterAnswer } from "../lib/afterAnswer";
import { useBooking } from "../store/booking";
import styles from "./bookingForms.module.css";

export function BookFlightForm({ total, onBooked }: { total: number; onBooked(): void }) {
  const booking = useBooking();
  const navigate = useNavigate();
  const { answer } = useToolAnswer();
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const event = e.nativeEvent as SubmitEvent;
    const fail = (message: string) => {
      setError(message);
      answer(event, Promise.resolve(`Error: ${message}`));
    };
    if (!new FormData(e.currentTarget).get("acceptTerms")) return fail("Accept the fare rules to book (acceptTerms: true).");

    // A person may type their details and go straight to Book: save them first (an agent saves explicitly).
    if (!event.agentInvoked) document.querySelector<HTMLFormElement>("#traveler-details")?.requestSubmit();
    const missing = booking.missingDetails();
    if (missing.length) {
      document.querySelector<HTMLInputElement>(`#traveler-details [name="${missing[0]}"]`)?.focus();
      return fail(`Missing traveler details: ${missing.join(", ")}. Call fill_traveler_details first, or fill them in and save.`);
    }

    let ref: string;
    try {
      ref = booking.confirm().ref;
    } catch (err) {
      return fail(errorText(err));
    }
    onBooked();
    setError(null);
    const result = Promise.resolve(`Booked ${ref}: ${money(total)} paid. Use get_booking with ${ref} for the itinerary.`);
    answer(event, result);
    afterAnswer(event, result, () => void navigate(`/bookings/${ref}`));
  }

  return (
    <form
      className={styles.stack}
      toolname="book_flight"
      tooldescription="Book and pay for the selected flight. Needs: select_flight, then fill_traveler_details. The user confirms on the page (Book flight)."
      onSubmit={onSubmit}
    >
      <label className="check">
        <input
          name="acceptTerms"
          type="checkbox"
          required
          aria-invalid={error?.startsWith("Accept") ? true : undefined}
          toolparamdescription="The traveler accepts the fare rules. Must be true to book."
        />
        <span>I accept the fare rules: changes cost USD 75, the fare is non-refundable after 24 hours.</span>
      </label>
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn primary lg block" aria-describedby={error ? errorId : undefined}>
        Book flight · <span className="tabular">{money(total)}</span>
      </button>
      <p className="muted" style={{ fontSize: 13, textAlign: "center" }}>
        Demo site: no payment is taken and no ticket is issued.
      </p>
    </form>
  );
}
