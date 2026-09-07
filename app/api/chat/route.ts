import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, nextId } from "@/lib/store";
import { chatReply, isAiConfigured } from "@/lib/ai";
import type { ChatMessage, ChatSession, Lead } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDb();
  const sessions = [...db.chatSessions].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return NextResponse.json({ sessions, aiConfigured: isAiConfigured() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, leadName, channel, userMessage } = body as {
    sessionId?: string;
    leadName?: string;
    channel?: ChatSession["channel"];
    userMessage: string;
  };

  if (!userMessage || !userMessage.trim()) {
    return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }

  const db = readDb();
  const now = new Date().toISOString();

  let session = sessionId ? db.chatSessions.find((s) => s.id === sessionId) : undefined;
  if (!session) {
    session = {
      id: nextId("chat"),
      leadName: leadName || "익명 고객",
      channel: channel || "카카오채널",
      messages: [],
      handoff: false,
      createdAt: now,
      updatedAt: now,
    };
    db.chatSessions.unshift(session);
  }

  const userMsg: ChatMessage = { role: "user", text: userMessage.trim(), at: now };
  session.messages.push(userMsg);

  const { text, handoff } = await chatReply(session.messages);
  const assistantMsg: ChatMessage = { role: "assistant", text, at: new Date().toISOString() };
  session.messages.push(assistantMsg);
  session.updatedAt = assistantMsg.at;

  if (handoff && !session.handoff) {
    session.handoff = true;

    // 상담 이력을 CRM 리드로 자동 등록/갱신
    let lead = session.leadId ? db.leads.find((l) => l.id === session!.leadId) : undefined;
    if (!lead) {
      lead = db.leads.find((l) => l.name === session!.leadName && l.stage !== "출고완료");
    }
    if (!lead) {
      const newLead: Lead = {
        id: nextId("lead"),
        name: session.leadName,
        phone: "",
        model: "미확인 (상담 내용 참고)",
        stage: "상담중",
        source: "AI봇",
        notes: `AI 상담봇 대화 인계: "${userMsg.text}"`,
        createdAt: now,
        updatedAt: now,
      };
      db.leads.unshift(newLead);
      lead = newLead;
    } else {
      lead.stage = lead.stage === "신규문의" ? "상담중" : lead.stage;
      lead.notes = `${lead.notes ? lead.notes + " / " : ""}AI 상담봇 인계: "${userMsg.text}"`;
      lead.updatedAt = new Date().toISOString();
    }
    session.leadId = lead.id;
  }

  writeDb(db);

  return NextResponse.json({
    sessionId: session.id,
    reply: assistantMsg.text,
    handoff: session.handoff,
    leadId: session.leadId,
    aiConfigured: isAiConfigured(),
  });
}
