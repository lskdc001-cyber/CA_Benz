import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/store";
import { LEAD_STAGES, type LeadStage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { stage, notes, deliveryDate } = body as {
    stage?: LeadStage;
    notes?: string;
    deliveryDate?: string;
  };

  if (stage && !LEAD_STAGES.includes(stage)) {
    return NextResponse.json({ error: "유효하지 않은 단계입니다." }, { status: 400 });
  }

  const db = readDb();
  const lead = db.leads.find((l) => l.id === params.id);
  if (!lead) {
    return NextResponse.json({ error: "리드를 찾을 수 없습니다." }, { status: 404 });
  }

  if (stage) lead.stage = stage;
  if (notes !== undefined) lead.notes = notes;
  if (deliveryDate !== undefined) lead.deliveryDate = deliveryDate;
  if (stage === "출고완료" && !lead.deliveryDate) {
    lead.deliveryDate = new Date().toISOString().slice(0, 10);
  }
  lead.updatedAt = new Date().toISOString();

  writeDb(db);
  return NextResponse.json({ lead });
}
