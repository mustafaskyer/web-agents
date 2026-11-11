"use client";

/**
 * The three steps, each beside its snippet with a copy button. The snippets arrive already highlighted (Shiki, at
 * build time, with the docs' two code themes), in the order of STEPS; a missing one falls back to the plain source.
 * Each copy button is what `copy_step_code` acts on (by its name, "Copy the code of step 1"); the tool and the button
 * share `copyStepCode()` (lib/clipboard.ts), so an agent's copy and a person's look the same.
 */
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCopyStepCode } from "@/hooks/use-copy";
import { STEPS } from "./steps-data";

export interface StepsProps {
  /** One block of highlighted HTML per step, from pages/index.astro. */
  highlighted?: readonly string[];
}

export const Steps = ({ highlighted = [] }: StepsProps) => {
  const { copied, copy } = useCopyStepCode();

  return (
    <ol className="steps">
      {STEPS.map((step, i) => {
        const n = i + 1;
        const html = highlighted[i];
        return (
          <li key={step.title} className="step" data-step={n}>
            <div className="step__copy">
              <span className="step__number" aria-hidden="true">
                {n}
              </span>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__text">{step.text}</p>
            </div>
            <div className="step__code-wrap">
              {html ? (
                // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki's output for our own constants, made at build time
                <div className="step__code" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <div className="step__code">
                  <pre>
                    <code>{step.code}</code>
                  </pre>
                </div>
              )}
              <button type="button" className="step__copy-button" aria-label={`Copy the code of step ${n}`} onClick={() => copy(n)}>
                <HugeiconsIcon icon={copied === n ? Tick02Icon : Copy01Icon} aria-hidden="true" size={14} />
                <span aria-live="polite">{copied === n ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
