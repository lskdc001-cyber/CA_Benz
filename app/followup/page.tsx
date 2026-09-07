import { readDb } from "@/lib/store";
import { generateFollowUpSchedule } from "@/lib/followup";
import type { FollowUpStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const DOT_CLASS: Record<FollowUpStatus, string> = {
  완료: "done",
  예정: "next",
  대기: "pending",
};
const PILL_CLASS: Record<FollowUpStatus, string> = {
  완료: "status-done",
  예정: "status-next",
  대기: "status-pending",
};
const PILL_LABEL: Record<FollowUpStatus, string> = {
  완료: "발송 완료",
  예정: "발송 예정",
  대기: "예정",
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
            &ldquo;출고완료&rdquo; 단계로 옮기면 자동으로 일정이 생성됩니다.
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
                    </div>
                    <p>{ev.description}</p>
                    <div className="via">{ev.via}</div>
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
