"use client";

import { useEffect, useState } from "react";
import { LEAD_STAGES, type Lead, type LeadSource, type LeadStage } from "@/lib/types";

const SOURCE_CLASS: Record<LeadSource, string> = {
  AI봇: "src-bot",
  홈페이지: "src-web",
  지인소개: "src-intro",
  직접등록: "src-manual",
};

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", model: "" });
  const [submitting, setSubmitting] = useState(false);

  async function loadLeads() {
    setLoading(true);
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads(data.leads || []);
    setLoading(false);
  }

  useEffect(() => {
    loadLeads();
  }, []);

  async function moveStage(lead: Lead, direction: 1 | -1) {
    const idx = LEAD_STAGES.indexOf(lead.stage);
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= LEAD_STAGES.length) return;
    const nextStage = LEAD_STAGES[nextIdx];

    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage: nextStage } : l)));
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: nextStage }),
    });
    loadLeads();
  }

  async function addLead(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.model.trim()) return;
    setSubmitting(true);
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, phone: form.phone, model: form.model, source: "직접등록" }),
    });
    setForm({ name: "", phone: "", model: "" });
    setSubmitting(false);
    loadLeads();
  }

  return (
    <section className="panel">
      <div className="page-head">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1>리드 / 고객 관리</h1>
          <p className="page-desc">신규 문의부터 출고까지 전체 진행 단계를 한 화면에서 관리합니다.</p>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title">
          <h2>신규 리드 직접 등록</h2>
        </div>
        <form className="new-lead-form" onSubmit={addLead}>
          <div className="field">
            <label htmlFor="lead-name">고객명</label>
            <input
              id="lead-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 김O훈"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="lead-phone">연락처</label>
            <input
              id="lead-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="010-0000-0000"
            />
          </div>
          <div className="field">
            <label htmlFor="lead-model">관심 차종</label>
            <input
              id="lead-model"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="예: GLC 300 4MATIC"
              required
            />
          </div>
          <button className="btn-primary" type="submit" style={{ width: "auto", padding: "9px 18px" }} disabled={submitting}>
            {submitting ? "등록 중..." : "리드 등록"}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="card empty-state">불러오는 중...</div>
      ) : (
        <div className="kanban">
          {LEAD_STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage);
            return (
              <div className="kb-col" key={stage}>
                <div className="kb-head">
                  <span className="name">{stage}</span>
                  <span className="count mono">{stageLeads.length}</span>
                </div>
                <div className="kb-cards">
                  {stageLeads.map((lead) => (
                    <div className="lead-card" key={lead.id}>
                      <span className={`src-badge ${SOURCE_CLASS[lead.source]}`}>{lead.source}</span>
                      <span className="nm">{lead.name}</span>
                      <span className="car">{lead.model}</span>
                      <span className="meta">
                        {lead.stage === "출고완료" && lead.deliveryDate
                          ? `출고 ${lead.deliveryDate}`
                          : relativeDate(lead.updatedAt)}
                      </span>
                      <div className="stage-actions">
                        <button
                          className="stage-btn"
                          onClick={() => moveStage(lead, -1)}
                          disabled={LEAD_STAGES.indexOf(lead.stage) === 0}
                          type="button"
                        >
                          ← 이전
                        </button>
                        <button
                          className="stage-btn"
                          onClick={() => moveStage(lead, 1)}
                          disabled={LEAD_STAGES.indexOf(lead.stage) === LEAD_STAGES.length - 1}
                          type="button"
                        >
                          다음 →
                        </button>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>-</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
