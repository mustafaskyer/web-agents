import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { defineWebTool, type WebToolContext } from "./web-tool";

/**
 * Mirrors the shape of Mastra's `createTool` config. Mastra's real type is
 * checked in Phase 5 when `@mastra/client-js` is optionally tried; this mirror
 * documents the contract.
 */
type MastraLikeToolConfig<I, O> = {
  id: string;
  description: string;
  inputSchema?: StandardSchemaV1<unknown, I>;
  outputSchema?: StandardSchemaV1<unknown, O>;
  // biome-ignore lint/suspicious/noExplicitAny: Mastra types its execution context loosely
  execute?: (input: I, context: any) => Promise<O>;
};

describe("WebTool types", () => {
  it("is assignable to a Mastra-style tool config", () => {
    const tool = defineWebTool({ id: "x", description: "d", inputSchema: z.object({ a: z.string() }), execute: async ({ a }) => a.length });
    expectTypeOf(tool).toExtend<MastraLikeToolConfig<{ a: string }, number>>();
  });

  it("infers execute's input from the schema", () => {
    defineWebTool({
      id: "x",
      description: "d",
      inputSchema: z.object({ a: z.string(), n: z.number().optional() }),
      execute: (input, ctx) => {
        expectTypeOf(input).toEqualTypeOf<{ a: string; n?: number | undefined }>();
        expectTypeOf(ctx).toEqualTypeOf<WebToolContext>();
      },
    });
  });
});
