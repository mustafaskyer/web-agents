import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React's taint APIs: a Server Component can't hand the API key to a client component by accident (lib/env.server.ts)
  experimental: { taint: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
