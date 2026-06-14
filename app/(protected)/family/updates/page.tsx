import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { UpdatePost } from "@/components/shared/UpdatePost";
import { FamilyUpdateComposer } from "@/components/family/FamilyUpdateComposer";

export const dynamic = "force-dynamic";

export default async function FamilyUpdates() {
  const admin = getSupabaseServiceClient();
  const { data: updates } = await admin
    .from("updates")
    .select(`
      id, body, is_flagged, created_at,
      author:profiles!updates_author_id_fkey ( preferred_name, avatar_url )
    `)
    .order("is_flagged", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="flex-1 px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-text-dark">Updates</h1>
          <p className="text-text-mid">Flagged updates appear first.</p>
        </header>

        <FamilyUpdateComposer />

        <div className="space-y-3">
          {(updates ?? []).length === 0 ? (
            <p className="text-sm text-text-mid">No updates yet — add one to get started.</p>
          ) : (
            (updates ?? []).map((u) => (
              <UpdatePost
                key={u.id}
                body={u.body}
                authorName={u.author?.preferred_name ?? "Someone"}
                authorAvatarUrl={u.author?.avatar_url}
                createdAt={u.created_at}
                flagged={u.is_flagged}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
