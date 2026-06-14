import type { HTMLAttributes } from "react";
import { clsx } from "@/lib/cx";

type Tone = "neutral" | "primary" | "success" | "warning";

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

const TONES: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-text-mid",
  primary: "bg-primary-light text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export function Badge({ tone = "neutral", className, ...rest }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...rest}
    />
  );
}
