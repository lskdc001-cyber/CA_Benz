import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateFollowUpSchedule } from "./followup";
import type { ConsentChannel, Lead } from "./types";

/** 한국 시각 기준 오늘 09:00에 해당하는 UTC 시각 */
const KST_MORNING_9AM = new Date("2026-09-07T00:00:00Z");
/** 한국 시각 09-07 새벽 05:00 = UTC 09-06 20:00 (UTC 날짜와 한국 날짜가 다른 구간) */
const KST_EARLY_MORNING = new Date("2026-09-06T20:00:00Z");

/** 기준일(한국 날짜)로부터 n일 전 날짜 문자열을 만든다. */
function daysAgo(n: number, from = "2026-09-07"): string {
  const d = new Date(`${from}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead_test",
    name: "테스트고객",
    phone: "010-0000-0000",
    model: "E 300 4MATIC",
    stage: "출고완료",
    source: "홈페이지",
    deliveryDate: daysAgo(24),
    consent: { agreed: false, channels: [] },
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-14T00:00:00Z",
    ...overrides,
  };
}

function consent(...channels: ConsentChannel[]) {
  return { agreed: true, recordedAt: "2026-08-01T00:00:00Z", channels };
}

/** 제목으로 이벤트 하나를 집는다. */
function pick(events: ReturnType<typeof generateFollowUpSchedule>, titlePart: string) {
  const found = events.find((e) => e.title.includes(titlePart));
  if (!found) throw new Error(`이벤트를 찾을 수 없음: ${titlePart}`);
  return found;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(KST_MORNING_9AM);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("generateFollowUpSchedule", () => {
  it("출고일이 없으면 일정을 만들지 않는다", () => {
    expect(generateFollowUpSchedule(makeLead({ deliveryDate: undefined }))).toEqual([]);
  });

  it("출고일이 있으면 템플릿 전체(6건)를 생성한다", () => {
    expect(generateFollowUpSchedule(makeLead())).toHaveLength(6);
  });

  describe("수신동의에 따른 발송 차단", () => {
    it("거래안내 메시지는 수신 미동의여도 차단하지 않는다", () => {
      const events = generateFollowUpSchedule(makeLead({ consent: { agreed: false, channels: [] } }));
      const 거래안내 = events.filter((e) => e.kind === "거래안내");

      expect(거래안내).not.toHaveLength(0);
      for (const e of 거래안내) {
        expect(e.status).not.toBe("발송불가");
        expect(e.blockedReason).toBeUndefined();
      }
    });

    it("광고성 메시지는 수신 미동의면 발송불가로 막고 사유를 남긴다", () => {
      const events = generateFollowUpSchedule(makeLead({ consent: { agreed: false, channels: [] } }));
      const 광고성 = events.filter((e) => e.kind === "광고성");

      expect(광고성).not.toHaveLength(0);
      for (const e of 광고성) {
        expect(e.status).toBe("발송불가");
        expect(e.blockedReason).toContain("수신동의");
      }
    });

    it("consent 필드 자체가 없는 과거 데이터는 미동의로 취급한다", () => {
      const events = generateFollowUpSchedule(makeLead({ consent: undefined }));
      expect(pick(events, "재구매").status).toBe("발송불가");
    });

    it("동의한 채널의 광고성만 발송하고, 동의하지 않은 채널은 막는다", () => {
      // 카카오 알림톡만 동의 → 문자(SMS)로 나가는 보험만기 안내는 막혀야 한다
      const events = generateFollowUpSchedule(makeLead({ consent: consent("카카오 알림톡") }));

      const 보험만기 = pick(events, "보험 만기"); // via: 문자(SMS)
      const 재구매 = pick(events, "재구매"); // via: 카카오 알림톡 + 컨설턴트 직접 연락

      expect(보험만기.status).toBe("발송불가");
      expect(보험만기.blockedReason).toContain("문자(SMS)");
      expect(재구매.status).not.toBe("발송불가");
    });

    it("모든 채널에 동의하면 광고성 메시지를 막지 않는다", () => {
      const events = generateFollowUpSchedule(
        makeLead({ consent: consent("카카오 알림톡", "문자(SMS)", "이메일") })
      );
      expect(events.some((e) => e.status === "발송불가")).toBe(false);
    });

    it("동의를 받지 못해 보내지 못한 광고성 메시지를 '완료'로 표시하지 않는다", () => {
      // 발송일이 이미 지났더라도, 실제로 보내지 않았으므로 완료가 아니다
      const events = generateFollowUpSchedule(
        makeLead({ deliveryDate: daysAgo(400), consent: { agreed: false, channels: [] } })
      );
      const 보험만기 = pick(events, "보험 만기"); // 출고 +335일 → 이미 지난 날짜
      expect(보험만기.dueDate < "2026-09-07").toBe(true);
      expect(보험만기.status).toBe("발송불가");
    });
  });

  describe("날짜 경계 판정", () => {
    it("발송일이 오늘이면 '완료'가 아니라 '예정'이다", () => {
      // 출고 +30일(1개월 만족도 체크)이 정확히 오늘이 되도록 설정
      const events = generateFollowUpSchedule(makeLead({ deliveryDate: daysAgo(30) }));
      const 만족도 = pick(events, "1개월 만족도");

      expect(만족도.dueDate).toBe("2026-09-07");
      expect(만족도.status).toBe("예정");
    });

    it("발송일이 어제면 '완료'다", () => {
      const events = generateFollowUpSchedule(makeLead({ deliveryDate: daysAgo(31) }));
      const 만족도 = pick(events, "1개월 만족도");

      expect(만족도.dueDate).toBe("2026-09-06");
      expect(만족도.status).toBe("완료");
    });

    it("한국 시각 새벽에도 한국 날짜를 기준으로 판정한다", () => {
      // UTC로는 아직 09-06이지만 한국은 이미 09-07 새벽이다.
      // 서버가 UTC로 도는 환경에서 하루 밀리면 안 된다.
      vi.setSystemTime(KST_EARLY_MORNING);

      const events = generateFollowUpSchedule(makeLead({ deliveryDate: daysAgo(31) }));
      const 만족도 = pick(events, "1개월 만족도");

      expect(만족도.dueDate).toBe("2026-09-06"); // 한국 기준 어제
      expect(만족도.status).toBe("완료");
    });

    it("발송일 계산은 서버 타임존과 무관하게 동일하다", () => {
      const events = generateFollowUpSchedule(makeLead({ deliveryDate: "2026-08-14" }));
      expect(events.map((e) => e.dueDate)).toEqual([
        "2026-08-14", // +0   출고 완료 안내
        "2026-08-21", // +7   1주 안부
        "2026-09-13", // +30  1개월 만족도
        "2027-02-10", // +180 정기점검
        "2027-07-15", // +335 보험만기
        "2028-08-13", // +730 재구매 유도
      ]);
    });
  });

  describe("'예정' 항목 선정", () => {
    it("'예정'은 항상 한 건뿐이다", () => {
      const events = generateFollowUpSchedule(makeLead({ consent: consent("카카오 알림톡", "문자(SMS)") }));
      expect(events.filter((e) => e.status === "예정")).toHaveLength(1);
    });

    it("가장 가까운 미래 항목이 차단됐으면 그 다음 발송 가능한 항목이 '예정'이 된다", () => {
      // 출고 300일 경과: 앞의 거래안내 4건은 모두 지났고,
      // 가장 가까운 미래는 +335일 보험만기(문자)이지만 문자 미동의로 차단된다.
      const events = generateFollowUpSchedule(
        makeLead({ deliveryDate: daysAgo(300), consent: consent("카카오 알림톡") })
      );

      expect(pick(events, "보험 만기").status).toBe("발송불가");
      expect(pick(events, "재구매").status).toBe("예정");
    });

    it("남은 일정이 모두 지났으면 '예정'이 없다", () => {
      const events = generateFollowUpSchedule(
        makeLead({ deliveryDate: daysAgo(1000), consent: consent("카카오 알림톡", "문자(SMS)") })
      );
      expect(events.filter((e) => e.status === "예정")).toHaveLength(0);
      expect(events.every((e) => e.status === "완료")).toBe(true);
    });
  });
});
