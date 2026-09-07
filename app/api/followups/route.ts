import { NextResponse } from "next/server";
import { readDb } from "@/lib/store";
import { generateFollowUpSchedule } from "@/lib/followup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDb();
  const delivered = db.leads.filter((l) => l.deliveryDate);

  const timelines = delivered.map((lead) => ({
    lead,
    events: generateFollowUpSchedule(lead),
  }));

  const allEvents = timelines.flatMap((t) => t.events);
  const summary = {
    total: allEvents.length,
    dueToday: allEvents.filter((e) => e.status === "예정").length,
    done: allEvents.filter((e) => e.status === "완료").length,
    pending: allEvents.filter((e) => e.status === "대기").length,
    // 광고성 메시지인데 수신동의가 없어 발송이 막힌 건수
    blocked: allEvents.filter((e) => e.status === "발송불가").length,
  };

  return NextResponse.json({ timelines, summary });
}
