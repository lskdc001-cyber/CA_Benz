import type { FollowUpEvent, FollowUpStatus, Lead, MessageKind } from "./types";
import { nextId } from "./store";
import { addDays, todayInKst } from "./date";

interface ScheduleTemplate {
  offsetDays: number;
  title: string;
  description: string;
  via: string;
  /**
   * 거래안내: 계약·출고에 따른 고지성 안내 → 수신동의 없이 발송 가능
   * 광고성: 재구매·프로모션 유도 → 수신동의 필수 (정보통신망법 제50조)
   */
  kind: MessageKind;
}

// 출고일 기준 자동 팔로업 시퀀스 템플릿
export const FOLLOWUP_TEMPLATE: ScheduleTemplate[] = [
  {
    offsetDays: 0,
    title: "출고 완료 안내",
    description: "출고를 축하하는 인사와 함께 차량 관리 가이드를 자동 발송합니다.",
    via: "카카오 알림톡",
    kind: "거래안내",
  },
  {
    offsetDays: 7,
    title: "출고 1주 안부 인사",
    description: "불편사항 확인 및 담당 컨설턴트 직통 연락처를 재안내합니다.",
    via: "문자(SMS)",
    kind: "거래안내",
  },
  {
    offsetDays: 30,
    title: "출고 1개월 만족도 체크",
    description: "간단 만족도(NPS) 설문을 자동 발송하고, 응답 결과를 CRM에 반영합니다.",
    via: "카카오 알림톡",
    kind: "거래안내",
  },
  {
    offsetDays: 180,
    title: "첫 정기점검 알림",
    description: "서비스센터 예약 링크와 함께 정기점검 시점을 사전 안내합니다.",
    via: "카카오 알림톡",
    kind: "거래안내",
  },
  {
    offsetDays: 335,
    title: "자동차보험 만기 안내",
    description: "보험 만기 1개월 전 리마인드와 제휴 보험 비교 안내를 발송합니다.",
    via: "문자(SMS)",
    kind: "광고성",
  },
  {
    offsetDays: 730,
    title: "재구매 · 소개 유도 메시지",
    description: "출고 24개월차, 재구매/소개 혜택 안내와 함께 컨설턴트가 직접 연락합니다.",
    via: "카카오 알림톡 + 컨설턴트 직접 연락",
    kind: "광고성",
  },
];

/** 해당 채널로 광고성 메시지를 보낼 수 있는지 판정한다. */
function canSendAd(lead: Lead, via: string): boolean {
  const consent = lead.consent;
  if (!consent?.agreed) return false;
  // via 문자열에 동의한 채널명이 포함되어 있으면 발송 가능
  return consent.channels.some((ch) => via.includes(ch));
}

export function generateFollowUpSchedule(lead: Lead): FollowUpEvent[] {
  if (!lead.deliveryDate) return [];
  const today = todayInKst();

  const dated = FOLLOWUP_TEMPLATE.map((tpl) => ({
    tpl,
    dueDate: addDays(lead.deliveryDate as string, tpl.offsetDays),
  }));

  // 발송 가능한 항목만 "예정" 후보가 된다 (차단된 광고성 메시지는 제외)
  const sendable = dated.filter((d) => d.tpl.kind === "거래안내" || canSendAd(lead, d.tpl.via));
  const upcoming = sendable.filter((d) => d.dueDate >= today);
  const nextDueDate = upcoming.length > 0 ? upcoming[0].dueDate : undefined;

  return dated.map(({ tpl, dueDate }) => {
    const blocked = tpl.kind === "광고성" && !canSendAd(lead, tpl.via);

    let status: FollowUpStatus;
    let blockedReason: string | undefined;

    if (blocked) {
      status = "발송불가";
      blockedReason = lead.consent?.agreed
        ? `${tpl.via} 채널 수신동의가 없습니다.`
        : "광고성 정보 수신동의를 받지 않았습니다.";
    } else if (dueDate < today) {
      status = "완료";
    } else if (dueDate === nextDueDate) {
      status = "예정";
    } else {
      status = "대기";
    }

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
      kind: tpl.kind,
      blockedReason,
    };
  });
}
