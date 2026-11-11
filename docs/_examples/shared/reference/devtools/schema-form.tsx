import type { ModelContextToolInfo } from "@webmcp-agents/core";
import {
  defaultValueFor,
  parseSchema,
  SchemaForm,
} from "@webmcp-agents/devtools";
import { useState } from "react";

import { Button } from "@/components/ui/button";

// A runner for one tool: a form from its schema, a Run button.
export function Runner({ tool }: { tool: ModelContextToolInfo }) {
  const schema = parseSchema(tool.inputSchema);
  const [args, setArgs] = useState(() => defaultValueFor(schema));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void window.agent?.invoke(
          tool.name,
          args as Record<string, unknown>,
        );
      }}
    >
      <SchemaForm
        schema={schema}
        value={args}
        onChange={setArgs}
        idPrefix={`run-${tool.name}`}
      />
      <Button type="submit">Run</Button>
    </form>
  );
}
