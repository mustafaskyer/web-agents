import { tools } from "./tools";

// What /api/chat lets the model see. The catalog's tools are
// pinned: the model gets these descriptions, whatever a request
// says. Tools defined inline in a component go in by id. Any other
// tool a request lists never reaches the model.
export const allowedTools = [
  ...Object.values(tools),
  "add_to_cart",
  "remove_from_cart",
  "clear_cart",
  "place_order",
  "subscribe_newsletter",
];
