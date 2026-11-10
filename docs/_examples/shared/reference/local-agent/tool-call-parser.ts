import {
  createProseFilter,
  parseToolCalls,
} from "@webmcp-agents/local-agent";

const names = new Set(["open_product", "search_products"]);

// The model stopped before it closed the tag: the call is repaired.
const result = parseToolCalls(
  'Opening it.<tool_call>{"name": "open_product", ' +
    '"arguments": {"slug": "trail-cap"}}',
  names,
);
console.log(result.text); // "Opening it."
console.log(result.calls); // [{ name: "open_product", arguments: {…} }]
console.log(result.errors); // []

// The streaming half: show the prose, hold back the markup.
const filter = createProseFilter();
console.log(filter.push("Sure <tool_")); // "Sure "
console.log(filter.push('call>{"name":"open_cart"}</tool_call> done'));
// " done"
console.log(filter.flush()); // ""
