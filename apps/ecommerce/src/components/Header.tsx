import { Link, NavLink } from "react-router";
import { allCategories } from "../data/catalog";
import { useCart } from "../store/cart";
import { useUi } from "../store/ui";
import { SearchBox } from "../tools/SearchBox";
import styles from "./Header.module.css";
import { BagIcon, UserIcon } from "./icons";

export function Header() {
  const { count } = useCart();
  const { openCart } = useUi();
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link to="/" className={styles.logo}>
          <span className={styles.glyph} aria-hidden="true" />
          Field Store
        </Link>
        {/* toolname: where the cursor goes when the agent calls browse_category */}
        <nav className={styles.nav} aria-label="Shop" toolname="browse_category">
          <NavLink to="/products" end>
            All products
          </NavLink>
          {allCategories().map((c) => (
            <NavLink key={c.slug} to={`/category/${c.slug}`}>
              {c.name}
            </NavLink>
          ))}
        </nav>
        <div className={styles.actions}>
          <SearchBox />
          <a href="#account" className={`icon-btn ${styles.account}`} aria-label="Account (demo)">
            <UserIcon />
          </a>
          <button
            type="button"
            className={`icon-btn ${styles.cart}`}
            toolname="open_cart"
            onClick={openCart}
            aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
          >
            <BagIcon />
            {count > 0 && (
              <span className={`${styles.badge} tabular`} aria-hidden="true">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
