"use client";

import { useEffect, useId, useRef } from "react";

import { useBrandName } from "../_shared/brand";
import { useSectionSequence } from "../_shared/use-section-sequence";
import { normalizeWordmark, WORDMARK_DRAW_MS, wordmarkPhase } from "./graphic";
import { useWordmarkSpotlight } from "./use-wordmark-spotlight";

const Word = ({
  className,
  fill = "none",
  strokeWidth,
}: {
  className: string;
  fill?: string;
  strokeWidth: number;
}) => {
  const brandName = useBrandName();
  return (
    <text
      className={className}
      x="12"
      y="88"
      fontSize="100"
      textLength="696"
      lengthAdjust="spacingAndGlyphs"
      fill={fill}
      strokeWidth={strokeWidth}
    >
      {brandName}
    </text>
  );
};

export const FooterWordmarkArtwork = ({
  revealRadius,
  strokeWidth,
}: {
  revealRadius?: number;
  strokeWidth?: number;
}) => {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const settings = normalizeWordmark(revealRadius, strokeWidth);
  useWordmarkSpotlight(svg);
  useSectionSequence(
    root,
    (elapsed) => {
      const element = svg.current;
      if (element) {
        element.style.setProperty(
          "--velora-wordmark-draw",
          String(wordmarkPhase(elapsed))
        );
        element.dataset.wordmarkTime = String(
          wordmarkPhase(elapsed) * WORDMARK_DRAW_MS
        );
      }
    },
    WORDMARK_DRAW_MS
  );
  useEffect(() => {
    const element = svg.current;
    return () => {
      element?.style.removeProperty("--velora-wordmark-draw");
      if (element) {
        delete element.dataset.wordmarkTime;
      }
    };
  }, []);
  return (
    <div ref={root} className="velora-wordmark-artwork">
      <svg
        ref={svg}
        aria-hidden="true"
        focusable="false"
        width="720"
        height="116"
        viewBox="0 0 720 116"
        className="velora-wordmark-svg"
      >
        <defs>
          <radialGradient
            id={`${id}-spot`}
            data-wordmark-spot=""
            cx="50%"
            cy="50%"
            r={`${settings.radius}%`}
          >
            <stop offset="0%" stopColor="var(--foreground)" />
            <stop
              offset="55%"
              stopColor="var(--foreground)"
              stopOpacity="0.6"
            />
            <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0" />
          </radialGradient>
          <mask id={`${id}-mask`} className="velora-wordmark-mask">
            <rect width="100%" height="100%" fill={`url(#${id}-spot)`} />
          </mask>
        </defs>
        <rect width="720" height="116" fill="transparent" />
        <Word className="velora-wordmark-base" strokeWidth={settings.stroke} />
        <Word className="velora-wordmark-trace" strokeWidth={settings.stroke} />
        <g mask={`url(#${id}-mask)`} className="velora-wordmark-reveal">
          <Word
            className="velora-wordmark-lit"
            fill="var(--primary)"
            strokeWidth={settings.stroke * 1.5}
          />
        </g>
      </svg>
    </div>
  );
};
