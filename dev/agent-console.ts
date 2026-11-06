/**
 * Dev-only "agent console": a floating panel that lists the page's WebMCP
 * tools and lets you call them with JSON args, i.e. it plays the agent.
 * Also exposes window.agent.run(name, args) for DevTools.
 */

interface SchemaProperty {
  type?: string;
  minimum?: number;
  enum?: unknown[];
  description?: string;
}

/** "Optional promo code, e.g. 123" → "123": a ready-to-run sample for text params. */
const exampleFrom = (description = ""): string => description.match(/e\.g\.,?\s*["']?([^"',;\s]+)/i)?.[1] ?? "";

/** Chrome returns inputSchema as a JSON string; the polyfill returns an object. */
function parseSchema(schema: ModelContextToolInfo["inputSchema"]): { properties?: Record<string, SchemaProperty> } {
  if (typeof schema !== "string") return (schema as { properties?: Record<string, SchemaProperty> }) ?? {};
  try {
    return JSON.parse(schema);
  } catch {
    return {};
  }
}

function defaultArgs(schema: ModelContextToolInfo["inputSchema"]): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(parseSchema(schema).properties ?? {}).map(([k, p]) => [
      k,
      p.type === "integer" || p.type === "number"
        ? (p.minimum ?? 1)
        : p.type === "boolean"
          ? true
          : (p.enum?.[0] ?? exampleFrom(p.description)),
    ]),
  );
}

/** Chrome resolves to a JSON string; the polyfill to { content, isError }. */
function normalizeResult(res: ModelContextToolResult | string): ModelContextToolResult {
  if (typeof res !== "string") return res;
  let value: unknown = res;
  try {
    value = JSON.parse(res);
  } catch {
    /* plain text */
  }
  if (value && typeof value === "object" && Array.isArray((value as ModelContextToolResult).content)) {
    return value as ModelContextToolResult;
  }
  return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }] };
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface AgentConsoleOptions {
  /** Adds a "Spotlight" switch to the header. */
  spotlight?: { initial: boolean; set(on: boolean): void };
}

export function installAgentConsole({ spotlight }: AgentConsoleOptions = {}): void {
  const mc = document.modelContext;
  if (!mc) return;

  const panel = document.createElement("aside");
  panel.className = "agent-console";
  panel.innerHTML = `
    <header>
      <div class="title-row">
        <strong>Agent console</strong>
        ${spotlight ? `<label class="switch"><input type="checkbox" ${spotlight.initial ? "checked" : ""}> Spotlight</label>` : ""}
      </div>
      <span class="hint">plays the agent · calls document.modelContext.executeTool</span>
    </header>
    <div class="tools"></div>
    <pre class="log" aria-live="polite"></pre>
  `;
  document.body.append(panel);
  panel
    .querySelector<HTMLInputElement>(".switch input")
    ?.addEventListener("change", (e) => spotlight?.set((e.currentTarget as HTMLInputElement).checked));

  const toolsEl = panel.querySelector<HTMLDivElement>(".tools")!;
  const logEl = panel.querySelector<HTMLPreElement>(".log")!;

  const log = (line: string): void => {
    logEl.textContent += `${new Date().toLocaleTimeString()}  ${line}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  };

  async function render(): Promise<void> {
    const tools = await mc!.getTools();
    toolsEl.innerHTML = "";
    if (tools.length === 0) toolsEl.innerHTML = `<p class="hint">No tools registered.</p>`;
    for (const t of tools) {
      const row = document.createElement("form");
      row.className = "tool-row";
      row.innerHTML = `
        <div><code>${escapeHtml(t.name)}</code><small>${escapeHtml(t.description ?? "")}</small></div>
        <textarea rows="1" spellcheck="false" aria-label="Arguments for ${escapeHtml(t.name)}">${escapeHtml(JSON.stringify(defaultArgs(t.inputSchema)))}</textarea>
        <button type="submit">Run</button>
        ${mc!.cancelTool ? `<button type="button" class="cancel" title="Cancel while running" aria-label="Cancel ${escapeHtml(t.name)}">✕</button>` : ""}
      `;
      row.addEventListener("submit", async (e) => {
        e.preventDefault();
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(row.querySelector("textarea")!.value || "{}");
        } catch {
          log(`✖ ${t.name}: args are not valid JSON`);
          return;
        }
        await run(t.name, args);
      });
      row.querySelector(".cancel")?.addEventListener("click", () => mc!.cancelTool?.(t.name));
      toolsEl.append(row);
    }
  }

  /**
   * Native executeTool takes the tool object from getTools(), but the args shape
   * changed between builds: Chrome 156 wants an object, Chrome 150 a JSON string.
   * Try the newer shape, fall back on the argument-validation error, and remember
   * what worked. Both errors are thrown before the tool runs, so a retry is safe.
   */
  let argsAs: "object" | "string" = "object";
  async function execute(tool: ModelContextToolInfo, args: Record<string, unknown>) {
    const call = (shape: typeof argsAs) => mc!.executeTool(tool, shape === "object" ? args : JSON.stringify(args));
    try {
      return await call(argsAs);
    } catch (err) {
      const message = String((err as Error)?.message ?? err);
      const other = argsAs === "object" ? "string" : "object";
      const wrongShape =
        argsAs === "object" ? /parse input string as JSON|not of type 'DOMString'/i : /not an object|invalid input object/i;
      if (!wrongShape.test(message)) throw err;
      argsAs = other;
      return call(argsAs);
    }
  }

  /**
   * Tools without `toolautosubmit` pause until the user clicks their submit
   * button. Say so in the log, or a paused call just looks hung.
   */
  function announcePause(name: string): () => void {
    const form = document.querySelector(`form[toolname="${CSS.escape(name)}"]`);
    // Autosubmit forms never wait for the user (Chrome may still flag their button briefly).
    if (!form || form.hasAttribute("toolautosubmit")) return () => {};
    const started = performance.now();
    const timer = setInterval(() => {
      let btn: Element | null = null;
      try {
        btn = form?.querySelector(":tool-submit-active") ?? null;
      } catch {
        /* pseudo-class unknown: polyfill */
      }
      btn ??= form?.querySelector("[data-tool-submit-active]") ?? null;
      if (btn) {
        log(`⏸ ${name}: waiting for you to click "${btn.textContent?.trim() || "submit"}" on the page`);
        clearInterval(timer);
      } else if (performance.now() - started > 5000) {
        clearInterval(timer);
      }
    }, 150);
    return () => clearInterval(timer);
  }

  async function run(name: string, args: Record<string, unknown> = {}): Promise<ModelContextToolResult | undefined> {
    log(`▶ ${name} ${JSON.stringify(args)}`);
    try {
      const tool = (await mc!.getTools()).find((t) => t.name === name);
      if (!tool) throw new Error(`Unknown tool "${name}"`);
      const stopWatching = announcePause(name);
      let res: ModelContextToolResult;
      try {
        res = normalizeResult(await execute(tool, args));
      } finally {
        stopWatching();
      }
      const text = res.content?.map((c) => c.text).join(" ") || "(no content)";
      // Declarative tools can't set isError; this demo's handlers prefix failures with "Error:".
      const failed = res.isError || /^Error:/.test(text);
      log(`${failed ? "✖" : "✔"} ${name}: ${text}`);
      return res;
    } catch (err) {
      log(`✖ ${name}: ${(err as Error)?.message ?? err}`);
      return undefined;
    }
  }

  mc.addEventListener("toolchange", () => void render());
  void render();
  window.agent = { run, list: () => mc.getTools() };
}
