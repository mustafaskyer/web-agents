/** Inline 16×16 icons (stroke = currentColor). Decorative: the controls carry the names. */
import type { ReactNode } from "react";

const Svg = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const CursorIcon = () => (
  <Svg>
    <path d="M3 2.5 12.5 7 8.2 8.2 6.8 12.8Z" fill="currentColor" />
  </Svg>
);
export const CloseIcon = () => (
  <Svg>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Svg>
);
export const DockBottomIcon = () => (
  <Svg>
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <path d="M2 9.5h12" />
  </Svg>
);
export const DockRightIcon = () => (
  <Svg>
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <path d="M9.5 2.5v11" />
  </Svg>
);
export const ChevronIcon = () => (
  <svg className="chevron" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M3.5 2 6.5 5 3.5 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const PlayIcon = () => (
  <Svg>
    <path d="M5 3.5v9l7-4.5Z" fill="currentColor" />
  </Svg>
);
export const LocateIcon = () => (
  <Svg>
    <circle cx="8" cy="8" r="4.5" />
    <path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15" />
  </Svg>
);
export const CopyIcon = () => (
  <Svg>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" />
  </Svg>
);

/** Status glyphs for the timeline; the status text beside them is what screen readers hear. */
export function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "running":
      return (
        <svg className="spin" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
          <path d="M13.5 8A5.5 5.5 0 0 0 8 2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "waiting":
      return (
        <Svg>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M6.5 6v4M9.5 6v4" />
        </Svg>
      );
    case "ok":
      return (
        <Svg>
          <path d="m3.5 8.5 3 3 6-7" />
        </Svg>
      );
    case "error":
      return (
        <Svg>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 5v3.5M8 11h0" />
        </Svg>
      );
    default:
      return (
        <Svg>
          <circle cx="8" cy="8" r="5.5" />
          <path d="m4.2 11.8 7.6-7.6" />
        </Svg>
      );
  }
}
