import { BottomTabs } from "@/components/family/BottomTabs";

// Family-route shell with bottom tabs. Both family role + Dad use these
// pages (tasks, appointments, updates, profile); Dad gets his own home
// tab via the layout in /dad.
export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col pb-20">
      {children}
      <BottomTabs homeHref="/family" />
    </div>
  );
}
