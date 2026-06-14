import { signOut } from "@/app/actions/auth";

export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-sm text-text-mid hover:text-text-dark underline underline-offset-4"
      >
        {label}
      </button>
    </form>
  );
}
