"use client";

import { useForm } from "@tanstack/react-form";
import { useWebTool } from "@webmcp-agents/react";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z
    .email()
    .describe("The address to subscribe, e.g. ada@example.com"),
});

type SubscribeInput = z.infer<typeof schema>;

export function Subscribe() {
  const [done, setDone] = useState("");

  const subscribe = ({ email }: SubscribeInput) => {
    setDone(`Subscribed ${email}.`);
    return `Subscribed ${email}.`;
  };

  const form = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => subscribe(value),
  });

  // An agent calls this.
  useWebTool({
    id: "subscribe_newsletter",
    title: "Subscribe",
    description:
      "Subscribe an email address to the newsletter. Use when the " +
      "user asks for news by email.",
    inputSchema: schema,
    execute: subscribe,
  });

  // A person submits this.
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="flex items-end gap-2"
    >
      <form.Field name="email">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Email</Label>
            <Input
              id={field.name}
              // TanStack Form sets no name: the cursor needs one.
              name={field.name}
              type="email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      <Button type="submit">Subscribe</Button>

      {done && <p>{done}</p>}
    </form>
  );
}
