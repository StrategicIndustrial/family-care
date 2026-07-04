import { clsx } from "@/lib/cx";
import { initials } from "@/lib/format";

type Size = "sm" | "md" | "lg" | "xl";

type Props = {
  name: string;
  url?: string | null;
  emoji?: string;                          // design-system uses emoji per role
  bg?: string;                              // hex background for emoji tile
  size?: Size;
  className?: string;
};

const SIZES: Record<Size, string> = {
  sm: "h-8  w-8  text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-14 w-14 text-2xl",
};

// Colour rotation for initials — matches the pastel avatar tiles in the design.
const INITIAL_BG = [
  { bg: "#fde8e0", fg: "#c07060" }, // peach
  { bg: "#ddeef5", fg: "#5090b0" }, // sky
  { bg: "#e8e0f5", fg: "#7b5ea7" }, // lavender
  { bg: "#e8f5e9", fg: "#4a8060" }, // sage
  { bg: "#fdf5e0", fg: "#8a6020" }, // wheat
];

function colourForName(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return INITIAL_BG[h % INITIAL_BG.length];
}

export function Avatar({ name, url, emoji, bg, size = "md", className }: Props) {
  const base = "inline-flex items-center justify-center rounded-full font-bold shrink-0";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={clsx("rounded-full object-cover shrink-0", SIZES[size], className)}
      />
    );
  }

  if (emoji) {
    return (
      <span
        aria-label={name}
        className={clsx(base, SIZES[size], className)}
        style={{ background: bg ?? "#e8e0f5" }}
      >
        {emoji}
      </span>
    );
  }

  const c = colourForName(name);
  return (
    <span
      aria-label={name}
      className={clsx(base, SIZES[size], className)}
      style={{ background: c.bg, color: c.fg }}
    >
      {initials(name)}
    </span>
  );
}
