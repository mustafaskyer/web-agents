# Accordion FAQ provenance

Checklist C048 → `velora-faq-accordion`, public section, faq category, velora collection/family. Export `FaqAccordion`; client sample factory `createFaqStudy(contactHref)` requires a real contact-guide reading destination.

Reference https://velora.colorlib.com/blocks/preview/faq-accordion and registry https://velora.colorlib.com/r/faq-accordion.json. Source ColorlibHQ/velora-ui commit `a07bcc129b45eeed3fc070357a6a74b876d96159`, `src/components/blocks/faq-accordion.tsx`; saved live block content matches the pin. The author personally viewed complete default-first and second-open DPR1 captures and read both ARIA, expanded-state interaction and browser/context cleanup records before implementation. The observed hierarchy is a centered introduction, eight-row bordered question surface over a subtle dot field, and a separate initials/copy/action row. Source interaction confirms single expansion and genuine all-collapsed behavior. Full reachable Accordion/Button/AvatarCircles/BlurFade/GridPattern/utils/package/license snapshots are recorded; the extra source Badge snapshot is not a block import. The full MIT copyright2026 Aigars Silkalns notice is retained in LICENSE.txt.

Original illustrative OpenDesigns questions about page purpose, answer scope, meaningful actions, unsupported details, longer context, narrow reading, consistent terms and useful handoff replace all source product copy. Source trial/billing/security/offline/discount/support-time/business claims, names and placeholder contact action are excluded. Local original content/layout/state topic initials use shared Avatar primitives; they do not represent staff or endorsements. No source portrait, remote artwork, custom font, customer count or external asset is needed. Original static semantic-token dot artwork preserves the quiet background hierarchy. Existing Hugeicons provide interface icons.

Existing shared official React Aria Accordion/Item/Trigger/Content, Avatar/Fallback/Group, LinkButton and Empty retain their actual APIs and appearance. Neutral semantic variables, IBM Plex Sans and host control defaults provide the foundation; ordinary wrappers own surface and spacing. There is no source Radix Slot/Accordion control, Lucide dependency, pill-style override or competing button. The section uses h2 and the existing shared trigger/guide h3 hierarchy. Contact and optional answer actions are real reading destinations; the client example contains a substantive local guide with native focus target.

Single expansion is always collapsible. The first enabled question is requested only during initial local state creation. Explicit empty string remains all-collapsed, including later data changes. Controlled/default values, enabled-id lookup, invalid/removed/item-disabled recovery without false callbacks, group/item disabled, all-disabled, empty/single/optional/long content and honest missing-copy guidance are configurable. Shared native Tab/Shift+Tab/Enter/Space, generated disclosure relationships, hidden panels and functional expansion transitions remain intact. No unsupported Radix roving-key or heading override is promised.

No decorative autoplay, hidden-first reveal, private viewport state, frame, timer, observer, media listener, automatic question rotation or playback UI is added. Complete initial content is readable. User-triggered expansion belongs to the existing shared primitive; metadata's literal5000ms is the common schema allowance, not a scheduled sequence.

Revision-specific observation, hashes and runtime/consumer records live in `docs/blocks/evidence/section-expansion/C048/`. Official component documentation and actual installed API decisions are linked there. Historical evidence keeps its original meaning; acceptance is recorded against the exact installed source revision.


## Non-rendered implementation context

These notes are retained for maintainers rather than displayed in the composition.

```tsx
<p className="velora-faq-notice">
      Original illustrative OpenDesigns page-study questions and guide topics.
      Guide actions open reading notes.
    </p>
```


## Example notes (not rendered)

The following implementation and review notes are retained as documentation. They are not part of the runtime example.

```tsx
<section
        id={`${id}-guide`}
        tabIndex={-1}
        aria-labelledby={`${id}-guide-title`}
        className="mx-auto flex max-w-3xl scroll-mt-8 flex-col gap-6 px-6 py-16"
      >
        <h2 id={`${id}-guide-title`} className="text-2xl font-medium">
          Prepare a useful contact question
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Start with the question you want to answer and the decision it
          affects. Include the relevant page context, what you expected to find,
          and the detail that is still unclear.
        </p>
        <h3 className="text-xl font-medium">Keep the context together</h3>
        <p className="text-muted-foreground leading-relaxed">
          Describe the content, layout, or state involved. If the issue depends
          on a narrow screen or a keyboard path, record the actual steps and the
          result you observed. Share only information appropriate for the
          receiving project.
        </p>
        <h3 className="text-xl font-medium">Choose the real next step</h3>
        <p className="text-muted-foreground leading-relaxed">
          This example is a reading guide. In your project, connect the guide
          action to your actual contact page or another useful reading
          destination, with a label that explains where it leads. Keep open
          questions separate from promises or completed review evidence.
        </p>
      </section>
```
