/** The home page's newsletter sign-up: email, consent and Subscribe (subscribe_newsletter, `useSubscribeNewsletter`). */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@webmcp-agents/examples-ui/components/form";
import { Input } from "@webmcp-agents/examples-ui/components/input";
import { useSubscribeNewsletter } from "../webmcp-agents/hooks/use-subscribe-newsletter";

export function NewsletterForm() {
  const { form, subscribed, submit } = useSubscribeNewsletter();

  return (
    <Form {...form}>
      {/* A person submits this. */}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="h-10 bg-background"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" className="h-10 px-5">
            Subscribe
          </Button>
        </div>

        {/* a native checkbox: the cursor writes native controls */}
        <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <input type="checkbox" required className="size-4 accent-foreground" {...form.register("consent")} />
          Send me one email a month. Unsubscribe any time.
        </label>

        <p role="status" className="text-sm font-medium empty:hidden">
          {subscribed && `You're subscribed as ${subscribed}.`}
        </p>
      </form>
    </Form>
  );
}
