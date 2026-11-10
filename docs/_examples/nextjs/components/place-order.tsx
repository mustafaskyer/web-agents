"use client";

import { useWebTool } from "@webmcp-agents/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cart } from "@/lib/cart";

export function PlaceOrder() {
  const [placed, setPlaced] = useState("");
  const total = `$${cart.total().toFixed(2)}`;

  const place = () => {
    const id = `FS-${Date.now().toString(36).toUpperCase()}`;
    setPlaced(`Order ${id} placed.`);
    return `Order ${id} placed, ${total}.`;
  };

  // An agent calls this. It runs on the person's click.
  useWebTool({
    id: "place_order",
    title: "Place order",
    description:
      "Place the order for what is in the cart. Use when the user " +
      "says to buy. Read the cart with get_cart first. The user " +
      "confirms on the page.",
    requireConfirmation: true,
    external: true,
    execute: place,
  });

  // A person clicks this. Its name starts with the tool's title.
  return (
    <div className="flex flex-col items-start gap-3">
      <Button onClick={place}>Place order · {total}</Button>

      {placed && <p>{placed}</p>}
    </div>
  );
}
