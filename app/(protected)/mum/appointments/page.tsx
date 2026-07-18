import { redirect } from "next/navigation";

// Superseded by the merged calendar at /mum/tasks (appointments + her own
// tasks together). Kept as a redirect rather than deleted outright in
// case anything still links here.
export default function MumAppointmentsRedirect() {
  redirect("/mum/tasks");
}
