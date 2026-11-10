import { chatRequestSchema, LIMITS } from "@webmcp-agents/chat/server";

// A handler of your own: validate the POST body first.
export async function POST(req: Request): Promise<Response> {
  const parsed = chatRequestSchema.safeParse(await req.json());

  if (!parsed.success) {
    return Response.json(
      {
        error: "bad_request",
        issues: parsed.error.issues.slice(0, 10),
      },
      { status: 400 },
    );
  }

  const { messages, tools, agent } = parsed.data;
  console.log(
    `${messages.length}/${LIMITS.messages} messages,`,
    `${tools.length}/${LIMITS.tools} tools, agent: ${agent ?? "none"}`,
  );
  return Response.json({ ok: true });
}
