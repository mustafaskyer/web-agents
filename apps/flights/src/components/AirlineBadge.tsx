import { airline } from "../data/flights";
import styles from "./AirlineBadge.module.css";

/** A monogram in the airline's colour: fictional airlines, no logos. */
export function AirlineBadge({ code, size = 40 }: { code: string; size?: number }) {
  const a = airline(code);
  return (
    <span className={styles.badge} style={{ background: a?.color, width: size, height: size }} aria-hidden="true">
      {code}
    </span>
  );
}
