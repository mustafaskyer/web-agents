# Floating Pill Navbar provenance

Adapted from ColorlibHQ/velora-ui `navbar-floating` at commit `a07bcc129b45eeed3fc070357a6a74b876d96159`, under MIT copyright2026 Aigars Silkalns. The full notice and original OpenDesigns adaptation notice are retained in LICENSE.txt. Exact pinned local closure and live source parity are recorded in `docs/blocks/evidence/section-expansion/S01/source-review.json`.

The reference was personally inspected in saved initial, scrolled, hover and fully settled mobile captures. The original wide/compact hierarchy is retained; actual container width controls collapse so the observed760px source CTA overhang is not reproduced. Native React Aria Menu replaces the source custom disclosure and measured animated highlight. Shared controls retain their appearance and native keys, focus and dismissal. Functional scroll compaction uses one passive listener and a finite width transition, with no decorative autoplay or idle frame loop.

All text and example reading destinations are original OpenDesigns content. Existing OpenDesignsLogo replaces Lumen. Source sign-in/sign-up/customer claims, fake chart and placeholder page are omitted. No external media, fonts, licensed logos or remote assets are redistributed. Source Radix, Lucide and Motion are absent from this closure. Existing shared Hugeicons, Button, DropdownMenu and logo dependencies are listed exactly in metadata.json. Original source dependency/license review and official primitive evidence remain in S01 evidence. Runtime acceptance is recorded separately there; authoring does not establish consumer verification.

Local layout correction: the shared native menu now has a percentage containing-block maximum width in addition to its preferred viewport width. This only constrains layout; native React Aria behavior and shared control appearance remain unchanged. Enlarged-layout verification is pending.

Native menu correction: installed React Aria Components1.22.1 filters `aria-current` before rendering MenuItem links. S01 now uses the supported final native `render` hook, spreading the complete native anchor props/ref/children and adding current=page only for the matching activeHref. Roles, disabled semantics, typeahead, native press/dismissal and shared appearance remain owned by React Aria. The div fallback preserves its expected native element without inventing a nested link or selection control. Direct desktop LinkButton behavior is unchanged.

The old body-portalled absolute popover used physical trigger rectangles with unscaled overlay dimensions in installed React Aria positioning; CSS document zoom could therefore place its x-coordinate beyond the viewport even when width was clamped. The scoped correction preserves MenuTrigger's existing context through useSlottedContext(PopoverContext), adds only its actual positioned frame as the native portal container, and explicitly anchors the native popover through layout-only absolute top100%/right0/left:auto/maxWidth100%. The frame ref callback remains stable and the menu waits for a mounted container. The old percentage width cap is coherently replaced by the actual frame's100% cap. Font/zoom enlargement, native menu implementation and inherited control appearance are preserved. No inverse zoom, body-panning workaround, new dependency, shared mutation or private position loop exists. Parent must verify normal, embedded, local-scroll,200% and bottom/short-height geometry, keyboard/outside/Escape/destination focus and lifecycle against a fresh immutable revision. This source correction is not acceptance; prior reports/source snapshots remain historical.

Short-height correction: the preceding horizontal repair left the enlarged native menu taller than the available viewport (recorded640px-wide/480px-high/200% capture: top156px, height668px, bottom824px). The existing frame ResizeObserver now also measures physical space below the frame and converts it to local logical pixels using the frame's rendered-width/offsetWidth scale. One paired passive window resize listener updates height-only viewport changes. The scoped popover max-height consumes that local variable with four inherited spacing units of clearance and the existing40rem ceiling; native overflow scrolling and Menu keyboard behavior remain shared. No zoom/font reduction, extra observer, polling or position loop is introduced. Observer/listener/variable cleanup is explicit. Fresh bottom/short-height, enlarged native End/Home reachability and lifecycle verification remain parent-owned and pending; earlier raw captures are unchanged.


## Example notes (not rendered)

The following implementation and review notes are retained as documentation. They are not part of the runtime example.

```tsx
<main className="mx-auto flex max-w-3xl flex-col gap-20 px-6 py-16">
        {notes.map((note) => (
          <section
            key={note.id}
            id={`${id}-${note.id}`}
            tabIndex={-1}
            aria-labelledby={`${id}-${note.id}-title`}
            className="flex scroll-mt-28 flex-col gap-4"
          >
            {note.id === "home" ? (
              <h1
                className="text-3xl font-medium"
                id={`${id}-${note.id}-title`}
              >
                {note.title}
              </h1>
            ) : (
              <h2
                id={`${id}-${note.id}-title`}
                className="text-2xl font-medium"
              >
                {note.title}
              </h2>
            )}
            <p className="text-muted-foreground leading-relaxed">{note.text}</p>
          </section>
        ))}
      </main>

const notes = [
  {
    id: "home",
    text: "This original page gives each navigation action a useful local destination. Scroll through the notes to see the navigation become compact. The menu remains available when the header has less room.",
    title: "OpenDesigns reading room",
  },
  {
    id: "overview",
    text: "Choose a page purpose before arranging its sections. A short heading, readable supporting copy and an action with a concrete destination help readers understand where they are and what comes next.",
    title: "Begin with a clear outline",
  },
  {
    id: "sections",
    text: "Group related ideas, leave space between different thoughts and keep the reading order meaningful when columns stack. Use content that explains the composition instead of decorative placeholders or invented customer claims.",
    title: "Make each section useful",
  },
  {
    id: "reading",
    text: "Use a deliberate text measure, semantic foreground values and a line height that gives paragraphs room. Enlarge text and inspect narrow layouts, including labels that wrap onto several lines inside shared controls.",
    title: "Keep reading comfortable",
  },
  {
    id: "review",
    text: "Follow the navigation with Tab, activate actual reading destinations and try the menu with a keyboard or touch. Check focus after dismissal, preserve outside focus and verify that a compact header still exposes every useful action.",
    title: "Review the complete path",
  },
  {
    id: "updates",
    text: "Describe what changed and the reason a reader might care. Keep unverified behavior separate from observed results. This illustrative reading page has no account flow, subscription, checkout or external service.",
    title: "Record changes honestly",
  },
  {
    id: "guide",
    text: "Use ordinary links for destinations and the shared native menu for constrained space. Keep names specific, current-page state accurate and destinations substantive. Reflow from available container width so an embedded or compact navigation never relies on the size of the outer window.",
    title: "A guide to considered navigation",
  },
] as const;
```


## Non-rendered caption and browsing-copy context

Removed from navigation.ts on 2026-10-19. Artwork, data, controls and fallback behavior remain; implementation explanations belong in documentation.

```ts
    label: "Read the guide",
```
