import { readDb } from "@/lib/store";
import { generateFollowUpSchedule } from "@/lib/followup";
import type { FollowUpStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const DOT_CLASS: Record<FollowUpStatus, string> = {
  완료: "done",
  예정: "next",
  대기: "pending",
  발송불가: "blocked",
};
const PILL_CLASS: Record<FollowUpStatus, string> = {
  완료: "status-done",
  예정: "status-next",
  대기: "status-pending",
  발송불가: "status-blocked",
};
const PILL_LABEL: Record<FollowUpStatus, string> = {
  완료: "발송 완료",
  예정: "발송 예정",
  대기: "예정",
  발송불가: "발송 불가",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function FollowUpPage() {
  const db = readDb();
  const delivered = db.leads.filter((l) => l.deliveryDate);

  return (
    <section className="panel">
      <div className="page-head">
        <div>
          <p className="eyebrow">After-Sales</p>
          <h1>사후관리 자동화</h1>
          <p className="page-desc">
            출고일을 기준으로 정기점검·보험 만기·재구매 시점을 자동 계산해 알림을 예약합니다. CRM에서 리드를
            &ldquo;출고완료&rdquo; 단계로 옮기면 자동으로 일정이 생성됩니다. 광고성 메시지는 수신동의를 받은
            채널로만 발송됩니다.
          </p>
        </div>
      </div>

      {delivered.length === 0 && (
        <div className="card empty-state">아직 출고 완료된 고객이 없습니다. CRM에서 리드를 &ldquo;출고완료&rdquo; 단계로 이동해보세요.</div>
      )}

      {delivered.map((lead) => {
        const events = generateFollowUpSchedule(lead);
        return (
          <div className="card card-pad" key={lead.id}>
            <div className="section-title">
              <h2>
                {lead.name} · {lead.model}
              </h2>
              <span className="hint">출고일 {lead.deliveryDate} 기준 자동 생성</span>
            </div>
            <div className="consent-status">
              {lead.consent?.agreed ? (
                <>
                  <span className="consent-badge consent-yes">수신동의</span>
                  <span>
                    동의 채널: {lead.consent.channels.join(", ") || "미지정"}
                    {lead.consent.recordedAt && ` · 동의일 ${lead.consent.recordedAt.slice(0, 10)}`}
                  </span>
                </>
              ) : (
                <>
                  <span className="consent-badge consent-no">수신 미동의</span>
                  <span>광고성 메시지는 발송되지 않습니다. CRM에서 수신동의를 받아 주세요.</span>
                </>
              )}
            </div>
            <div className="timeline">
              {events.map((ev) => (
                <div className="tl-item" key={ev.id}>
                  <div className="tl-date">{formatDate(ev.dueDate)}</div>
                  <div className="tl-rail">
                    <div className={`tl-dot ${DOT_CLASS[ev.status]}`} />
                  </div>
                  <div className="tl-body">
                    <div className="th">
                      <span className="tt">{ev.title}</span>
                      <span className={`status-pill ${PILL_CLASS[ev.status]}`}>{PILL_LABEL[ev.status]}</span>
                      <span className={`kind-tag ${ev.kind === "광고성" ? "kind-ad" : "kind-tx"}`}>{ev.kind}</span>
                    </div>
                    <p>{ev.description}</p>
                    {ev.blockedReason && <p className="blocked-reason">⚠ {ev.blockedReason}</p>}
                    <div className="via">
                      {ev.via}
                      {ev.kind === "광고성" && " · 본문에 (광고) 표기 및 수신거부 방법 포함 필요"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
