"use client";

import { useTransition } from "react";
import { deleteAppointment } from "@/app/actions/appointments";

export function DeleteAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Delete this appointment? This can't be undone.")) return;
    const fd = new FormData();
    fd.set("id", appointmentId);
    // deleteAppointment redirects to /family/appointments on success — no
    // further client-side navigation needed.
    startTransition(() => deleteAppointment(fd));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs font-bold text-red-500 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete appointment"}
    </button>
  );
}
