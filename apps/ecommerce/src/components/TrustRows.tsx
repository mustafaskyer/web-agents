import { ReturnIcon, SwapIcon, TruckIcon } from "./icons";
import styles from "./TrustRows.module.css";

const ROWS = [
  { icon: <TruckIcon />, title: "Free shipping over $100", body: "Otherwise a flat $8, anywhere." },
  { icon: <SwapIcon />, title: "Free size exchanges", body: "Wrong fit? We send the right one." },
  { icon: <ReturnIcon />, title: "30-day returns", body: "Unworn and unwashed, no questions." },
];

export function TrustRows() {
  return (
    <ul className={styles.rows}>
      {ROWS.map((r) => (
        <li key={r.title}>
          {r.icon}
          <div>
            <p className={styles.title}>{r.title}</p>
            <p className="muted">{r.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
