import type { HTMLAttributes } from "react";
import { clsx } from "@/lib/cx";

type Props = HTMLAttributes<HTMLDivElement> & {
  // Mum's view uses warmer card styling; default for everyone else.
  variant?: "default" | "warm";
};

export function Card({ variant = "default", className, ...rest }: Props) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-line p-4",
        variant === "warm" ? "bg-white shadow-sm" : "bg-white",
        className,
      )}
      {...rest}
    />
  );
}
