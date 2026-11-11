# Giant Wordmark Footer provenance

Checklist S04 → `velora-footer-wordmark`, export `FooterWordmark` and `createFooterWordmarkStudy`; existing footer category, velora collection/family, independently installable section.

Source https://velora.colorlib.com/blocks/preview/footer-wordmark and https://velora.colorlib.com/r/footer-wordmark.json. ColorlibHQ/velora-ui pinned commit `a07bcc129b45eeed3fc070357a6a74b876d96159`; saved live block equals pinned source. Full FooterWordmark/TextHoverEffect/utils/package/MIT graph was read. Full MIT copyright2026 Aigars Silkalns and OpenDesigns adaptation notice are retained in LICENSE.txt.

The author personally inspected all five DPR1 reference images before code: complete desktop, mobile, reduced, pointerleft and pointerright. All ARIA/native interaction JSON/cleanup were read. Actual source has statement/blurb/email-labelled #link, six navigationlinks, notice/legal/socialrow and giant outlined lowercase Halcyon. Native gradient center changes20.000001%→79.998889%, cy50%, and images visibly move blue/cyan reveal from left to right. Reduced reference is centered50%. Source ARIA exposes four duplicate text copies under roleimg. All source navigation/contact/social/legal hrefs are placeholders; source business claims and identity are not evidence of a real service.

Original OpenDesigns statement/blurb, required actualhome/collaborationguide actions, six actualguide links, three quick-reading links and two usage/attribution notes replace source Halcyon/email/socialtrademark/accounts/legal/businessclaims. Existing OpenDesignsLogo provides an accessible native home identity, and the large independently authored OpenDesigns SVG is decorative/aria-hidden to avoid repeated speech. The explicitclient example supplies nine substantive focusable local guides, not an invented inbox, social profile, privacy policy or response promise.

Existing official shared React Aria LinkButton and Separator, existing OpenDesignsLogo, Hugeicons, Neutral semantic variables and inherited IBM Plex Sans/--spacing supply the foundation. Sharedcontrols keep variants/colors/fonts/sizes/radius/focus. Plain wrappers own responsive composition and long labels use the central growingtouch variant. No new dependency/externalasset/competingcontrol appearance/sourcefont override is included.

The original native SVG fixes a bounded OpenDesigns viewBox/textLength, eliminating source Canvas2D font measurement/getBBox/fontsreadyasync and its unsupported-context crash path. Persistent full faint outline is present in initialHTML. An additional outline draws under one existing useSectionSequence3000ms lifetime, exactfinal/no replay/latestprops/reducedfinal/hiddenoffscreenpause/disposal. SVG semantic colors follow late consumer themes/resize natively; no appearance observer is needed. Metadata5000 is the common schema ceiling.

Actual SVG-local pointer coordinates drive a radial alpha mask with normalizedscale-aware geometry and bounded radius/stroke. One pending shared-frame sample, no spring/privateRAF/idleloop/globalpointer/scroll. Fine/nonreduced/visible/foreground/unpaused eligibility is required; leave/cancel/touch/reduced/coarse/hidden/offscreen/pause clears reveal, centersgradient and cancelsframe. All IO/media/document/pointer listeners are removed on cleanup and drawvariables/data removed on unmount. Pointer userinteraction remains available after finite drawsettles. Semantic alpha-mask stops avoid rawwhite/black/sourcebrand tokens. This is real pointer-responsive vector artwork, not a screenshot fallback.

Full source/reference hashes and revision-specific consumer records live in docs/blocks/evidence/section-expansion/S04. Twelve SSR/data/geometry regressions are authored, not run; parent owns integration and full exact Next/Vite E verification.


## Example notes (not rendered)

The following implementation and review notes are retained as documentation. They are not part of the runtime example.

```tsx
<div className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-16">
        {notes.map((note) => (
          <section
            key={note.id}
            id={`${id}-${note.id}`}
            tabIndex={-1}
            aria-labelledby={`${id}-${note.id}-title`}
            className="flex scroll-mt-8 flex-col gap-4"
          >
            <h2 id={`${id}-${note.id}-title`} className="text-2xl font-medium">
              {note.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{note.text}</p>
          </section>
        ))}
      </div>

const notes = [
  {
    id: "home",
    text: "This original page connects the footer to useful reading destinations. Its outlined OpenDesigns artwork supplies atmosphere; the words and real links remain available before, during and after the brief decorative draw.",
    title: "OpenDesigns reading notes",
  },
  {
    id: "content",
    text: "Give a page a clear question to answer. Arrange a useful heading, supporting copy and a next step so that the person reading can understand the purpose without guessing what an action will do.",
    title: "Content with a clear purpose",
  },
  {
    id: "layout",
    text: "Use space to distinguish a thought from the next region. Allow columns and action labels to wrap naturally as available width changes, and preserve a comfortable measure when the text grows.",
    title: "Layout and reading rhythm",
  },
  {
    id: "states",
    text: "Explain what a loading or empty region means, keep an error near the part that needs attention, and distinguish a recoverable problem from one that needs an edit. A confirmation should name what actually happened.",
    title: "Useful interface states",
  },
  {
    id: "keyboard",
    text: "Follow each footer link with Tab, Shift+Tab and Enter. Names should explain their destination and focus should remain visible. Local reading targets in this example are programmatically focusable so a native fragment moves the reader to the actual guide.",
    title: "Keyboard and navigation notes",
  },
  {
    id: "review",
    text: "Review the footer at narrow widths, with enlarged text, and in both consumer themes. The entire wordmark should remain visible while navigation stays usable. Reduced motion leaves a complete still composition; touch scrolling does not require interacting with the graphic.",
    title: "Review the composition",
  },
  {
    id: "collaboration",
    text: "Before adapting a shared section, agree on its purpose, accurate content and real destinations. Keep the consuming project's theme and control foundation intact. These are illustrative collaboration notes, not an inbox, support channel or response-time promise.",
    title: "Collaboration notes",
  },
  {
    id: "usage",
    text: "This is an illustrative footer and reading page. It does not create accounts, send messages or establish policies or social profiles. Supply truthful notices and actual contact or reading destinations in your own project.",
    title: "Example usage notes",
  },
  {
    id: "attribution",
    text: "The composition is adapted from the pinned MIT Velora source with the full notice retained. OpenDesigns supplies original identity, content and SVG artwork, using the shared React Aria controls and consumer variables. License and provenance records accompany the installable source.",
    title: "Source attribution",
  },
] as const;
```
