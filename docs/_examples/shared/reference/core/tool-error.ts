import {
  type ModelContextToolResult,
  RETRYABLE,
  toolError,
  toolErrorCode,
} from "@webmcp-agents/core";

const result = toolError(
  "unavailable",
  'No tool "place_order" on this page. Go to /checkout first.',
);

toolErrorCode(result); // "unavailable"
RETRYABLE.unavailable; // true: go to /checkout, then call again

// Text from a declarative form can't set isError, so it is coded text.
const fromForm: ModelContextToolResult = {
  content: [
    { type: "text", text: "Error [needs_user]: Ask which size." },
  ],
};
toolErrorCode(fromForm); // "needs_user"
