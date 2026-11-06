import styles from "./Footer.module.css";

const COLUMNS = [
  { title: "Shop", links: ["New in", "Best sellers", "Gift cards"] },
  { title: "Support", links: ["Shipping", "Returns", "Contact"] },
  { title: "Legal", links: ["Privacy", "Terms", "Cookies"] },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p className={styles.logo}>Field Store</p>
          <p className="muted">Everyday goods, built to stay. Every action on this site is a tool an agent can call.</p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className={styles.heading}>{c.title}</p>
            <ul>
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#main">{l}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className={styles.small}>
        Demo store. Nothing here ships. Product photos from{" "}
        <a href="https://unsplash.com/?utm_source=web-agents&utm_medium=referral">Unsplash</a>.
      </p>
    </footer>
  );
}
