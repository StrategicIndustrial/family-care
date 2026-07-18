import { PatientBottomTabs } from "@/components/mum/PatientBottomTabs";

export default function MumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col pb-20">
      {children}
      <PatientBottomTabs />
    </div>
  );
}
