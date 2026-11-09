# `AgentChat`

A chat launcher and a non-modal chat panel. The agent behind it works the live page through its WebMCP tools while the
person watches, so by default the panel docks beside the page instead of covering it.

```ts
import { AgentChat } from "@webmcp-agents/chat";
import "@webmcp-agents/chat/chat.css";
```

## Signature

```ts
function AgentChat(props: AgentChatProps): React.ReactPortal | null;

interface AgentChatProps {
  adapter?: AgentAdapter;
  adapters?: readonly AgentAdapter[];
  title?: string;
  defaultOpen?: boolean;
  position?: "bottom-right" | "bottom-left";
  layout?: "docked" | "floating";
  suggestions?: string[] | false;
  className?: string;
  storageKey?: string | false;
}
```

## Props

| Name | Type | Default | Description |
|---|---|---|---|
| `adapter` | `AgentAdapter` | — | The agent. Pass this or `adapters`. |
| `adapters` | `readonly AgentAdapter[]` | — | Several agents. The panel shows a switcher; the first is the default. |
| `title` | `string` | `"Assistant"` | Panel title. Also used in the launcher's label ("Open assistant"). |
| `defaultOpen` | `boolean` | `false` | Open on first render. |
| `position` | `"bottom-right" \| "bottom-left"` | `"bottom-right"` | Side and corner for the launcher and panel. |
| `layout` | `"docked" \| "floating"` | `"docked"` | `"docked"`: beside the page, full height, resizable; the page makes room. `"floating"`: a pop-over in the corner. |
| `suggestions` | `string[] \| false` | derived from the page's tools | Starter prompts for an empty conversation. `false` hides them. |
| `className` | `string` | — | Extra class on the host element, for theming with the `--wa-chat-*` properties. |
| `storageKey` | `string \| false` | `"web-agents:chat"` | sessionStorage key for the conversation. `false` keeps it in memory only. |

## Returns

A portal into a host `<div>` appended to `document.body` (class `wa-chat`, `data-position`, `data-layout`, and the
`data-web-agents-ui` attribute). It renders `null` until the host exists. It throws if neither `adapter` nor `adapters`
is given.

## Layout

- **Docked** (default): the open panel sits on the `position` side, full height, and the page gets a body margin so
  the agent never works under the chat. Drag the inner edge, or focus it and use the arrow keys (Shift for bigger
  steps, Home and End for min and max), to resize. The width runs from 320 px up to the window minus 360 px (at most
  720 px), starts at 380 px, and is remembered in localStorage.
- While docked, `<html>` gets `data-wa-chat-dock="left|right"` and `--wa-chat-inset-left` / `--wa-chat-inset-right`.
  Offset your own fixed UI (drawers, toasts) with them.
- **Floating**: the pop-over stays in the corner, over the page.
- Below 640 px the panel is a bottom sheet in either layout.

## Theming

Import `@webmcp-agents/chat/chat.css` once. Every rule is scoped by a `.wa-chat*` class and sits outside any cascade
layer. Override the custom properties on `.wa-chat` (or on your `className`):

| Property | Default (light) |
|---|---|
| `--wa-chat-bg` | `#ffffff` |
| `--wa-chat-fg` | `#111111` |
| `--wa-chat-muted` | `#5f6368` |
| `--wa-chat-line` | `rgba(17, 17, 17, 0.1)` |
| `--wa-chat-soft` | `rgba(17, 17, 17, 0.05)` |
| `--wa-chat-accent` | `var(--agent, #111111)` (the cursor's colour) |
| `--wa-chat-accent-ink` | `var(--agent-ink, #ffffff)` |
| `--wa-chat-danger` | `#c62828` |
| `--wa-chat-success` | `#1b7f3b` |
| `--wa-chat-radius` | `14px` |
| `--wa-chat-shadow` | `0 12px 40px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.08)` |
| `--wa-chat-font` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--wa-chat-ease` | `var(--agent-ease-out, cubic-bezier(0.22, 1, 0.36, 1))` |
| `--wa-chat-z` | `calc(var(--agent-z, 2147483000) - 2)` (below the agent cursor) |
| `--wa-chat-gap` | `20px` (`16px` below 640 px) |

Dark mode follows `prefers-color-scheme` (unless an ancestor or the host has `data-theme="light"`), or
`data-theme="dark"` on an ancestor or the host.

## Example

```tsx
// apps/ecommerce/src/Root.tsx
import { AgentChat, createCloudAdapter } from "@webmcp-agents/chat";
import { createLocalAdapter } from "@webmcp-agents/local-agent";

// Once per page. Cloud checks /api/chat on first use; on-device downloads a model only after the person's click.
const ADAPTERS = [createCloudAdapter(), createLocalAdapter({ instructions: STORE_INSTRUCTIONS })];

<WebAgentsProvider tools={catalog} global={globalTools} pathname={pathname} context={context}>
  …
  {/* inside the provider: the assistant sees exactly the tools this page has on */}
  <AgentChat adapters={ADAPTERS} title="Assistant" position="bottom-right" />
</WebAgentsProvider>
```

## Notes

- Render it inside `<WebAgentsProvider>` so the agent sees the tools the page has on.
- Create adapters once, at module scope, not during render: the session and the status hook key on the adapter object.
- The host carries `data-web-agents-ui`, so typing in the chat never makes the agent cursor yield.
- The conversation survives route changes and reloads (sessionStorage, last 60 messages). A reload marks any running
  tool call as cancelled.
- The chosen adapter is remembered in localStorage (`web-agents:chat:adapter`) while it is still offered. The switcher
  is disabled while a run streams.
- An adapter with `prepare()` and a `needs-download`, `downloading` or `error` status shows a download card with the
  size, Cancel, and a button to switch to another adapter.
- "Try again" after a failed run resumes the turn (see [`resumable`](./session-reducer.md#resumable)). It is hidden for
  `chat_disabled`.
- Escape closes the panel and returns focus to the launcher.

## See also

- [`createCloudAdapter`](./create-cloud-adapter.md)
- [`useAgentSession`](./use-agent-session.md): build your own chat UI
- [Adapter types](./adapter-types.md)
- [`createLocalAdapter`](../local-agent/create-local-adapter.md)
