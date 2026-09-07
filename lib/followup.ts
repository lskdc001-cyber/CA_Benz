import type { FollowUpEvent, FollowUpStatus, Lead } from "./types";
import { nextId } from "./store";

interface ScheduleTemplate {
  offsetDays: number;
  title: string;
  description: string;
  via: string;
}

// 출고일 기준 자동 팔로업 시퀀스 템플릿
export const FOLLOWUP_TEMPLATE: ScheduleTemplate[] = [
  {
    offsetDays: 0,
    title: "출고 완료 안내",
    description: "출고를 축하하는 인사와 함께 차량 관리 가이드를 자동 발송합니다.",
    via: "카카오 알림톡",
  },
  {
    offsetDays: 7,
    title: "출고 1주 안부 인사",
    description: "불편사항 확인 및 담당 컨설턴트 직통 연락처를 재안내합니다.",
    via: "문자(SMS)",
  },
  {
    offsetDays: 30,
    title: "출고 1개월 만족도 체크",
    description: "간단 만족도(NPS) 설문을 자동 발송하고, 응답 결과를 CRM에 반영합니다.",
    via: "카카오 알림톡",
  },
  {
    offsetDays: 180,
    title: "첫 정기점검 알림",
    description: "서비스센터 예약 링크와 함께 정기점검 시점을 사전 안내합니다.",
    via: "카카오 알림톡",
  },
  {
    offsetDays: 335,
    title: "자동차보험 만기 안내",
    description: "보험 만기 1개월 전 리마인드와 제휴 보험 비교 안내를 발송합니다.",
    via: "문자(SMS)",
  },
  {
    offsetDays: 730,
    title: "재구매 · 소개 유도 메시지",
    description: "출고 24개월차, 재구매/소개 혜택 안내와 함께 컨설턴트가 직접 연락합니다.",
    via: "카카오 알림톡 + 컨설턴트 직접 연락",
  },
];

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function generateFollowUpSchedule(lead: Lead): FollowUpEvent[] {
  if (!lead.deliveryDate) return [];
  const today = new Date().toISOString().slice(0, 10);

  const dated = FOLLOWUP_TEMPLATE.map((tpl) => ({
    tpl,
    dueDate: addDays(lead.deliveryDate as string, tpl.offsetDays),
  }));

  // 완료: 오늘보다 과거 / 예정: 아직 안 지난 것 중 가장 가까운 하나 / 대기: 나머지
  const upcoming = dated.filter((d) => d.dueDate >= today);
  const nextDueDate = upcoming.length > 0 ? upcoming[0].dueDate : undefined;

  return dated.map(({ tpl, dueDate }) => {
    let status: FollowUpStatus;
    if (dueDate < today) status = "완료";
    else if (dueDate === nextDueDate) status = "예정";
    else status = "대기";

    return {
      id: nextId("fu"),
      leadId: lead.id,
      leadName: lead.name,
      model: lead.model,
      title: tpl.title,
      description: tpl.description,
      via: tpl.via,
      dueDate,
      status,
    };
  });
}
