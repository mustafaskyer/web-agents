/** 20px line icons: currentColor, hidden from assistive tech (the control names itself). */
import type { ReactNode, SVGProps } from "react";

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlaneIcon = () => (
  <Icon>
    <path d="M2 16l20-8-6 13-3-5-11 0z" />
  </Icon>
);
export const SwapIcon = () => (
  <Icon>
    <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
  </Icon>
);
export const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
export const MinusIcon = () => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
);
export const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const FilterIcon = () => (
  <Icon>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Icon>
);
export const CheckIcon = () => (
  <Icon>
    <path d="m5 12 5 5L20 7" />
  </Icon>
);
export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const ShieldIcon = () => (
  <Icon>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
  </Icon>
);
export const TagIcon = () => (
  <Icon>
    <path d="M3 12V4h8l10 10-8 8L3 12z" />
    <circle cx="7.5" cy="8" r="1.5" />
  </Icon>
);
export const ClockIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
export const HeadsetIcon = () => (
  <Icon>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="3" y="14" width="4" height="6" rx="1.5" />
    <rect x="17" y="14" width="4" height="6" rx="1.5" />
  </Icon>
);
export const BagIcon = () => (
  <Icon>
    <rect x="5" y="7" width="14" height="13" rx="2" />
    <path d="M9 7V5h6v2" />
  </Icon>
);
