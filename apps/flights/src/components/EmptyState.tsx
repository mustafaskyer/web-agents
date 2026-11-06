import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

/** One message, one way forward. */
export function EmptyState({
  title,
  body,
  action,
  as: Heading = "h2",
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className={styles.empty}>
      <Heading>{title}</Heading>
      {body && <p className="muted">{body}</p>}
      {action}
    </div>
  );
}
