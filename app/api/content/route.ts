import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, nextId } from "@/lib/store";
import { generateContent, isAiConfigured } from "@/lib/ai";
import type { ContentPiece, ContentRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDb();
  const history = [...db.contentRequests].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json({ history, aiConfigured: isAiConfigured() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { model, promo, tone, channels } = body as {
    model?: string;
    promo?: string;
    tone?: string;
    channels?: ContentPiece["channel"][];
  };

  if (!model || !promo || !channels || channels.length === 0) {
    return NextResponse.json(
      { error: "차종, 프로모션 메시지, 채널을 모두 입력해주세요." },
      { status: 400 }
    );
  }

  const pieces = await generateContent(model, promo, tone || "신뢰감 있는 전문가", channels);

  const request: ContentRequest = {
    id: nextId("content"),
    model,
    promo,
    tone: tone || "신뢰감 있는 전문가",
    channels,
    pieces,
    createdAt: new Date().toISOString(),
  };

  const db = readDb();
  db.contentRequests.unshift(request);
  writeDb(db);

  return NextResponse.json({ request, aiConfigured: isAiConfigured() }, { status: 201 });
}
