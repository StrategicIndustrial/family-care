import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/webpush";

const TIMEZONE = "Australia/Perth";
// Cron fires every 15 minutes — a reminder is "due" if its scheduled
// time falls within the window since the last run, so a slot never
// gets skipped between runs and never fires twice for the same slot.
const WINDOW_MINUTES = 15;

function perthNow(): { dateStr: string; minutesSinceMidnight: number } {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const minutesSinceMidnight = Number(get("hour")) * 60 + Number(get("minute"));
  return { dateStr, minutesSinceMidnight };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dateStr, minutesSinceMidnight } = perthNow();
  const admin = getSupabaseServiceClient();

  const [{ data: medications }, { data: recipients }] = await Promise.all([
    admin.from("medications").select("id, name, dosage, reminder_times").eq("is_active", true),
    admin.from("profiles").select("id").in("role", ["patient", "primary_carer"]),
  ]);

  const dueSlots = (medications ?? []).flatMap((med) =>
    (med.reminder_times ?? [])
      .filter((t) => {
        const diff = minutesSinceMidnight - toMinutes(t);
        return diff >= 0 && diff < WINDOW_MINUTES;
      })
      .map((time) => ({ medication: med, time })),
  );

  if (dueSlots.length === 0 || !recipients || recipients.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  for (const { medication } of dueSlots) {
    const dayStart = `${dateStr}T00:00:00+08:00`;
    const { data: alreadyLogged } = await admin
      .from("medication_logs")
      .select("id")
      .eq("medication_id", medication.id)
      .gte("taken_at", dayStart)
      .limit(1)
      .maybeSingle();
    if (alreadyLogged) continue;

    await Promise.all(
      recipients.map((r) =>
        sendPushToUser(r.id, {
          title: "Medication reminder",
          body: `Time for ${medication.name} (${medication.dosage})`,
          url: "/mum",
          tag: `medication-${medication.id}`,
        }),
      ),
    );
    sent += recipients.length;
  }

  return NextResponse.json({ sent, dueSlots: dueSlots.length });
}
