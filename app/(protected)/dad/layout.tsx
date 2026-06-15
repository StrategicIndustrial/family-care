import { BottomTabs } from "@/components/family/BottomTabs";

// Dad uses the same coordination pages as the family role for tasks,
// appointments, updates, and profile — the (protected) parent layout
// allows primary_carer on /family/* routes for this reason.
export default function DadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col pb-20">
      {children}
      <BottomTabs homeHref="/dad" />
    </div>
  );
}
