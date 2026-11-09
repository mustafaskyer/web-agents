"use client";

import { ArrowRight01Icon, BookOpen01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { LinkButton } from "@/components/ui/button";
import { OpenDesignsMark } from "@/components/ui/opendesigns-logo";
import { cn } from "@/lib/utils";
import { useId, useRef } from "react";
import type { ReactNode } from "react";

import { brand, useBrandName } from "../_shared/brand";
import { useSectionSequence } from "../_shared/use-section-sequence";
import { InstallSession } from "./install-session";
import type { CopyGridCommand } from "./install-session";

import "./styles.css";

export type { CopyGridCommand } from "./install-session";

export interface GridHeroAction {
  href: string;
  label: string;
}

export interface GridHeroProps {
  accent?: string;
  className?: string;
  command?: string;
  description?: string;
  eyebrow?: string;
  headingLevel?: "h1" | "h2";
  onCopyCommand?: CopyGridCommand;
  /** Rendered in place of the install card (a demo frame, say). */
  /** Beside or under the copy; `null` for none (left out, the block shows its install session). */
  aside?: ReactNode;
  /** Rendered over the copy (decoration such as live cursors); the copy block is its positioning context. */
  overlay?: ReactNode;
  /** Rendered under the description, in the copy column (a row of chips, say). */
  below?: ReactNode;
  primaryAction?: GridHeroAction | null;
  secondaryAction?: GridHeroAction | null;
  sessionHint?: string;
  sessionLines?: readonly string[];
  sessionTitle?: string;
  /** The heading's content: a string, or text with elements in it (a word that retypes itself, say). */
  title?: ReactNode;
}

const defaultLines = [
  `${brand.name} library`,
  "Editable React + TypeScript",
  "Accessible React Aria controls",
  "Light and Dark appearances",
] as const;

/** A developer-oriented hero with a finite receding grid and an honest copyable command. */
export const GridHero = ({
  accent = "your next interface.",
  className,
  command = "pnpm dlx shadcn@4.21.4 add @opendesigns/velora-hero-grid",
  description = "Bring a considered layout into your project. Keep the source close, use a shared foundation, and make the experience your own.",
  eyebrow = `${brand.name} · Source you can shape`,
  headingLevel: Heading = "h1",
  aside,
  below,
  onCopyCommand,
  overlay,
  primaryAction = null,
  secondaryAction = null,
  sessionHint = "",
  sessionLines = defaultLines,
  sessionTitle = "Your next project",
  title = "A shared foundation for",
}: GridHeroProps) => {
  useBrandName();
  const headingId = useId();
  const root = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const accentRef = useRef<HTMLSpanElement>(null);
  const session = useRef<HTMLDivElement>(null);

  useSectionSequence(root, (elapsed) => {
    const plane = grid.current;
    const ending = accentRef.current;
    const lines = session.current?.querySelectorAll<HTMLElement>(
      "[data-transcript-line]"
    );
    if (!plane) {
      return;
    }
    const characters = [...accent];
    const transcript = sessionLines.map((line) => [...line]);
    const total = transcript.reduce(
      (length, line) => length + Math.max(1, line.length),
      0
    );
    plane.style.transform = `translateY(${(elapsed / 4600) * 48}px)`;
    const headingProgress = Math.min(1, elapsed / 1200);
    if (ending) {
      ending.textContent = characters
        .slice(0, Math.max(1, Math.ceil(characters.length * headingProgress)))
        .join("");
    }
    let available = Math.floor(
      total * Math.min(1, Math.max(0, (elapsed - 500) / 3100))
    );
    for (const [index, line] of (lines ?? []).entries()) {
      const content = transcript[index] ?? [];
      line.textContent = content.slice(0, Math.max(0, available)).join("");
      available -= Math.max(1, content.length);
    }
  });

  return (
    <section
      ref={root}
      aria-labelledby={headingId}
      className={cn("velora-grid-hero", className)}
    >
      <div className="velora-grid-backdrop" aria-hidden="true">
        <div className="velora-grid-perspective">
          <div ref={grid} className="velora-grid-plane" />
        </div>
      </div>
      <div className="velora-grid-copy-content">
        {eyebrow && (
          <p className="velora-grid-eyebrow">

            {eyebrow}
          </p>
        )}
        <Heading id={headingId} className="velora-grid-title">
          {title}{" "}
          {accent && (
            <>
              <span className="sr-only">{accent}</span>
              <span className="velora-grid-accent-slot" aria-hidden="true">
                <span className="velora-grid-accent-measure">{accent}</span>
                <span ref={accentRef} className="velora-grid-accent">
                  {accent}
                </span>
              </span>
            </>
          )}
        </Heading>
        <p className="velora-grid-description">{description}</p>
        {(primaryAction || secondaryAction) && (
        <div className="velora-grid-actions">
          {primaryAction && (
          <LinkButton
            href={primaryAction.href}
            size="cta"
            className="max-w-full"
          >
            <span className="min-w-0 text-balance whitespace-normal">
              {primaryAction.label}
            </span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              aria-hidden="true"
              data-icon="inline-end"
            />
          </LinkButton>
          )}
          {secondaryAction && (
            <LinkButton
              href={secondaryAction.href}
              size="cta"
              variant="outline"
              className="max-w-full"
            >
              <HugeiconsIcon
                icon={BookOpen01Icon}
                aria-hidden="true"
                data-icon="inline-start"
              />
              <span className="min-w-0 text-balance whitespace-normal">
                {secondaryAction.label}
              </span>
            </LinkButton>
          )}
        </div>
        )}
        {below}
        {overlay}
      </div>
      {aside === null ? null : aside ? (
        <div className="velora-grid-aside">{aside}</div>
      ) : (
      <InstallSession
        command={command}
        hint={sessionHint}
        lines={sessionLines}
        onCopyCommand={onCopyCommand}
        sessionRef={session}
        title={sessionTitle}
      />
      )}
    </section>
  );
};
