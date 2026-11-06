/**
 * Declarative WebMCP tool: subscribe_newsletter (mounted on the home page)
 *
 * It hands over the person's email, so no `toolautosubmit`: the agent fills it
 * in, and the browser waits for the person to click Subscribe.
 */
import { useToolAnswer } from "@web-agents/react";
import { type FormEvent, useState } from "react";
import styles from "./forms.module.css";

export function NewsletterForm() {
  const { answer } = useToolAnswer();
  const [subscribed, setSubscribed] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email"));
    setSubscribed(email);
    form.reset();
    answer(e.nativeEvent as SubmitEvent, Promise.resolve(`Subscribed ${email} to the Field Store newsletter.`));
  }

  return (
    <form
      className={styles.stack}
      toolname="subscribe_newsletter"
      tooldescription="Subscribe an email address to the store's newsletter. The user confirms on the page."
      onSubmit={onSubmit}
    >
      <div className={styles.inline}>
        <label className="field">
          <span className="visually-hidden">Email</span>
          <input
            name="email"
            type="email"
            className="input"
            placeholder="you@example.com"
            required
            autoComplete="email"
            toolparamdescription="The email to subscribe, e.g. mustafa@example.com"
          />
        </label>
        <button type="submit" className="btn primary">
          Subscribe
        </button>
      </div>
      <label className="check">
        <input name="consent" type="checkbox" required toolparamdescription="The person agrees to receive emails. Must be true." />
        <span>Send me one email a month. Unsubscribe any time.</span>
      </label>
      <p className={styles.success} role="status">
        {subscribed && `You're subscribed as ${subscribed}.`}
      </p>
    </form>
  );
}
