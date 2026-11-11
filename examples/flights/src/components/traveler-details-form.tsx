/**
 * The traveler details form: the contact, then one section per traveler. Its tool, fill_traveler_details, and the
 * TanStack Form behind it live in `useTravelerDetails` (src/webmcp-agents/hooks/use-traveler-details.ts); this renders
 * the fields the cursor types into, each named like the tool's parameter.
 */
import { Badge } from "@webmcp-agents/examples-ui/components/badge";
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Input } from "@webmcp-agents/examples-ui/components/input";
import { Label } from "@webmcp-agents/examples-ui/components/label";
import { CheckCircle2Icon } from "lucide-react";
import { TRAVELER_DETAILS_FORM, type TravelerKind, useTravelerDetails } from "../webmcp-agents/hooks/use-traveler-details";

/** The shadcn Card surface, on a <section> (a named region: one per traveler). */
const section = "flex flex-col gap-4 rounded-xl bg-card p-4 text-sm text-card-foreground ring-1 ring-foreground/10 sm:p-5";
const grid = "grid gap-4 sm:grid-cols-2";

export function TravelerDetailsForm({ kinds }: { kinds: readonly TravelerKind[] }) {
  const { form, today, saved, clearSaved, submit } = useTravelerDetails(kinds);

  /** One labelled field, wired to the form; its `name` is the tool parameter typed into it. */
  const field = (label: string, name: string, type = "text", extra: { autoComplete?: string; max?: string } = {}) => (
    <form.Field name={name}>
      {(f) => (
        <div className="grid gap-2">
          <Label htmlFor={`${TRAVELER_DETAILS_FORM}-${f.name}`}>{label}</Label>
          <Input
            id={`${TRAVELER_DETAILS_FORM}-${f.name}`}
            // TanStack Form sets no name: the cursor needs one.
            name={f.name}
            type={type}
            required
            className="h-10"
            value={f.state.value ?? ""}
            onBlur={f.handleBlur}
            onChange={(e) => f.handleChange(e.target.value)}
            {...extra}
          />
        </div>
      )}
    </form.Field>
  );

  return (
    <form
      id={TRAVELER_DETAILS_FORM}
      className="flex flex-col gap-4"
      // A person submits this.
      onSubmit={submit}
      onChange={clearSaved}
    >
      <section className={section} aria-labelledby="contact-title">
        <div>
          <h2 id="contact-title" className="text-base font-semibold">
            Contact information
          </h2>
          <p className="text-muted-foreground">We send the e-ticket and any schedule changes here.</p>
        </div>
        <div className={grid}>
          {field("First name", "firstName", "text", { autoComplete: "given-name" })}
          {field("Last name", "lastName", "text", { autoComplete: "family-name" })}
          {field("Email", "email", "email", { autoComplete: "email" })}
          {field("Phone", "phone", "tel", { autoComplete: "tel" })}
        </div>
      </section>

      {kinds.map((kind, i) => {
        const n = i + 1;
        return (
          <section key={n} className={section} aria-labelledby={`traveler-${n}`}>
            <h2 id={`traveler-${n}`} className="flex items-center gap-2 text-base font-semibold">
              Traveler {n}
              <Badge variant="secondary">{kind}</Badge>
            </h2>
            <div className={grid}>
              {field("First name", `firstName_${n}`)}
              {field("Last name", `lastName_${n}`)}
              {field("Date of birth", `dob_${n}`, "date", { max: today })}
              {field("Passport or ID number", `document_${n}`)}
            </div>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <p role="status" className="mr-auto flex items-center gap-1.5 text-sm text-muted-foreground">
          {saved && <CheckCircle2Icon className="size-4 text-emerald-600" aria-hidden="true" />}
          {saved}
        </p>
        <Button type="submit" variant="outline" size="lg">
          Save details
        </Button>
      </div>
    </form>
  );
}
