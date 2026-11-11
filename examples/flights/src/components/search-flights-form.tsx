/**
 * The search form, on the home page and (compact) on a results page. Its tool, search_flights, and everything it does
 * live in `useSearchFlights` (src/webmcp-agents/hooks/use-search-flights.ts); this renders the fields the cursor types
 * into, each named like the tool's parameter.
 */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@webmcp-agents/examples-ui/components/form";
import { Input } from "@webmcp-agents/examples-ui/components/input";
import { NativeSelect, NativeSelectOption } from "@webmcp-agents/examples-ui/components/native-select";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { ArrowLeftRightIcon, SearchIcon } from "lucide-react";
import { useId } from "react";
import { CABIN_LABEL, CABINS, type FlightQuery } from "../data/flights";
import { useSearchFlights } from "../webmcp-agents/hooks/use-search-flights";
import { Counter } from "./counter";

const COUNTERS = [
  { name: "adults", label: "Adults", hint: "12+", min: 1, max: 9 },
  { name: "children", label: "Children", hint: "2–11", min: 0, max: 8 },
  { name: "infants", label: "Infants", hint: "On a lap", min: 0, max: 9 },
] as const;

export function SearchFlightsForm({ initial, compact = false }: { initial?: FlightQuery; compact?: boolean }) {
  const { form, today, trip, date, airports, error, swap, submit } = useSearchFlights(initial);
  const airportsId = useId();
  const errorId = useId();
  const invalid = error ? { "aria-invalid": true, "aria-describedby": errorId } : {};

  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-4"
        // A person submits this.
        onSubmit={submit}
      >
        <div className="flex flex-wrap gap-2">
          <FormField
            control={form.control}
            name="trip"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Trip</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <NativeSelectOption value="oneway">One way</NativeSelectOption>
                    <NativeSelectOption value="roundtrip">Round trip</NativeSelectOption>
                  </NativeSelect>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cabin"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Cabin</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    {CABINS.map((c) => (
                      <NativeSelectOption key={c} value={c}>
                        {CABIN_LABEL[c]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className={cn("grid gap-4", compact && "lg:grid-cols-2")}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From</FormLabel>
                  <FormControl>
                    <Input list={airportsId} autoComplete="off" placeholder="City or airport" className="h-10" {...field} {...invalid} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="mb-0.5 rounded-full"
              aria-label="Swap origin and destination"
              onClick={swap}
            >
              <ArrowLeftRightIcon />
            </Button>
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <Input list={airportsId} autoComplete="off" placeholder="City or airport" className="h-10" {...field} {...invalid} />
                  </FormControl>
                </FormItem>
              )}
            />
            <datalist id={airportsId}>
              {airports.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.city} — {a.name}
                </option>
              ))}
            </datalist>
          </div>

          <div className={cn("grid gap-3", trip === "roundtrip" && "grid-cols-2")}>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Depart</FormLabel>
                  <FormControl>
                    <Input type="date" min={today} className="h-10" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="returnDate"
              render={({ field }) => (
                <FormItem hidden={trip !== "roundtrip"}>
                  <FormLabel>Return</FormLabel>
                  <FormControl>
                    <Input type="date" min={date || today} className="h-10" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Travelers</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {COUNTERS.map((c) => (
              <FormField
                key={c.name}
                control={form.control}
                name={c.name}
                render={({ field }) => (
                  <Counter
                    name={field.name}
                    label={c.label}
                    hint={c.hint}
                    value={field.value ?? c.min}
                    min={c.min}
                    max={c.max}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            ))}
          </div>
        </fieldset>

        {error && (
          <p id={errorId} role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className={cn("h-11 text-base", compact ? "self-end px-6" : "w-full")}>
          <SearchIcon />
          Search flights
        </Button>
      </form>
    </Form>
  );
}
