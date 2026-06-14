// Tiny class-name joiner — keeps Tailwind composition tidy without pulling in clsx.
export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
