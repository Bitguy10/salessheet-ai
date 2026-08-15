// Minimal functional icons (inline SVG, currentColor stroke). No icon library
// dependency; these are UI affordances, not decoration.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, strokeWidth = 1.6, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

/** Brand mark: a small structured grid with one amber (AI) cell. */
export function Logo({ size = 22, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.4" />
      <line x1="9" y1="9" x2="9" y2="21" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9.7" y="9.7" width="4.6" height="4.6" fill="var(--amber)" />
    </svg>
  );
}

export const UploadIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <path d="M12 15V4M12 4l-4 4M12 4l4 4" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const ClipboardIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <rect x="6" y="4" width="12" height="17" rx="2" />
    <path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V4Z" />
  </svg>
);

export const SparkIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <path d="M12 3l1.6 4.9L18.5 9.5 13.6 11 12 16l-1.6-5L5.5 9.5l4.9-1.6L12 3Z" />
  </svg>
);

export const FlagIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <path d="M5 21V4M5 4h11l-2 3 2 3H5" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <path d="M12 3l9 16H3L12 3Z" />
    <line x1="12" y1="10" x2="12" y2="14" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.5" y2="16.5" />
  </svg>
);

export const SendIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <path d="M4 12h14M12 5l7 7-7 7" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <path d="M12 4v11M12 15l-4-4M12 15l4-4" />
    <path d="M5 20h14" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

export const ChevronDown = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const SortIcon = ({ dir, ...p }: IconProps & { dir?: "asc" | "desc" | null }) => (
  <svg {...base(p)} aria-hidden>
    {dir === "asc" ? (
      <path d="M12 19V5M12 5l-5 5M12 5l5 5" />
    ) : dir === "desc" ? (
      <path d="M12 5v14M12 19l-5-5M12 19l5-5" />
    ) : (
      <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
    )}
  </svg>
);

export const TableIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="9" y1="10" x2="9" y2="20" />
  </svg>
);

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <line x1="4" y1="20" x2="20" y2="20" />
    <rect x="6" y="11" width="3" height="7" />
    <rect x="11" y="6" width="3" height="12" />
    <rect x="16" y="14" width="3" height="4" />
  </svg>
);

export const ArrowRight = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <path d="M4 12l5 5L20 6" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </svg>
);

export const MessageIcon = (p: IconProps) => (
  <svg {...base(p)} aria-hidden>
    <path d="M4 5h16v11H8l-4 4V5Z" />
  </svg>
);

export const SpinnerIcon = ({ size = 18, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.4" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
