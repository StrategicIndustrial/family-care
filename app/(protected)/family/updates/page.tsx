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
    <main className="flex-1 pb-24 anim-fade-in">
      <header className="hdr-sky px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-extrabold text-white">Updates</h1>
          <p className="text-sm text-white/85 mt-1">Family activity feed</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-4">
        <FamilyUpdateComposer />

        <div className="space-y-3">
          {(updates ?? []).length === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              <p className="text-sm text-text-mid">No updates yet — add one to get started.</p>
            </div>
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
