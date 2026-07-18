import Link from "next/link";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import { MedicationForm } from "@/components/family/MedicationForm";
import { MedicationList } from "@/components/family/MedicationList";
import { PushSubscribeButton } from "@/components/shared/PushSubscribeButton";

export const dynamic = "force-dynamic";

export default async function MumMedications() {
  await requireRole("patient");

  const admin = getSupabaseServiceClient();
  const { data: medications } = await admin
    .from("medications")
    .select("*")
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });

  return (
    <main className="flex-1 pb-28 anim-fade-in">
      <header className="hdr-peach-soft px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/mum/medical" className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center shrink-0" aria-label="Back">
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
              <path d="M8 2L2 8l6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <h1 className="text-2xl font-extrabold text-white">Your Medications</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-4">
        <PushSubscribeButton />
        <MedicationForm />
        <MedicationList medications={medications ?? []} />
      </div>
    </main>
  );
}
