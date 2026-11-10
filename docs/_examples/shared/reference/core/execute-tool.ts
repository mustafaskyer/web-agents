import { executeTool, toolErrorCode } from "@webmcp-agents/core";

const controller = new AbortController();

const result = await executeTool(
  "add_to_cart_mug-01",
  { qty: 3 },
  { signal: controller.signal },
);

if (result === null) {
  console.log("The call navigated the page.");
} else if (result.isError) {
  console.warn(toolErrorCode(result), result.content[0]?.text);
} else {
  console.log(result.content[0]?.text);
}

// A Cancel button would call this: the promise rejects at once.
controller.abort();
