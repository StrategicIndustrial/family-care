import { BottomTabs } from "@/components/family/BottomTabs";

// Family-role layout: standard mobile app shell with bottom tabs.
// The (protected) parent layout has already enforced auth + role + PIN.
export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col pb-20">
      {children}
      <BottomTabs />
    </div>
  );
}
