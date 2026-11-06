import { Link } from "react-router";
import styles from "./Breadcrumbs.module.css";

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className={styles.crumbs}>
      <ol>
        {items.map((item) => (
          <li key={item.label}>{item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}
