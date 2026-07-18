import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import {
  buildApptBody,
  buildCsv,
  buildPdf,
  capitalize,
  prettifyCategory,
  type ExportFormat,
  type ExportType,
  type FlatEntry,
} from "@/lib/chronicle-export";

type RequestBody = {
  from?: string;
  to?: string;
  types?: ExportType[];
  format?: ExportFormat;
};

export async function POST(req: Request) {
  const ctx = await requireRole("primary_carer", "family");

  const body = (await req.json().catch(() => ({}))) as RequestBody;
  const { from, to, types, format } = body;

  if (!from || !to || !types || types.length === 0 || !format) {
    return NextResponse.json({ error: "Missing required parameters: from, to, types, format" }, { status: 400 });
  }
  if (!["pdf", "csv"].includes(format)) {
    return NextResponse.json({ error: "Invalid format — must be 'pdf' or 'csv'" }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: "Start date must be before the end date" }, { status: 400 });
  }

  const admin = getSupabaseServiceClient();
  const includeNotes = types.includes("note");
  const includeObs = types.includes("observation");
  const includeAppts = types.includes("appointment");

  const [notesRes, obsRes, apptRes] = await Promise.all([
    includeNotes
      ? admin.from("medical_notes").select("category, date, body, author:profiles!medical_notes_author_id_fkey(preferred_name)").gte("date", from).lte("date", to).order("date", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    includeObs
      ? admin.from("observations").select("type, body, created_at, visibility, author_id, author:profiles!observations_author_id_fkey(preferred_name)").gte("created_at", `${from}T00:00:00Z`).lte("created_at", `${to}T23:59:59Z`).or(`visibility.neq.private,author_id.eq.${ctx.userId}`).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    includeAppts
      ? admin.from("appointments").select("title, appointment_date, appointment_time, specialist, location").gte("appointment_date", from).lte("appointment_date", to).order("appointment_date", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (notesRes.error) return NextResponse.json({ error: notesRes.error.message }, { status: 500 });
  if (obsRes.error) return NextResponse.json({ error: obsRes.error.message }, { status: 500 });
  if (apptRes.error) return NextResponse.json({ error: apptRes.error.message }, { status: 500 });

  const entries: FlatEntry[] = [
    ...(notesRes.data ?? []).map((n) => ({
      date: n.date,
      type: "Note" as const,
      category: prettifyCategory(n.category),
      body: n.body,
      author: n.author?.preferred_name ?? "Unknown",
    })),
    ...(obsRes.data ?? []).map((o) => ({
      date: o.created_at.slice(0, 10),
      type: "Observation" as const,
      category: capitalize(o.type),
      body: o.body,
      author: o.author?.preferred_name ?? "Unknown",
    })),
    ...(apptRes.data ?? []).map((a) => ({
      date: a.appointment_date,
      type: "Appointment" as const,
      category: "Appointment",
      body: buildApptBody(a),
      author: "—",
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const exportDate = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const filename = `care-chronicle-${from}-to-${to}`;

  if (format === "csv") {
    const csv = buildCsv(entries);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const pdfBytes = await buildPdf(entries, from, to, exportDate);
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
