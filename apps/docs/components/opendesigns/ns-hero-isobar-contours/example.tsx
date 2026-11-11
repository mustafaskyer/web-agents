"use client";
// oxlint-disable shadcn/no-arbitrary-values -- Retained reference demo type and layout metrics; shell controls use the shared scale.
import { useBrandName } from "../_shared/brand";
import "../_shared/ns-example.css";
import { MotionBoundary } from "../_shared/motion-boundary";
import { PressureFront } from "./component";

const PressureFrontDemo = () => {
  const brandName = useBrandName();
  return (
    <section className="bg-background min-h-screen">
      <header className="border-border flex items-center justify-between gap-4 border-b px-6 py-4">
        <p className="text-ns-muted font-sans text-xs tracking-widest">
          {brandName} / Creative workspace
        </p>
      </header>
      <PressureFront
        eyebrow="ISOBAR-01"
        headline={["Every line", "points here"]}
        subcopy="Bring your next idea into focus. A creative workspace for the work that matters to you."
        primaryCta={{ href: "/blocks", label: "Explore blocks" }}
        secondaryCta={{
          href: "/blocks/opendesigns-shader-gallery",
          label: "View artwork",
        }}
        className="min-h-[calc(100vh-3.75rem)]"
      />
    </section>
  );
};
export default function PausableExample() {
  return (
    <MotionBoundary>
      <PressureFrontDemo />
    </MotionBoundary>
  );
}
