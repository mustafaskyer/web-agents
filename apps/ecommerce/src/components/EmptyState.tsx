import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

/** One message, one way forward. */
export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <h2>{title}</h2>
      {body && <p className="muted">{body}</p>}
      {action}
    </div>
  );
}
