import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, nextId } from "@/lib/store";
import { CONSENT_CHANNELS, NO_CONSENT } from "@/lib/types";
import type { ConsentChannel, Lead, LeadSource, LeadStage, MarketingConsent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDb();
  return NextResponse.json({ leads: db.leads });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, model, source, notes, consent } = body as {
    name?: string;
    phone?: string;
    model?: string;
    source?: LeadSource;
    notes?: string;
    consent?: { agreed?: boolean; channels?: ConsentChannel[] };
  };

  if (!name || !model) {
    return NextResponse.json({ error: "name과 model은 필수입니다." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const marketingConsent: MarketingConsent = consent?.agreed
    ? {
        agreed: true,
        recordedAt: now,
        channels: (consent.channels || []).filter((ch) => CONSENT_CHANNELS.includes(ch)),
      }
    : { ...NO_CONSENT, recordedAt: now };

  const lead: Lead = {
    id: nextId("lead"),
    name,
    phone: phone || "",
    model,
    stage: "신규문의" as LeadStage,
    source: source || "직접등록",
    notes: notes || "",
    consent: marketingConsent,
    createdAt: now,
    updatedAt: now,
  };

  const db = readDb();
  db.leads.unshift(lead);
  writeDb(db);

  return NextResponse.json({ lead }, { status: 201 });
}
