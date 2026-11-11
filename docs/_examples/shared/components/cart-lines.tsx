import { useWebTool } from "@webmcp-agents/react";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";

const LINES = [
  { id: "tee", name: "Ocean Tee" },
  { id: "tote", name: "Canvas Tote" },
];

export function CartLines() {
  const [lines, setLines] = useState(LINES);

  const remove = (lineId: string) => {
    const line = lines.find((line) => line.id === lineId);
    if (!line) throw new Error(`No line "${lineId}" in the cart.`);

    setLines(lines.filter((line) => line.id !== lineId));
    return `Removed ${line.name}.`;
  };

  // An agent calls this.
  useWebTool({
    id: "remove_from_cart",
    title: "Remove from cart",
    description:
      "Remove one line from the cart. " +
      `Lines: ${lines.map((line) => line.id).join(", ") || "none"}.`,
    inputSchema: z.object({
      lineId: z
        .string()
        .describe("The id of the line to remove, e.g. tee"),
    }),

    // Which button? The one a screen reader calls "Remove Ocean Tee".
    target: ({ lineId }) => ({
      role: "button",
      name: `Remove ${lines.find((line) => line.id === lineId)?.name}`,
    }),

    execute: ({ lineId }) => remove(lineId),
  });

  // A person clicks these.
  return (
    <ul className="flex flex-col gap-2">
      {lines.map((line) => (
        <li key={line.id} className="flex items-center gap-2">
          {line.name}

          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${line.name}`}
            onClick={() => remove(line.id)}
          >
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  );
}
