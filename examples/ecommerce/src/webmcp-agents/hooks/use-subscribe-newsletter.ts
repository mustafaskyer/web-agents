/**
 * subscribe_newsletter, on the home page. It hands over the person's email, so `requireConfirmation`: the cursor types
 * the email, ticks the consent box, and parks on Subscribe until the person clicks it. The consent box is a native
 * checkbox: the cursor writes native controls.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useWebTool } from "@webmcp-agents/react";
import { type BaseSyntheticEvent, useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  email: z.email().describe("The email to subscribe, e.g. mustafa@example.com"),
  consent: z.literal(true).describe("The person agrees to receive emails. Must be true."),
});

export type NewsletterInput = z.infer<typeof schema>;

export interface SubscribeNewsletter {
  form: UseFormReturn<NewsletterInput>;
  /** The email just subscribed, for the confirmation line; null until then. */
  subscribed: string | null;
  /** The form's onSubmit. */
  submit(e?: BaseSyntheticEvent): Promise<unknown>;
}

/** The newsletter form: one `subscribe` for the agent's confirmed call and the person's submit. */
export function useSubscribeNewsletter(): SubscribeNewsletter {
  const form = useForm<NewsletterInput>({ resolver: zodResolver(schema) });
  const [subscribed, setSubscribed] = useState<string | null>(null);

  const subscribe = ({ email }: NewsletterInput) => {
    setSubscribed(email);
    form.reset();
    return `Subscribed ${email} to the Field Store newsletter.`;
  };

  // An agent calls this. It runs on the person's click.
  useWebTool({
    id: "subscribe_newsletter",
    title: "Subscribe",
    description:
      "Subscribe an email to the store's newsletter. Only on the home page. Use the email the user gave; ask if you don't have one. The user confirms on the page.",
    inputSchema: schema,
    requireConfirmation: true,
    execute: subscribe,
  });

  return {
    form,
    subscribed,
    submit: form.handleSubmit(subscribe),
  };
}
