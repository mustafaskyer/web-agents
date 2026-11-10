/**
 * search_flights, on the home page and (compact) on a results page: a form, so a tool with an input schema. One
 * schema checks the agent's call and the person's submit (React Hook Form's zod resolver); `search` is what both run.
 * When an agent calls it, the cursor types each value into the field named like its parameter (the trip and cabin
 * selects, From, To, Depart, the traveler counters), presses "Search flights", and the results page opens.
 *
 * Searching only reads, so there is nothing to confirm. The return date is always in the form (hidden for one-way
 * trips). Airports may be codes or city names, and dates may come copied out of a sentence ("Fri 2026-11-13."):
 * `checkQuery` normalises them, or says what is wrong, to the agent and on the page alike.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { errorText } from "@webmcp-agents/core";
import { useWebTool, WebToolError } from "@webmcp-agents/react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Counter } from "../components/Counter";
import { SearchIcon, SwapIcon } from "../components/icons";
import { AIRPORTS, CABIN_LABEL, CABINS, cheapest, describeFlight, type FlightQuery, generateFlights, TRIPS } from "../data/flights";
import { addDays, formatDate, todayIso } from "../lib/dates";
import { routeText } from "../lib/itinerary";
import { navigate } from "../lib/navigate";
import { checkQuery, toResultsPath } from "../lib/searchParams";
import { booking } from "../store/booking";
import styles from "./SearchFlightsForm.module.css";

const schema = z.object({
  trip: z.enum(TRIPS).optional().describe("oneway or roundtrip (default oneway)"),
  cabin: z.enum(CABINS).optional().describe("Cabin class (default economy)"),
  from: z.string().describe("Origin airport, 3-letter code, e.g. LHR. Not given by the user? Call get_location first"),
  to: z.string().describe("Destination airport, 3-letter code, e.g. DXB"),
  date: z.string().describe("Departure date, YYYY-MM-DD, today or later. A relative date (next Friday)? get_time gives it"),
  returnDate: z.string().optional().describe("Return date, YYYY-MM-DD. Round trips only."),
  adults: z.number().int().optional().describe("Adults, 1–9 (default 1)"),
  children: z.number().int().optional().describe("Children aged 2–11, 0–8 (default 0)"),
  infants: z.number().int().optional().describe("Infants under 2 on a lap, at most one per adult (default 0)"),
});

type SearchInput = z.infer<typeof schema>;

function summary(q: FlightQuery): string {
  const flights = generateFlights(q);
  const best = cheapest(flights);
  const direct = flights.filter((f) => f.stops === 0).length;
  return [
    `Found ${flights.length} flights ${routeText(q)} on ${formatDate(q.date)} (${direct} direct).`,
    best ? `Cheapest: ${describeFlight(best)}.` : "",
    "Next: filter_results, sort_results, list_results or select_flight.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function SearchFlightsForm({ initial, compact = false }: { initial?: FlightQuery; compact?: boolean }) {
  const today = todayIso();
  const listId = useId();
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SearchInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      trip: initial?.trip ?? "oneway",
      cabin: initial?.cabin ?? "economy",
      from: initial?.from ?? "",
      to: initial?.to ?? "",
      date: initial?.date ?? addDays(today, 7),
      returnDate: initial?.returnDate ?? "",
      adults: initial?.adults ?? 1,
      children: initial?.children ?? 0,
      infants: initial?.infants ?? 0,
    },
  });
  const trip = form.watch("trip");
  const date = form.watch("date");

  const search = (input: SearchInput) => {
    let query: FlightQuery;
    try {
      query = checkQuery(input, today);
    } catch (err) {
      setError(errorText(err));
      throw new WebToolError("invalid_input", errorText(err));
    }
    setError(null);
    // the store has the search before the results page renders: the results tools turn on with the URL, at once
    booking.setQuery(query);
    navigate(toResultsPath(query));
    return summary(query);
  };

  // An agent calls this.
  useWebTool({
    id: "search_flights",
    title: "Search flights",
    description:
      "Step 1 of booking: find flights between two airports on a date, from any page. Airports are 3-letter codes or city names; ask the user for a missing date or destination. Answers how many flights and the cheapest. Next: list_results for ids, or filter_results / sort_results.",
    inputSchema: schema,
    readOnly: true,
    execute: search,
  });

  const clear = { onChange: () => setError(null) };
  const counter = (name: "adults" | "children" | "infants", label: string, hint: string, min: number, max: number) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Counter
          name={field.name}
          label={label}
          hint={hint}
          value={field.value ?? min}
          min={min}
          max={max}
          onChange={(v) => {
            field.onChange(v);
            setError(null);
          }}
          onBlur={field.onBlur}
        />
      )}
    />
  );

  // A person submits this.
  return (
    <form
      className={styles.form}
      data-compact={compact || undefined}
      onSubmit={form.handleSubmit((input) => {
        try {
          search(input);
        } catch {
          // shown under the form
        }
      })}
      noValidate
    >
      <div className={styles.top}>
        <label className={styles.inline}>
          <span className="visually-hidden">Trip</span>
          <select className="input" {...form.register("trip", clear)}>
            <option value="oneway">One way</option>
            <option value="roundtrip">Round trip</option>
          </select>
        </label>
        <label className={styles.inline}>
          <span className="visually-hidden">Cabin</span>
          <select className="input" {...form.register("cabin")}>
            {CABINS.map((c) => (
              <option key={c} value={c}>
                {CABIN_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.route}>
        <label className="field">
          <span className="label">From</span>
          <input
            className="input"
            list={listId}
            required
            autoComplete="off"
            placeholder="City or airport"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            {...form.register("from", clear)}
          />
        </label>
        <button
          type="button"
          className={`icon-btn ${styles.swap}`}
          aria-label="Swap origin and destination"
          onClick={() => {
            const { from, to } = form.getValues();
            form.setValue("from", to);
            form.setValue("to", from);
          }}
        >
          <SwapIcon />
        </button>
        <label className="field">
          <span className="label">To</span>
          <input
            className="input"
            list={listId}
            required
            autoComplete="off"
            placeholder="City or airport"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            {...form.register("to", clear)}
          />
        </label>
        <datalist id={listId}>
          {AIRPORTS.map((a) => (
            <option key={a.code} value={a.code}>
              {a.city} — {a.name}
            </option>
          ))}
        </datalist>
      </div>

      <div className={styles.dates}>
        <label className="field">
          <span className="label">Depart</span>
          <input type="date" className="input" required min={today} {...form.register("date", clear)} />
        </label>
        <label className="field" hidden={trip !== "roundtrip"}>
          <span className="label">Return</span>
          <input type="date" className="input" min={date || today} {...form.register("returnDate")} />
        </label>
      </div>

      <fieldset className={styles.travelers}>
        <legend className="label">Travelers</legend>
        {counter("adults", "Adults", "12+", 1, 9)}
        {counter("children", "Children", "2–11", 0, 8)}
        {counter("infants", "Infants", "On a lap", 0, 9)}
      </fieldset>

      {error && (
        <p id={errorId} className={`field-error ${styles.error}`} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={`btn primary lg ${styles.submit}`}>
        <SearchIcon />
        Search flights
      </button>
    </form>
  );
}
