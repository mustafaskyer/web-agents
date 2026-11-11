import {
  toAgentInvokeCode,
  toExecuteToolCode,
} from "@webmcp-agents/devtools";

const args = { quantity: 2 };

// For the console: the devtools' helper.
await navigator.clipboard.writeText(
  toAgentInvokeCode("add_to_cart", args),
);

// For a test or a script: the same call through WebMCP.
console.log(toExecuteToolCode("add_to_cart", args));
