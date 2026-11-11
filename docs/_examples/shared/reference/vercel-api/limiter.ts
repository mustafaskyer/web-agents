import { createLimiter } from "@webmcp-agents/vercel-api";

const perMinute = createLimiter({
  env: process.env,
  prefix: "playground:minute",
  limit: 30,
  window: "1 m",
  failOpen: true,
});

export async function check(ip: string): Promise<void> {
  const result = await perMinute.limit(ip);
  if (!result.success) {
    const seconds = Math.ceil((result.reset - Date.now()) / 1000);
    console.log(`retry in ${seconds} s`);
  }
}
