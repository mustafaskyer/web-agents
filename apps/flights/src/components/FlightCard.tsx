import { airline, arrivalDayOffset, CABIN_LABEL, clock, durationText, type Flight, type FlightQuery, money } from "../data/flights";
import { AirlineBadge } from "./AirlineBadge";
import styles from "./FlightCard.module.css";

export function FlightCard({ flight: f, query, onSelect }: { flight: Flight; query: FlightQuery; onSelect(): void }) {
  const name = airline(f.airline)?.name ?? f.airline;
  const offset = arrivalDayOffset(f);
  const stops = f.stops === 0 ? "Direct" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`;
  return (
    <article className={`card ${styles.card}`} data-flight-id={f.id} aria-label={`${name} ${f.flightNo}, ${money(f.price)}`}>
      <div className={styles.carrier}>
        <AirlineBadge code={f.airline} />
        <div>
          <p className={styles.name}>{name}</p>
          <p className={styles.sub}>
            {f.flightNo} · {CABIN_LABEL[f.cabin]}
          </p>
        </div>
      </div>

      <div className={styles.timeline}>
        <div className={styles.end}>
          <p className={`${styles.time} tabular`}>{clock(f.departMin)}</p>
          <p className={styles.sub}>{query.from}</p>
        </div>
        <div className={styles.track}>
          <span className={`${styles.duration} tabular`}>{durationText(f.durationMin)}</span>
          <div className={styles.line} aria-hidden="true">
            {f.stopCodes.map((code, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that may repeat a code
              <span key={i} className={styles.dot} title={code} />
            ))}
          </div>
          <span className={styles.stops} data-direct={f.stops === 0 || undefined}>
            {stops}
            {f.stops > 0 && <span className={styles.via}> · {f.stopCodes.join(", ")}</span>}
          </span>
        </div>
        <div className={styles.end}>
          <p className={`${styles.time} tabular`}>
            {clock(f.departMin + f.durationMin)}
            {offset > 0 && (
              <sup className={styles.offset} title={`Arrives ${offset} day${offset > 1 ? "s" : ""} later`}>
                +{offset}
              </sup>
            )}
          </p>
          <p className={styles.sub}>{query.to}</p>
        </div>
      </div>

      <div className={styles.buy}>
        {f.seatsLeft <= 3 && <p className={styles.scarce}>Only {f.seatsLeft} seats left</p>}
        <p className={`${styles.price} tabular`} data-price={f.price}>
          {money(f.price)}
        </p>
        <p className={styles.sub}>per adult</p>
        <button type="button" className="btn primary" onClick={onSelect} aria-label={`Select ${name} ${f.flightNo}`}>
          Select
        </button>
      </div>
    </article>
  );
}

/** A loading card with the same layout, so nothing jumps when results land. */
export function FlightCardSkeleton() {
  return (
    <div className={`card ${styles.card} ${styles.skeleton}`} aria-hidden="true">
      <div className={styles.carrier}>
        <span className={styles.bone} style={{ width: 40, height: 40, borderRadius: 999 }} />
        <span className={styles.bone} style={{ width: 110 }} />
      </div>
      <div className={styles.timeline}>
        <span className={styles.bone} style={{ width: 64, height: 28 }} />
        <span className={styles.bone} style={{ height: 4 }} />
        <span className={styles.bone} style={{ width: 64, height: 28 }} />
      </div>
      <div className={styles.buy}>
        <span className={styles.bone} style={{ width: 100, height: 24 }} />
        <span className={styles.bone} style={{ width: 96, height: 44, borderRadius: 12 }} />
      </div>
    </div>
  );
}
