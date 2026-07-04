import type { HTMLAttributes } from "react";
import { clsx } from "@/lib/cx";

type Tone =
  | "sage" | "peach" | "lavender" | "sky" | "neutral"
  | "primary" | "success" | "warning";

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

const TONES: Record<Tone, string> = {
  sage:     "bg-sage-50    text-sage-text",
  peach:    "bg-peach-100  text-peach-600",
  lavender: "bg-lavender-100 text-lavender-600",
  sky:      "bg-sky-100    text-sky-500",
  neutral:  "bg-white/70   text-text-mid",
  // Legacy aliases
  primary:  "bg-sage-50    text-sage-text",
  success:  "bg-sage-50    text-sage-text",
  warning:  "bg-peach-100  text-peach-600",
};

export function Badge({ tone = "neutral", className, ...rest }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5",
        "text-xs font-bold",
        TONES[tone],
        className,
      )}
      {...rest}
    />
  );
}
