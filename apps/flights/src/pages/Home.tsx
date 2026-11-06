import { Link } from "react-router";
import { ClockIcon, HeadsetIcon, PlaneIcon, ShieldIcon, TagIcon } from "../components/icons";
import { airport, cheapest, type FlightQuery, generateFlights, money } from "../data/flights";
import { addDays, formatDate, todayIso } from "../lib/dates";
import { toResultsPath } from "../lib/searchParams";
import { useTitle } from "../lib/useTitle";
import { SearchFlightsForm } from "../tools/SearchFlightsForm";
import styles from "./Home.module.css";

const ROUTES: [string, string][] = [
  ["LHR", "DXB"],
  ["JFK", "CDG"],
  ["SIN", "NRT"],
  ["CAI", "IST"],
  ["SFO", "ICN"],
  ["BER", "BOM"],
  ["GRU", "EZE"],
  ["CPT", "DOH"],
];

const WHY = [
  { icon: <TagIcon />, title: "Fares without surprises", body: "Taxes are in the total before you book." },
  { icon: <ShieldIcon />, title: "Free changes for 24 hours", body: "Changed your mind? Cancel the same day at no cost." },
  { icon: <ClockIcon />, title: "Live seat counts", body: "When a fare is nearly gone, you see it." },
  { icon: <HeadsetIcon />, title: "People, not menus", body: "Support answers in minutes, every day of the year." },
];

export function Home() {
  useTitle("");
  const date = addDays(todayIso(), 14);
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.kicker}>Skyline · a WebMCP demo</p>
          <h1>Book your next adventure</h1>
          <p className={styles.lede}>
            Search 30 airports and 10 airlines, compare fares side by side, and book in a minute. Or ask an agent to do it while you watch.
          </p>
          <div className={styles.ctas}>
            <a href="#search" className="btn primary lg">
              Find a flight
            </a>
            <a href="#routes" className="btn outline lg">
              Featured routes
            </a>
          </div>
        </div>
        <div id="search" className={`card ${styles.searchCard}`}>
          <span className={styles.tab}>
            <PlaneIcon /> Flights
          </span>
          <SearchFlightsForm />
        </div>
      </section>

      <section id="routes" className="page" aria-labelledby="routes-title">
        <h2 id="routes-title" className={styles.sectionTitle}>
          Featured routes
        </h2>
        <p className="muted">Lowest one-way economy fares on {formatDate(date)}.</p>
        <ul className={styles.routes}>
          {ROUTES.map(([from, to]) => {
            const q: FlightQuery = { from, to, trip: "oneway", cabin: "economy", adults: 1, children: 0, infants: 0, date };
            const best = cheapest(generateFlights(q));
            return (
              <li key={`${from}-${to}`}>
                <Link to={toResultsPath(q)} className={`card ${styles.route}`}>
                  <p className={styles.cities}>
                    {airport(from)?.city} <span aria-hidden="true">→</span>
                    <span className="visually-hidden">to</span> {airport(to)?.city}
                  </p>
                  <p className="muted tabular">
                    {from} · {to}
                  </p>
                  {best && (
                    <p className={styles.fare}>
                      from <strong className="tabular">{money(best.price)}</strong>
                    </p>
                  )}
                  {best && best.seatsLeft <= 3 && <span className={styles.scarce}>Only {best.seatsLeft} seats left</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="why" className="page" aria-labelledby="why-title">
        <h2 id="why-title" className={styles.sectionTitle}>
          Why fly with us
        </h2>
        <ul className={styles.why}>
          {WHY.map((w) => (
            <li key={w.title}>
              <span className={styles.whyIcon}>{w.icon}</span>
              <div>
                <p className={styles.whyTitle}>{w.title}</p>
                <p className="muted">{w.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
