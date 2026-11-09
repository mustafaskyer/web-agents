/**
 * Declarative WebMCP tool: fill_traveler_details (booking page)
 *
 * Saving details is reversible, so `toolautosubmit`. Fields are named per
 * traveler (`firstName_1`, `lastName_2`, …). Their number comes from the
 * search, which is fixed on this page, so the tool's schema never changes
 * while a call is in flight.
 */
import { useToolAnswer } from "@webmcp-agents/react";
import { type FormEvent, useState } from "react";
import { todayIso } from "../lib/dates";
import { type Contact, type Traveler, type TravelerKind, useBooking } from "../store/booking";
import styles from "./bookingForms.module.css";

export function TravelerDetailsForm({ kinds }: { kinds: TravelerKind[] }) {
  const booking = useBooking();
  const { answer } = useToolAnswer();
  const [saved, setSaved] = useState<string | null>(null);
  const contact = booking.contact;
  const today = todayIso();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (name: string): string => String(data.get(name) ?? "").trim();
    const next: Contact = { firstName: get("firstName"), lastName: get("lastName"), email: get("email"), phone: get("phone") };
    const travelers: Traveler[] = kinds.map((_, i) => ({
      firstName: get(`firstName_${i + 1}`),
      lastName: get(`lastName_${i + 1}`),
      dob: get(`dob_${i + 1}`),
      document: get(`document_${i + 1}`),
    }));
    const message = booking.saveDetails(next, travelers);
    setSaved(message);
    answer(e.nativeEvent as SubmitEvent, Promise.resolve(message));
  }

  return (
    <form
      id="traveler-details"
      className={styles.stack}
      toolname="fill_traveler_details"
      tooldescription={`Fill in the contact person and ${kinds.length} traveler${kinds.length === 1 ? "" : "s"} as on their passports. Only on the booking page (select_flight first). Ask the user for details you don't have; never invent them. Fields end in _1, _2, … per traveler. Next: book_flight.`}
      toolautosubmit=""
      onSubmit={onSubmit}
      onChange={() => setSaved(null)}
    >
      <section className={`card ${styles.section}`} aria-labelledby="contact-title">
        <h2 id="contact-title">Contact information</h2>
        <p className="muted">We send the e-ticket and any schedule changes here.</p>
        <div className={styles.grid}>
          <Field
            label="First name"
            name="firstName"
            defaultValue={contact.firstName}
            autoComplete="given-name"
            param="Contact's first name"
          />
          <Field label="Last name" name="lastName" defaultValue={contact.lastName} autoComplete="family-name" param="Contact's last name" />
          <Field
            label="Email"
            name="email"
            type="email"
            defaultValue={contact.email}
            autoComplete="email"
            param="Contact email for the e-ticket"
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            defaultValue={contact.phone}
            autoComplete="tel"
            param="Contact phone with country code, e.g. +44 20 7946 0000"
          />
        </div>
      </section>

      {kinds.map((kind, i) => {
        const t = booking.travelers[i];
        const n = i + 1;
        return (
          <section key={n} className={`card ${styles.section}`} aria-labelledby={`traveler-${n}`}>
            <h2 id={`traveler-${n}`}>
              Traveler {n} <span className="muted">· {kind}</span>
            </h2>
            <div className={styles.grid}>
              <Field
                label="First name"
                name={`firstName_${n}`}
                defaultValue={t?.firstName}
                param={`Traveler ${n} (${kind.toLowerCase()}) first name`}
              />
              <Field label="Last name" name={`lastName_${n}`} defaultValue={t?.lastName} param={`Traveler ${n} last name`} />
              <Field
                label="Date of birth"
                name={`dob_${n}`}
                type="date"
                max={today}
                defaultValue={t?.dob}
                param={`Traveler ${n} date of birth, YYYY-MM-DD`}
              />
              <Field
                label="Passport or ID number"
                name={`document_${n}`}
                defaultValue={t?.document}
                param={`Traveler ${n} passport or ID number`}
              />
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

function Field({
  label,
  name,
  param,
  type = "text",
  ...rest
}: {
  label: string;
  name: string;
  param: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  max?: string;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input name={name} type={type} className="input" required toolparamdescription={param} {...rest} />
    </label>
  );
}
