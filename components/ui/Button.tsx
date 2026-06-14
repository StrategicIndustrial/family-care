import type { ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "large" | "success" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary/90 active:bg-primary/80 " +
    "rounded-lg px-4 py-3 font-medium text-base",
  secondary:
    "border border-line bg-white text-text-dark hover:bg-zinc-50 " +
    "rounded-lg px-4 py-3 font-medium text-base",
  // Mum's view — brief §9: 64px min height, 20px text
  large:
    "bg-primary text-white hover:bg-primary/90 active:bg-primary/80 " +
    "rounded-2xl px-6 min-h-16 text-xl font-medium",
  success:
    "bg-success text-white hover:bg-success/90 " +
    "rounded-lg px-4 py-3 font-medium text-base",
  ghost:
    "text-text-mid hover:text-text-dark underline underline-offset-4 " +
    "px-2 py-1 text-sm",
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-2",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        VARIANT_CLASSES[variant],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    />
  );
}
