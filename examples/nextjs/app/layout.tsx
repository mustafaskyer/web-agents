import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@webmcp-agents/core/cursor.css";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Field Store · Next.js",
  description: "A store where every action is a WebMCP tool, on the Next.js App Router, with a shadcn/ui chat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
