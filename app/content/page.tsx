"use client";

import { useEffect, useState } from "react";
import type { ContentPiece, ContentRequest } from "@/lib/types";

const MODELS = ["The new E-Class · E 300", "GLC 300 4MATIC", "S 580 4MATIC", "EQE 350+", "GLE 350d"];
const TONES = ["신뢰감 있는 전문가", "친근한 대화체", "간결한 정보형"];
const CHANNELS: ContentPiece["channel"][] = ["인스타그램", "블로그", "카카오채널"];

export default function ContentPage() {
  const [model, setModel] = useState(MODELS[1]);
  const [promo, setPromo] = useState("9월 사전계약 개별소비세 혜택");
  const [tone, setTone] = useState(TONES[0]);
  const [channels, setChannels] = useState<ContentPiece["channel"][]>([...CHANNELS]);
  const [result, setResult] = useState<ContentRequest | null>(null);
  const [history, setHistory] = useState<ContentRequest[]>([]);
  const [generating, setGenerating] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function loadHistory() {
    const res = await fetch("/api/content");
    const data = await res.json();
    setHistory(data.history || []);
    setAiConfigured(Boolean(data.aiConfigured));
    if (!result && data.history?.length) setResult(data.history[0]);
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleChannel(ch: ContentPiece["channel"]) {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (channels.length === 0 || generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, promo, tone, channels }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.request);
        setAiConfigured(Boolean(data.aiConfigured));
        loadHistory();
      }
    } finally {
      setGenerating(false);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
  }

  return (
    <section className="panel">
      <div className="page-head">
        <div>
          <p className="eyebrow">Content Studio</p>
          <h1>광고 · 콘텐츠 자동 생성</h1>
          <p className="page-desc">차종과 프로모션 조건만 입력하면 채널별 홍보 문구를 컨설턴트 톤앤매너로 즉시 초안 작성합니다.</p>
        </div>
        <span className={aiConfigured ? "ai-flag" : "demo-flag"}>
          {aiConfigured ? "● Claude API 연동됨" : "● 템플릿 기반 생성(모의) · ANTHROPIC_API_KEY 미설정"}
        </span>
      </div>

      <div className="gen-layout">
        <div className="card card-pad">
          <div className="section-title">
            <h2>생성 조건</h2>
          </div>
          <form onSubmit={generate}>
            <div className="field">
              <label htmlFor="model-select">차종</label>
              <select id="model-select" value={model} onChange={(e) => setModel(e.target.value)}>
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="promo-input">프로모션 / 핵심 메시지</label>
              <input id="promo-input" value={promo} onChange={(e) => setPromo(e.target.value)} />
            </div>
            <div className="field">
              <label>톤앤매너</label>
              <div className="chips">
                {TONES.map((t) => (
                  <span
                    key={t}
                    className={`chip-toggle ${tone === t ? "active" : ""}`}
                    onClick={() => setTone(t)}
                    role="button"
                    tabIndex={0}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="field">
              <label>생성할 채널</label>
              <div className="chips">
                {CHANNELS.map((ch) => (
                  <span
                    key={ch}
                    className={`chip-toggle ${channels.includes(ch) ? "active" : ""}`}
                    onClick={() => toggleChannel(ch)}
                    role="button"
                    tabIndex={0}
                  >
                    {ch}
                  </span>
                ))}
              </div>
            </div>
            <button className="btn-primary" type="submit" disabled={generating || channels.length === 0}>
              {generating ? "생성 중..." : "콘텐츠 생성하기"}
            </button>
          </form>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {result ? (
            <div className="output-grid">
              {result.pieces.map((p, i) => (
                <div className="card card-pad output-card" key={i}>
                  <div className="oh">
                    <span className="ch">{p.channel}</span>
                    <button className="copy-btn" type="button" onClick={() => copy(p.body, `${result.id}-${i}`)}>
                      {copiedKey === `${result.id}-${i}` ? "복사됨" : "복사"}
                    </button>
                  </div>
                  <div className="body-text">{p.body}</div>
                  {p.hashtags && <div className="hashtags">{p.hashtags}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="card empty-state">왼쪽에서 조건을 입력하고 생성 버튼을 눌러보세요.</div>
          )}

          <div className="card card-pad">
            <div className="section-title">
              <h2>생성 이력</h2>
              <span className="hint">최근 {history.length}건</span>
            </div>
            {history.slice(0, 5).map((h) => (
              <div className="history-row" key={h.id}>
                <div className="hh">
                  <span>
                    {h.model} · {h.promo}
                  </span>
                  <span className="date mono">{new Date(h.createdAt).toLocaleDateString("ko-KR")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
