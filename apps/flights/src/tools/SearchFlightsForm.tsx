/**
 * Declarative WebMCP tool: search_flights (home page, and compact on results pages)
 *
 * Searching is read-only, so `toolautosubmit`. Trip and cabin are <select>s so
 * the schema lists their values as enums. The return date is always in the
 * form (hidden for one-way trips): a field that comes and goes would change
 * the tool's schema mid-call, and Chrome cancels a call whose tool changes.
 *
 * The answer summarises the results and names the next tools; the page moves
 * to the results after the agent has it.
 */
import { errorText } from "@web-agents/core";
import { useToolAnswer } from "@web-agents/react";
import { type FormEvent, useId, useState } from "react";
import { useNavigate } from "react-router";
import { Counter } from "../components/Counter";
import { SearchIcon, SwapIcon } from "../components/icons";
import { AIRPORTS, CABIN_LABEL, CABINS, cheapest, describeFlight, type FlightQuery, generateFlights } from "../data/flights";
import { afterAnswer } from "../lib/afterAnswer";
import { addDays, formatDate, todayIso } from "../lib/dates";
import { routeText } from "../lib/itinerary";
import { checkQuery, toResultsPath } from "../lib/searchParams";
import styles from "./SearchFlightsForm.module.css";

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
  const navigate = useNavigate();
  const { answer } = useToolAnswer();
  const today = todayIso();
  const listId = useId();
  const errorId = useId();
  const [trip, setTrip] = useState(initial?.trip ?? "oneway");
  const [from, setFrom] = useState(initial?.from ?? "");
  const [to, setTo] = useState(initial?.to ?? "");
  const [date, setDate] = useState(initial?.date ?? addDays(today, 7));
  const [adults, setAdults] = useState(initial?.adults ?? 1);
  const [children, setChildren] = useState(initial?.children ?? 0);
  const [infants, setInfants] = useState(initial?.infants ?? 0);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const event = e.nativeEvent as SubmitEvent;
    let query: FlightQuery;
    try {
      query = checkQuery(Object.fromEntries(new FormData(e.currentTarget)), today);
    } catch (err) {
      setError(errorText(err));
      answer(event, Promise.resolve(`Error: ${errorText(err)}`));
      return;
    }
    setError(null);
    const result = Promise.resolve(summary(query));
    answer(event, result);
    afterAnswer(event, result, () => void navigate(toResultsPath(query)));
  }

  const clear =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setError(null);
    };

  return (
    <form
      className={styles.form}
      data-compact={compact || undefined}
      toolname="search_flights"
      tooldescription="Step 1 of booking: find flights between two airports on a date, from any page. Airports are 3-letter codes or city names; ask the user for a missing date or destination. Answers how many flights and the cheapest. Next: list_results for ids, or filter_results / sort_results."
      toolautosubmit=""
      onSubmit={onSubmit}
      noValidate
    >
      <div className={styles.top}>
        <label className={styles.inline}>
          <span className="visually-hidden">Trip</span>
          <select
            name="trip"
            className="input"
            value={trip}
            onChange={(e) => clear(setTrip)(e.target.value as typeof trip)}
            toolparamdescription="oneway or roundtrip (default oneway)"
          >
            <option value="oneway">One way</option>
            <option value="roundtrip">Round trip</option>
          </select>
        </label>
        <label className={styles.inline}>
          <span className="visually-hidden">Cabin</span>
          <select
            name="cabin"
            className="input"
            defaultValue={initial?.cabin ?? "economy"}
            toolparamdescription="Cabin class (default economy)"
          >
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
            name="from"
            className="input"
            list={listId}
            required
            autoComplete="off"
            placeholder="City or airport"
            value={from}
            onChange={(e) => clear(setFrom)(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            toolparamdescription="Origin airport, 3-letter code, e.g. LHR"
          />
        </label>
        <button
          type="button"
          className={`icon-btn ${styles.swap}`}
          aria-label="Swap origin and destination"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
        >
          <SwapIcon />
        </button>
        <label className="field">
          <span className="label">To</span>
          <input
            name="to"
            className="input"
            list={listId}
            required
            autoComplete="off"
            placeholder="City or airport"
            value={to}
            onChange={(e) => clear(setTo)(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            toolparamdescription="Destination airport, 3-letter code, e.g. DXB"
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
          <input
            name="date"
            type="date"
            className="input"
            required
            min={today}
            value={date}
            onChange={(e) => clear(setDate)(e.target.value)}
            toolparamdescription={`Departure date, YYYY-MM-DD, today (${today}) or later`}
          />
        </label>
        <label className="field" hidden={trip !== "roundtrip"}>
          <span className="label">Return</span>
          <input
            name="returnDate"
            type="date"
            className="input"
            min={date || today}
            defaultValue={initial?.returnDate}
            toolparamdescription="Return date, YYYY-MM-DD. Round trips only."
          />
        </label>
      </div>

      <fieldset className={styles.travelers}>
        <legend className="label">Travelers</legend>
        <Counter
          name="adults"
          label="Adults"
          hint="12+"
          value={adults}
          min={1}
          max={9}
          onChange={clear(setAdults)}
          paramDescription="Adults, 1–9 (default 1)"
        />
        <Counter
          name="children"
          label="Children"
          hint="2–11"
          value={children}
          min={0}
          max={8}
          onChange={clear(setChildren)}
          paramDescription="Children aged 2–11, 0–8 (default 0)"
        />
        <Counter
          name="infants"
          label="Infants"
          hint="On a lap"
          value={infants}
          min={0}
          max={9}
          onChange={clear(setInfants)}
          paramDescription="Infants under 2 on a lap, at most one per adult (default 0)"
        />
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
