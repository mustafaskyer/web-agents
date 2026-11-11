/**
 * fill_traveler_details, on the booking page: a form built on TanStack Form, to show that any form library works
 * (Tools with input, "TanStack Form"). The schema is the tool's input and the form's validator alike; the cursor types
 * each value into the field named like its parameter (`firstName`, `email`, `firstName_1`, `dob_2`, …: the fields are
 * named per traveler), presses "Save details", and `save` runs. TanStack Form hears the typing like a person's.
 *
 * Saving details is reversible, so there is nothing to confirm. The number of travelers comes from the search, which
 * is fixed on this page, so the tool's schema never changes while a call is in flight.
 */
import { useForm } from "@tanstack/react-form";
import { useWebTool } from "@webmcp-agents/react";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { useBooking } from "../../hooks/use-booking";
import { todayIso } from "../../lib/dates";
import { booking, type Contact, type Traveler, type TravelerKind } from "../../store/booking";

export type { TravelerKind };

/** Field values by field name (`firstName`, `dob_2`): the form's, or an agent's call. */
type Details = Record<string, string | undefined>;

/** The id of the traveler details <form>: book_flight saves what is typed there before it books. */
export const TRAVELER_DETAILS_FORM = "traveler-details";

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

/**
 * The traveler details form (TanStack Form) and its tool, for travelers of these `kinds`, seeded from the store.
 *
 * Returns `form` (TanStack Form: `form.Field` per input), `today` (the latest date of birth), `saved` (the last save's
 * sentence, for the status line), `clearSaved` (the person edits again) and `submit` for the form's `onSubmit`.
 */
export function useTravelerDetails(kinds: readonly TravelerKind[]) {
  const { contact, travelers } = useBooking();
  const [schema] = useState(() => schemaFor(kinds));
  const [saved, setSaved] = useState<string | null>(null);

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

  return {
    form,
    today: todayIso(),
    saved,
    clearSaved: () => setSaved(null),
    submit: (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      void form.handleSubmit();
    },
  };
}
