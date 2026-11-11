/** Node's http request/response ⇄ web Request/Response, for running a fetch-style handler in Vite's dev server. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

/** A web Request for a Node request. `url` is the full original URL (Connect strips the mount path from `req.url`). */
export function toWebRequest(req: IncomingMessage, res: ServerResponse, url: string): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  // The browser went away (Stop, navigation): abort the model call too.
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) controller.abort();
  });
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    signal: controller.signal,
    ...(hasBody && { body: Readable.toWeb(req) as ReadableStream, duplex: "half" }),
  } as RequestInit);
}

/** Write a web Response to a Node response, streaming the body as it arrives. */
export async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key !== "set-cookie") res.setHeader(key, value);
  });
  // one header per cookie (forEach would let the last one win)
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader("set-cookie", cookies);
  if (!response.body) {
    res.end();
    return;
  }
  res.flushHeaders();
  const body = Readable.fromWeb(response.body as import("node:stream/web").ReadableStream);
  await new Promise<void>((resolve, reject) => {
    body.on("error", reject).pipe(res).on("finish", resolve).on("close", resolve);
  });
}
