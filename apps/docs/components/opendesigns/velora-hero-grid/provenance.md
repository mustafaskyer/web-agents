# Developer/Grid Hero provenance

C006 → `velora-hero-grid` · section · `velora` collection/family.

This is an MIT-permitted adaptation of `src/components/blocks/hero-grid-minimal.tsx` and its `retro-grid`, `terminal`, `typewriter` and `blur-fade` dependencies in [ColorlibHQ/velora-ui](https://github.com/ColorlibHQ/velora-ui/tree/a07bcc129b45eeed3fc070357a6a74b876d96159), pinned at `a07bcc129b45eeed3fc070357a6a74b876d96159`. The complete upstream MIT permission/copyright notice, Copyright (c) 2026 Aigars Silkalns, is retained in `LICENSE.txt`. The live registry hero matched that pinned source during inspection.

The direct [rendered reference](https://velora.colorlib.com/blocks/preview/hero-grid-minimal) was observed before implementation. The centered reading order, developer-oriented heading accent, receding grid, paired actions and terminal-like session inform this adaptation. Exact pixels and endless source choreography are not acceptance goals.

OpenDesigns authored all copy, session descriptions, local destinations and the clipboard interaction. No source Tachyon branding, fake version/cache-performance claims, package-install results, package-manager compatibility claims, endorsements, photographs, external fonts or proprietary assets are included. The shared OpenDesigns mark is reused. The visible session is explicitly illustrative and requires configuring the local registry; the page never evaluates a command, runs an install, fetches a package or sends form data.

The source's unbounded 600vw/300vh moving grid is replaced with a clipped CSS perspective plane bounded to 150% of the section width and a 40rem backdrop height. It uses semantic borders and a finite 48px translation. Source brand gradients, raw dark/traffic-light/terminal colors, Motion imports, infinite cursor pulse, endless typing/deleting and large blur are removed. No Canvas, WebGL, image, shader or new runtime package is required. Forced-colors mode hides the decorative grid.

Shared official shadcn React Aria LinkButton/Button provide navigation and copy; the session composes the existing Card family. Failed copy composes shared Alert, FieldGroup/Field/FieldLabel and Textarea, with focus and text selection for keyboard/touch recovery. UI icons use Hugeicons. No shared component colors, typography or size appearance is overridden. The section inherits consumer semantic Neutral Light/Dark variables and the IBM Plex Sans shared font variable, including its code example.

The shared `useSectionSequence` owns one coalesced frame request, a 25Hz paint ceiling and a 4,600ms visible-time deadline beneath the common five-second autoplay cap. It always paints the exact final elapsed value even if the first or final RAF is delayed, so the grid reaches its full 48px translation. The heading types once by 1,200ms and illustrative notes by 3,600ms. The painter reads current refs and current text; prop updates repaint current or final progress without resetting the lifetime budget. Reduced motion restores the final text/geometry, hidden/offscreen/internal-pause state is handled centrally, and unmount cancels owned lifecycle work. Text is statically available before hydration and has reserved measurement space; assistive technology receives a stable full heading and session without typing announcements. There is no decorative playback switch.

Command copying is a functional user action independent of decorative motion. The default writes only to the Clipboard API. A typed `CopyGridCommand` override receives command text and an AbortSignal. In-flight copies are guarded, unmount aborts the owned request, late completions are ignored, and failure reveals selected manual-copy text plus retry. A blank command disables the action. The example navigation has matching focusable local anchor targets.

Runtime dependencies are the existing React/ReactDOM peers, Hugeicons, and shared UI/utility closure. React Aria and class-variance-authority are Apache-2.0; React, Hugeicons, clsx and tailwind-merge are MIT. Source/license hashes, installed dependency versions and reference observation live in `docs/blocks/evidence/section-expansion/C006/`. Revision-specific responsive, keyboard, lifecycle and clean Next.js/Vite distribution evidence is recorded separately in the item ledger. The installable item remains in `verification: review` for local owner review.


## Example notes (not rendered)

The following implementation and review notes are retained as documentation. They are not part of the runtime example.

```tsx
<div className="mx-auto grid max-w-5xl gap-12 px-6 py-16 md:grid-cols-2">
        <section
          id={`${id}-start`}
          tabIndex={-1}
          aria-labelledby={`${id}-start-title`}
          className="flex scroll-mt-8 flex-col gap-4"
        >
          <h2
            id={`${id}-start-title`}
            className="text-2xl font-medium tracking-tight"
          >
            Give the section a home
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Use a React and TypeScript application with Tailwind and the shared
            React Aria foundation. Connect the local registry before using the
            illustrative command above, then replace the sample content with
            your own.
          </p>
        </section>
        <section
          id={`${id}-guide`}
          tabIndex={-1}
          aria-labelledby={`${id}-guide-title`}
          className="flex scroll-mt-8 flex-col gap-4"
        >
          <h2
            id={`${id}-guide-title`}
            className="text-2xl font-medium tracking-tight"
          >
            Configure your local registry
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            In components.json, map the @opendesigns registry to your running
            hub’s /r/&#123;name&#125;.json endpoint. Keep its address aligned
            with your local hub. The copy action writes a command to your
            clipboard; it never installs or runs anything.
          </p>
        </section>
      </div>
```


## Non-rendered caption and browsing-copy context

Removed from install-session.tsx on 2026-10-19. Artwork, data, controls and fallback behavior remain; implementation explanations belong in documentation.

```tsx
          <CardDescription>Illustrative local-registry session</CardDescription>
```
