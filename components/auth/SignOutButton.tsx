import { signOut } from "@/app/actions/auth";

export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-xs font-bold text-white/85 hover:text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition-colors"
      >
        {label}
      </button>
    </form>
  );
}
