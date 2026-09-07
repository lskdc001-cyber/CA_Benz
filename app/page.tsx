import Link from "next/link";
import { readDb } from "@/lib/store";
import { generateFollowUpSchedule } from "@/lib/followup";
import { LEAD_STAGES } from "@/lib/types";

export const dynamic = "force-dynamic";

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function OverviewPage() {
  const db = readDb();

  const newLeadsThisMonth = db.leads.filter((l) => isThisMonth(l.createdAt)).length;
  const pendingHandoffs = db.chatSessions.filter((s) => s.handoff).length;
  const activeChats = db.chatSessions.length;
  const contentThisMonth = db.contentRequests.filter((c) => isThisMonth(c.createdAt)).length;

  const delivered = db.leads.filter((l) => l.deliveryDate);
  const allEvents = delivered.flatMap((l) => generateFollowUpSchedule(l));
  const followupNext = allEvents.filter((e) => e.status === "예정").length;
  const followupTotal = allEvents.filter((e) => e.status !== "완료").length;

  const stageCounts = LEAD_STAGES.map((stage) => ({
    stage,
    count: db.leads.filter((l) => l.stage === stage).length,
  }));
  const maxCount = Math.max(1, ...stageCounts.map((s) => s.count));

  return (
    <section className="panel">
      <div className="page-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>오늘의 업무 요약</h1>
          <p className="page-desc">
            4대 자동화 영역의 현재 상태를 한눈에 확인하세요. 아래 데이터는 data/db.json에 저장된 실제 앱 데이터입니다.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <span className="label">이번 달 신규 리드</span>
          <span className="value mono">{newLeadsThisMonth}</span>
          <span className="delta up">▲ 전체 {db.leads.length}건 관리 중</span>
        </div>
        <div className="kpi">
          <span className="label">AI 상담봇 진행 세션</span>
          <span className="value mono">{activeChats}</span>
          <span className="delta flag">● {pendingHandoffs}건 상담 인계</span>
        </div>
        <div className="kpi">
          <span className="label">이번 달 생성 콘텐츠</span>
          <span className="value mono">{contentThisMonth}</span>
          <span className="delta up">누적 {db.contentRequests.length}건 발행</span>
        </div>
        <div className="kpi">
          <span className="label">사후관리 남은 건</span>
          <span className="value mono">{followupTotal}</span>
          <span className="delta flag">● {followupNext}건 발송 예정</span>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title">
          <h2>영업 파이프라인</h2>
          <span className="hint">전체 {db.leads.length}건 진행 중</span>
        </div>
        <div className="pipeline-strip">
          {stageCounts.map((s) => (
            <div className="pipe-stage" key={s.stage}>
              <div className="n">{s.count}</div>
              <div className="t">{s.stage}</div>
              <div className="bar">
                <span style={{ width: `${(s.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="section-title">
          <h2>모듈 바로가기</h2>
        </div>
        <div className="module-grid">
          <div className="card card-pad module-card">
            <div className="mh">
              <div
                className="module-icon"
                style={{ background: "color-mix(in srgb, var(--accent-2) 16%, var(--surface))", color: "var(--accent-2)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16v12H8l-4 4z" />
                </svg>
              </div>
              <h3>AI 상담봇</h3>
            </div>
            <p>차종 추천·견적 문의·시승 예약을 24시간 자동 응대하고, 클로징이 임박한 상담은 즉시 컨설턴트에게 인계합니다.</p>
            <Link href="/chatbot" className="go">
              상담 현황 보기 →
            </Link>
          </div>
          <div className="card card-pad module-card">
            <div className="mh">
              <div
                className="module-icon"
                style={{ background: "color-mix(in srgb, var(--accent) 18%, var(--surface))", color: "var(--accent)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19l4.5-1.2L20 6.3a2 2 0 0 0 0-2.8l-.5-.5a2 2 0 0 0-2.8 0L5.2 14.5z" />
                </svg>
              </div>
              <h3>콘텐츠 자동 생성</h3>
            </div>
            <p>차종과 프로모션 정보를 입력하면 인스타그램·블로그·카카오채널용 홍보 문구를 컨설턴트 톤에 맞춰 생성합니다.</p>
            <Link href="/content" className="go">
              콘텐츠 만들기 →
            </Link>
          </div>
          <div className="card card-pad module-card">
            <div className="mh">
              <div className="module-icon" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6" />
                </svg>
              </div>
              <h3>리드 / CRM</h3>
            </div>
            <p>신규 문의부터 출고까지 전체 파이프라인을 칸반 보드로 관리하고, 유입 채널별 전환율을 추적합니다.</p>
            <Link href="/crm" className="go">
              파이프라인 보기 →
            </Link>
          </div>
          <div className="card card-pad module-card">
            <div className="mh">
              <div className="module-icon" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3.5 2" />
                </svg>
              </div>
              <h3>사후관리 자동화</h3>
            </div>
            <p>출고일 기준 정기점검·보험 만기·재구매 시점을 자동 계산해 알림을 예약 발송합니다.</p>
            <Link href="/followup" className="go">
              일정 보기 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
