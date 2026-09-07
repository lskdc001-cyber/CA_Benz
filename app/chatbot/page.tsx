"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatSession } from "@/lib/types";

const GREETING: ChatMessage = {
  role: "assistant",
  text: "안녕하세요, 한성자동차 AI 상담 비서입니다 🙂 관심 있으신 차종이나 시승·견적 문의를 편하게 남겨주세요.",
  at: new Date().toISOString(),
};

export default function ChatbotPage() {
  const [leadName, setLeadName] = useState("테스트 고객");
  const [channel, setChannel] = useState<ChatSession["channel"]>("카카오채널");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [lastUserText, setLastUserText] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [aiConfigured, setAiConfigured] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  async function loadSessions() {
    const res = await fetch("/api/chat");
    const data = await res.json();
    setSessions(data.sessions || []);
    setAiConfigured(Boolean(data.aiConfigured));
  }

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: "user", text, at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLastUserText(text);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, leadName, channel, userMessage: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setSessionId(data.sessionId);
        setHandoff(Boolean(data.handoff));
        setAiConfigured(Boolean(data.aiConfigured));
        setMessages((prev) => [...prev, { role: "assistant", text: data.reply, at: new Date().toISOString() }]);
        loadSessions();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="panel">
      <div className="page-head">
        <div>
          <p className="eyebrow">AI Concierge</p>
          <h1>AI 고객 상담봇</h1>
          <p className="page-desc">
            홈페이지·카카오채널 연동을 가정한 테스트 콘솔입니다. 대화가 시승·견적·계약 의사로 이어지면 자동으로 CRM에
            리드가 등록되고 컨설턴트에게 인계됩니다.
          </p>
        </div>
        <span className={aiConfigured ? "ai-flag" : "demo-flag"}>
          {aiConfigured ? "● Claude API 연동됨" : "● 규칙 기반 응답(모의) · ANTHROPIC_API_KEY 미설정"}
        </span>
      </div>

      <div className="chat-layout">
        <div className="card chat-window">
          <div className="chat-header">
            <span className="dot"></span>
            <span className="title">{channel} · 실시간 상담</span>
            <span className="status">고객: {leadName}</span>
          </div>
          <div className="chat-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div className={`msg ${m.role}`} key={i}>
                {m.text}
              </div>
            ))}
            {handoff && <div className="msg system">컨설턴트 인계됨 → 홍세일즈</div>}
            {sending && <div className="msg system">AI 상담 비서 응답 작성 중...</div>}
          </div>
          <form className="chat-input" onSubmit={sendMessage}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예: GLC 300 시승해보고 싶어요"
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()}>
              전송
            </button>
          </form>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 10 }}>
              <h2 style={{ fontSize: 13.5 }}>테스트 정보</h2>
            </div>
            <div className="field">
              <label htmlFor="lead-name-input">고객명</label>
              <input id="lead-name-input" value={leadName} onChange={(e) => setLeadName(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="channel-select">유입 채널</label>
              <select
                id="channel-select"
                value={channel}
                onChange={(e) => setChannel(e.target.value as ChatSession["channel"])}
              >
                <option value="카카오채널">카카오채널</option>
                <option value="홈페이지 위젯">홈페이지 위젯</option>
              </select>
            </div>
          </div>

          {handoff && (
            <div className="card card-pad handoff-card">
              <div className="hh">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M12 9v4M12 17h.01" />
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                </svg>
                인계 대기 · 컨설턴트 확인 필요
              </div>
              <p>
                {leadName} 고객 — &ldquo;{lastUserText}&rdquo; 요청으로 CRM에 리드가 등록되었습니다. 리드/CRM 메뉴에서
                확인 후 직접 연락 바랍니다.
              </p>
            </div>
          )}

          <div className="card card-pad session-list">
            <div className="section-title" style={{ marginBottom: 6 }}>
              <h2 style={{ fontSize: 13.5 }}>최근 상담 세션</h2>
            </div>
            {sessions.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>아직 상담 이력이 없습니다.</div>}
            {sessions.slice(0, 8).map((s) => (
              <div className="session-item" key={s.id}>
                <div>
                  <div className="who">{s.leadName}</div>
                  <div className="meta">
                    {s.channel} · {s.messages.length}개 메시지
                  </div>
                </div>
                <span className={`pill ${s.handoff ? "pill-wait" : "pill-ok"}`}>{s.handoff ? "인계됨" : "진행중"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
