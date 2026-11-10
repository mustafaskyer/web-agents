/**
 * book_flight, on the booking page. Booking spends money, so `requireConfirmation`: the cursor ticks the fare rules
 * (the checkbox named `acceptTerms`), parks on "Book flight · USD …" (found by the tool's title, which the button's text
 * starts with), and the flight is booked only by the person's own click. Missing traveler details are an error for the
 * agent (naming the fields) and focus the first missing field for the person.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { errorText } from "@webmcp-agents/core";
import { useWebTool, WebToolError } from "@webmcp-agents/react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { money } from "../data/flights";
import { navigate } from "../lib/navigate";
import { booking } from "../store/booking";
import styles from "./bookingForms.module.css";
import { detailsFrom } from "./TravelerDetailsForm";

const schema = z.object({
  acceptTerms: z.boolean().describe("The traveler accepts the fare rules. Must be true to book."),
});

type BookInput = z.infer<typeof schema>;

export function BookFlightForm({ total, travelers, onBooked }: { total: number; travelers: number; onBooked(): void }) {
  const form = useForm<BookInput>({ resolver: zodResolver(schema), defaultValues: { acceptTerms: false } });
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const book = ({ acceptTerms }: BookInput) => {
    const fail = (message: string): never => {
      setError(message);
      throw new WebToolError("failed", message);
    };
    if (!acceptTerms) return fail("Accept the fare rules to book (acceptTerms: true).");
    const missing = booking.missingDetails();
    if (missing.length) {
      document.querySelector<HTMLInputElement>(`#traveler-details [name="${missing[0]}"]`)?.focus();
      return fail(`Missing traveler details: ${missing.join(", ")}. Call fill_traveler_details first, or fill them in and save.`);
    }
    let ref = "";
    try {
      ref = booking.confirm().ref;
    } catch (err) {
      fail(errorText(err));
    }
    onBooked(); // the page keeps showing this flight until it moves on
    setError(null);
    navigate(`/bookings/${ref}`);
    return `Booked ${ref}: ${money(total)} paid. Use get_booking with ${ref} for the itinerary.`;
  };

  // An agent calls this.
  useWebTool({
    id: "book_flight",
    title: "Book flight",
    description:
      "Book and pay for the selected flight. Needs: select_flight, then fill_traveler_details. The user confirms on the page (Book flight).",
    inputSchema: schema,
    requireConfirmation: true,
    // the ticked box in the form's state too, before the person confirms
    fill: (values) => form.reset(values),
    execute: book,
  });

  // A person submits this. Details typed but not saved are saved first (an agent saves them explicitly).
  const submit = form.handleSubmit((input) => {
    const details = document.querySelector<HTMLFormElement>("#traveler-details");
    if (details) {
      const saved = detailsFrom(Object.fromEntries(new FormData(details)) as Record<string, string>, travelers);
      booking.saveDetails(saved.contact, saved.travelers);
    }
    try {
      book(input);
    } catch {
      // shown under the button
    }
  });

  return (
    <form className={styles.stack} onSubmit={submit}>
      <label className="check">
        <input
          type="checkbox"
          required
          aria-invalid={error?.startsWith("Accept") ? true : undefined}
          {...form.register("acceptTerms", { onChange: () => setError(null) })}
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
