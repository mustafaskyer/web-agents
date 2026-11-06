import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p>
          <strong>Skyline</strong> · a WebMCP demo. Every action on this site is a tool an agent can call.
        </p>
        <p className="muted">Fictional airlines and fares. Nothing here flies.</p>
      </div>
    </footer>
  );
}
