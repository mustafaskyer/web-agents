import "@webmcp-agents/react"; // brings the attribute types in

// A declarative form (the earlier form): the browser registers it as
// a tool. Cheap and reversible, so `toolautosubmit`.
export function SubscribeForm() {
  return (
    <form
      toolname="subscribe"
      tooldescription="Subscribe an email to the newsletter."
      toolautosubmit=""
      onSubmit={(event) => event.preventDefault()}
    >
      <input
        name="email"
        type="email"
        required
        toolparamdescription="The address, e.g. ana@example.com"
      />
      <button type="submit">Subscribe</button>
    </form>
  );
}
