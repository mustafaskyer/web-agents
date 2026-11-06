import { Link, NavLink } from "react-router";
import styles from "./Header.module.css";
import { PlaneIcon } from "./icons";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link to="/" className={styles.logo}>
          <span className={styles.glyph} aria-hidden="true">
            <PlaneIcon />
          </span>
          Skyline
        </Link>
        <nav className={styles.nav} aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          <a href="/#routes">Deals</a>
          <a href="/#why">Support</a>
        </nav>
        <Link to="/bookings" className="btn outline">
          My bookings
        </Link>
      </div>
    </header>
  );
}
