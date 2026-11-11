import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "..", "apps", "docs", "public", "r");
const source = JSON.parse(readFileSync(join(here, "..", "registry.json"), "utf8")) as {
  items: { name: string; registryDependencies?: string[]; files: { path: string }[] }[];
};

/** shadcn/ui items the blocks depend on (bare names resolve to ui.shadcn.com): kept here so a typo fails the test. */
const SHADCN_ITEMS = new Set([
  "trace",
  "code-block",
  "item",
  "badge",
  "dropdown-menu",
  "input-group",
  "message-scroller",
  "message",
  "bubble",
  "button",
  "scroll-area",
]);

describe("registry sources", () => {
  it("every item's files exist and its bare dependencies are shadcn items or local items", () => {
    const local = new Set(source.items.map((i) => `./${i.name}.json`));
    for (const item of source.items) {
      for (const f of item.files) expect(existsSync(join(here, "..", "..", f.path)), f.path).toBe(true);
      for (const dep of item.registryDependencies ?? []) {
        expect(SHADCN_ITEMS.has(dep) || local.has(dep), `${item.name} → ${dep}`).toBe(true);
      }
    }
  });

  it("the app's installed copies match the registry sources", () => {
    for (const item of source.items) {
      for (const f of item.files) {
        const name = f.path.split("/").at(-1)!;
        const installed = join(here, "..", "..", "examples", "nextjs", "components", "web-agents", name);
        expect(readFileSync(installed, "utf8"), name).toBe(readFileSync(join(here, "..", "..", f.path), "utf8"));
      }
    }
  });
});

describe.skipIf(!existsSync(out))("built registry (apps/docs/public/r)", () => {
  const ajv = new Ajv({ strict: false, allErrors: true });
  // shadcn's schemas name the draft-07 meta schema over https, which Ajv doesn't know by that id: validation needs no meta
  const schema = (file: string): object => {
    const { $schema: _meta, ...rest } = JSON.parse(readFileSync(join(here, file), "utf8")) as { $schema?: string };
    return rest;
  };
  // the catalog schema refers to the item schema by its public URL
  ajv.addSchema(schema("registry-item.schema.json"), "https://ui.shadcn.com/schema/registry-item.json");
  const validateItem = ajv.getSchema("https://ui.shadcn.com/schema/registry-item.json")!;
  const validateIndex = ajv.compile(schema("registry.schema.json"));

  it("every item JSON validates against shadcn's registry-item schema and embeds its file content", () => {
    const files = readdirSync(out).filter((f) => f.endsWith(".json") && f !== "registry.json");
    expect(files.length).toBeGreaterThanOrEqual(source.items.length);
    for (const file of files) {
      const json = JSON.parse(readFileSync(join(out, file), "utf8")) as { files?: { content?: string }[] };
      expect(validateItem(json), `${file}: ${ajv.errorsText(validateItem.errors)}`).toBe(true);
      for (const f of json.files ?? []) expect((f as { content?: string }).content, `${file} content`).toBeTruthy();
    }
  });

  it("the catalog validates against the registry schema", () => {
    const index = JSON.parse(readFileSync(join(out, "registry.json"), "utf8"));
    expect(validateIndex(index), ajv.errorsText(validateIndex.errors)).toBe(true);
  });
});
