import type { ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/cx";

// New palette variants + legacy aliases kept for older call-sites during the
// visual reskin.
type Variant =
  | "sage" | "peach" | "lavender" | "sky" | "outline" | "ghost"
  | "primary" | "secondary" | "success" | "large";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  sage:
    "cta-sage text-white shadow-[0_4px_16px_rgba(93,168,130,0.3)] hover:brightness-105 active:brightness-95",
  peach:
    "cta-peach text-white shadow-[0_4px_16px_rgba(232,149,106,0.3)] hover:brightness-105 active:brightness-95",
  lavender:
    "cta-lavender text-white shadow-[0_4px_16px_rgba(138,123,192,0.3)] hover:brightness-105 active:brightness-95",
  sky:
    "bg-sky-500 text-white shadow-[0_4px_16px_rgba(106,158,192,0.3)] hover:brightness-105 active:brightness-95",
  outline:
    "bg-transparent border-2 border-sage-100 text-sage-600 hover:bg-sage-50",
  ghost:
    "bg-transparent text-text-mid hover:text-text-dark",
  // Legacy aliases
  primary:
    "cta-sage text-white shadow-[0_4px_16px_rgba(93,168,130,0.3)] hover:brightness-105 active:brightness-95",
  success:
    "cta-sage text-white shadow-[0_4px_16px_rgba(93,168,130,0.3)] hover:brightness-105 active:brightness-95",
  secondary:
    "bg-transparent border-2 border-sage-100 text-sage-600 hover:bg-sage-50",
  large:
    "cta-sage text-white shadow-[0_4px_16px_rgba(93,168,130,0.3)] hover:brightness-105 active:brightness-95",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-4 py-2 text-sm rounded-xl",
  md: "px-5 py-3 text-base rounded-2xl",
  lg: "px-6 py-4 text-lg rounded-2xl",
};

export function Button({
  variant = "sage",
  size = "md",
  fullWidth = false,
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-bold",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500/40",
        "transition-all",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    />
  );
}
