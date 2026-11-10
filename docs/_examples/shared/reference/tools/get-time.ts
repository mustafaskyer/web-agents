import { getTime } from "@webmcp-agents/tools";

// Put it in your catalog; the agent calls get_time before it
// passes a relative date on as YYYY-MM-DD.
export const tools = {
  getTime: getTime({
    description:
      "Answer today's date and the dates of tomorrow, this " +
      "weekend and next week. Use before search_flights whenever " +
      "the user says a relative date.",
  }),
};

// Called the way an agent would call it:
export async function tomorrow(): Promise<string> {
  const { structuredContent } = await tools.getTime.invoke();
  return structuredContent.tomorrow.date; // "2026-11-10"
}
