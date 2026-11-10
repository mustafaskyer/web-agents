"use client";

import { WebToolError } from "@webmcp-agents/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { tools } from "@/tools";

export function CartSummary() {
  const [summary, setSummary] = useState("");

  const check = async () => {
    try {
      // The call an agent would make, with the same answer.
      const { lines, total } = await tools.getCart.invoke();
      setSummary(`Lines: ${lines.length}, total $${total.toFixed(2)}`);
    } catch (err) {
      // What the agent would have read: a code and a message.
      if (!(err instanceof WebToolError)) throw err;
      setSummary(`${err.code}: ${err.message}`);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={check}>
        Check the cart
      </Button>

      <p>{summary}</p>
    </div>
  );
}
