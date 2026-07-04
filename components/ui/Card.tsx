import type { HTMLAttributes } from "react";
import { clsx } from "@/lib/cx";

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Optional visual accent — pulls a soft coloured wash from the palette. */
  accent?: "sage" | "peach" | "lavender" | "sky";
  padding?: "sm" | "md" | "lg";
};

const ACCENTS = {
  sage:     "bg-sage-50 border-sage-100/60",
  peach:    "bg-peach-100 border-peach-200/60",
  lavender: "bg-lavender-100 border-lavender-200/60",
  sky:      "bg-sky-100 border-sky-200/60",
} as const;

const PADDINGS = { sm: "p-3", md: "p-4", lg: "p-5" } as const;

export function Card({
  accent, className, padding = "md", ...rest
}: Props) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-transparent bg-white",
        "shadow-[0_2px_10px_rgba(0,0,0,0.06)]",
        PADDINGS[padding],
        accent && ACCENTS[accent],
        className,
      )}
      {...rest}
    />
  );
}
