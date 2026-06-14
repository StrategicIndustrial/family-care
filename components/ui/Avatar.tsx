import { clsx } from "@/lib/cx";
import { initials } from "@/lib/format";

type Size = "sm" | "md" | "lg";

type Props = {
  name: string;
  url?: string | null;
  size?: Size;
  className?: string;
};

const SIZES: Record<Size, string> = {
  sm: "h-8  w-8  text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({ name, url, size = "md", className }: Props) {
  if (url) {
    // Use plain <img> rather than next/image — avatars are tiny user-uploaded
    // URLs we don't want to optimise through Vercel's image pipeline.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={clsx("rounded-full object-cover", SIZES[size], className)}
      />
    );
  }
  return (
    <span
      aria-label={name}
      className={clsx(
        "inline-flex items-center justify-center rounded-full bg-primary-light text-primary font-medium",
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
