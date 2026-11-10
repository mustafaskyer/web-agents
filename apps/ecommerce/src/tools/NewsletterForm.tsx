/**
 * subscribe_newsletter, on the home page. It hands over the person's email, so `requireConfirmation`: the cursor types
 * the email, ticks the consent box, and parks on Subscribe until the person clicks it.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useWebTool } from "@webmcp-agents/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import styles from "./forms.module.css";

const schema = z.object({
  email: z.email().describe("The email to subscribe, e.g. mustafa@example.com"),
  consent: z.literal(true).describe("The person agrees to receive emails. Must be true."),
});

type NewsletterInput = z.infer<typeof schema>;

export function NewsletterForm() {
  const form = useForm<NewsletterInput>({ resolver: zodResolver(schema) });
  const [subscribed, setSubscribed] = useState<string | null>(null);

  const subscribe = ({ email }: NewsletterInput) => {
    setSubscribed(email);
    form.reset();
    return `Subscribed ${email} to the Field Store newsletter.`;
  };

  // An agent calls this.
  useWebTool({
    id: "subscribe_newsletter",
    title: "Subscribe",
    description:
      "Subscribe an email to the store's newsletter. Only on the home page. Use the email the user gave; ask if you don't have one. The user confirms on the page.",
    inputSchema: schema,
    requireConfirmation: true,
    execute: subscribe,
  });

  // A person submits this.
  return (
    <form className={styles.stack} onSubmit={form.handleSubmit(subscribe)}>
      <div className={styles.inline}>
        <label className="field">
          <span className="visually-hidden">Email</span>
          <input type="email" className="input" placeholder="you@example.com" required autoComplete="email" {...form.register("email")} />
        </label>
        <button type="submit" className="btn primary">
          Subscribe
        </button>
      </div>
      <label className="check">
        <input type="checkbox" required {...form.register("consent")} />
        <span>Send me one email a month. Unsubscribe any time.</span>
      </label>
      <p className={styles.success} role="status">
        {subscribed && `You're subscribed as ${subscribed}.`}
      </p>
    </form>
  );
}
