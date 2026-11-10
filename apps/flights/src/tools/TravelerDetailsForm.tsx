/**
 * fill_traveler_details, on the booking page: a form built on TanStack Form, to show that any form library works. The
 * schema is the tool's input and the form's validator alike; the cursor types each value into the field named like its
 * parameter (`firstName`, `email`, `firstName_1`, `dob_2`, …: the fields are named per traveler), presses "Save
 * details", and `save` runs. TanStack Form hears the typing like a person's.
 *
 * Saving details is reversible, so there is nothing to confirm. The number of travelers comes from the search, which
 * is fixed on this page, so the tool's schema never changes while a call is in flight.
 */
import { useForm } from "@tanstack/react-form";
import { useWebTool } from "@webmcp-agents/react";
import { useState } from "react";
import { z } from "zod";
import { todayIso } from "../lib/dates";
import { booking, type Contact, type Traveler, type TravelerKind, useBooking } from "../store/booking";
import styles from "./bookingForms.module.css";

type Details = Record<string, string | undefined>;

/** The tool's input for these travelers: the contact, then each traveler's fields, suffixed _1, _2, … */
function schemaFor(kinds: readonly TravelerKind[]) {
  const text = (description: string) => z.string().optional().describe(description);
  return z.object({
    firstName: text("Contact's first name"),
    lastName: text("Contact's last name"),
    email: text("Contact email for the e-ticket"),
    phone: text("Contact phone with country code, e.g. +44 20 7946 0000"),
    ...Object.fromEntries(
      kinds.flatMap((kind, i) => {
        const n = i + 1;
        return [
          [`firstName_${n}`, text(`Traveler ${n} (${kind.toLowerCase()}) first name`)],
          [`lastName_${n}`, text(`Traveler ${n} last name`)],
          [`dob_${n}`, text(`Traveler ${n} date of birth, YYYY-MM-DD`)],
          [`document_${n}`, text(`Traveler ${n} passport or ID number`)],
        ];
      }),
    ),
  });
}

/** The contact and travelers in a set of field values (the form's, or an agent's call). */
export function detailsFrom(values: Details, count: number): { contact: Contact; travelers: Traveler[] } {
  const get = (name: string): string => String(values[name] ?? "").trim();
  return {
    contact: { firstName: get("firstName"), lastName: get("lastName"), email: get("email"), phone: get("phone") },
    travelers: Array.from({ length: count }, (_, i) => ({
      firstName: get(`firstName_${i + 1}`),
      lastName: get(`lastName_${i + 1}`),
      dob: get(`dob_${i + 1}`),
      document: get(`document_${i + 1}`),
    })),
  };
}

export function TravelerDetailsForm({ kinds }: { kinds: TravelerKind[] }) {
  const { contact, travelers } = useBooking();
  const [schema] = useState(() => schemaFor(kinds));
  const [saved, setSaved] = useState<string | null>(null);
  const today = todayIso();

  const save = (values: Details) => {
    const details = detailsFrom(values, kinds.length);
    const message = booking.saveDetails(details.contact, details.travelers);
    setSaved(message);
    return message;
  };

  const form = useForm({
    defaultValues: {
      ...contact,
      ...Object.fromEntries(
        kinds.flatMap((_, i) => {
          const t = travelers[i];
          const n = i + 1;
          return [
            [`firstName_${n}`, t?.firstName ?? ""],
            [`lastName_${n}`, t?.lastName ?? ""],
            [`dob_${n}`, t?.dob ?? ""],
            [`document_${n}`, t?.document ?? ""],
          ];
        }),
      ),
    } as Details,
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => {
      save(value);
    },
  });

  // An agent calls this.
  useWebTool({
    id: "fill_traveler_details",
    title: "Save details",
    description: `Fill in the contact person and ${kinds.length} traveler${kinds.length === 1 ? "" : "s"} as on their passports. Only on the booking page (select_flight first). Ask the user for details you don't have; never invent them. Fields end in _1, _2, … per traveler. Next: book_flight.`,
    inputSchema: schema,
    execute: save,
  });

  /** One labelled field, wired to the form; its `name` is the tool parameter typed into it. */
  const field = (label: string, name: string, type = "text", extra: { autoComplete?: string; max?: string } = {}) => (
    <form.Field name={name}>
      {(f) => (
        <label className="field">
          <span className="label">{label}</span>
          <input
            name={f.name}
            type={type}
            className="input"
            required
            value={f.state.value ?? ""}
            onBlur={f.handleBlur}
            onChange={(e) => f.handleChange(e.target.value)}
            {...extra}
          />
        </label>
      )}
    </form.Field>
  );

  // A person submits this.
  return (
    <form
      id="traveler-details"
      className={styles.stack}
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      onChange={() => setSaved(null)}
    >
      <section className={`card ${styles.section}`} aria-labelledby="contact-title">
        <h2 id="contact-title">Contact information</h2>
        <p className="muted">We send the e-ticket and any schedule changes here.</p>
        <div className={styles.grid}>
          {field("First name", "firstName", "text", { autoComplete: "given-name" })}
          {field("Last name", "lastName", "text", { autoComplete: "family-name" })}
          {field("Email", "email", "email", { autoComplete: "email" })}
          {field("Phone", "phone", "tel", { autoComplete: "tel" })}
        </div>
      </section>

      {kinds.map((kind, i) => {
        const n = i + 1;
        return (
          <section key={n} className={`card ${styles.section}`} aria-labelledby={`traveler-${n}`}>
            <h2 id={`traveler-${n}`}>
              Traveler {n} <span className="muted">· {kind}</span>
            </h2>
            <div className={styles.grid}>
              {field("First name", `firstName_${n}`)}
              {field("Last name", `lastName_${n}`)}
              {field("Date of birth", `dob_${n}`, "date", { max: today })}
              {field("Passport or ID number", `document_${n}`)}
            </div>
          </section>
        );
      })}

      <div className={styles.saveRow}>
        <p className={styles.saved} role="status">
          {saved}
        </p>
        <button type="submit" className="btn outline">
          Save details
        </button>
      </div>
    </form>
  );
}
