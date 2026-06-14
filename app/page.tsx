// Step 5 of the brief replaces this with the magic-link landing page.
// For now: a holding screen so the design tokens can be verified.
export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-text-dark">Family Care</h1>
        <p className="text-text-mid">Scaffold ready. Sign-in coming next.</p>
        <div className="rounded-xl border border-line bg-primary-light p-4 text-primary">
          Palette wired up ✓
        </div>
      </div>
    </main>
  );
}
