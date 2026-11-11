import { useWebTool } from "@webmcp-agents/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ClearCart() {
  const [items, setItems] = useState(["Ocean Tee", "Canvas Tote"]);

  const clear = () => {
    setItems([]);
    return "The cart is empty.";
  };

  // An agent calls this.
  useWebTool({
    id: "clear_cart",
    title: "Clear cart",
    description:
      "Empty the cart. Use when the user asks to start over. " +
      "The user confirms on the page.",
    destructive: true,
    requireConfirmation: true,
    execute: clear,
  });

  // A person clicks this.
  return (
    <div className="flex flex-col items-start gap-3">
      <p>
        {items.length > 0 ? items.join(", ") : "The cart is empty."}
      </p>

      <Button variant="destructive" onClick={clear}>
        Clear cart
      </Button>
    </div>
  );
}
