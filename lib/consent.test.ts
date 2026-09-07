import { describe, expect, it } from "vitest";
import { getConsentInfo, hasValidConsent } from "./consent";
import type { Lead } from "./types";

const TODAY = "2026-09-07";

function leadWithConsent(agreed: boolean, recordedAt?: string): Lead {
  return {
    id: "lead_test",
    name: "테스트고객",
    phone: "",
    model: "E 300",
    stage: "출고완료",
    source: "홈페이지",
    consent: agreed
      ? { agreed: true, recordedAt, channels: ["카카오 알림톡"] }
      : { agreed: false, recordedAt, channels: [] },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

describe("getConsentInfo", () => {
  it("동의한 적이 없으면 미동의다", () => {
    expect(getConsentInfo(leadWithConsent(false), TODAY).status).toBe("미동의");
  });

  it("consent 필드가 아예 없는 과거 데이터도 미동의다", () => {
    const lead = { ...leadWithConsent(true), consent: undefined };
    expect(getConsentInfo(lead, TODAY).status).toBe("미동의");
  });

  it("최근에 동의했으면 유효하고, 만료일과 남은 일수를 알려준다", () => {
    // 2026-09-01 동의 → 2028-08-31 만료 (730일)
    const info = getConsentInfo(leadWithConsent(true, "2026-09-01T10:00:00+09:00"), TODAY);
    expect(info.status).toBe("유효");
    expect(info.expiresOn).toBe("2028-08-31");
    expect(info.daysLeft).toBe(724);
  });

  it("만료 30일 이내면 만료임박으로 알린다", () => {
    // 2024-09-27 동의 → 2026-09-27 만료 (오늘로부터 20일 뒤)
    const info = getConsentInfo(leadWithConsent(true, "2024-09-27T00:00:00Z"), TODAY);
    expect(info.status).toBe("만료임박");
    expect(info.daysLeft).toBe(20);
  });

  it("만료 경계: 남은 일수가 31일이면 아직 유효하다", () => {
    // 2024-10-08 동의 → 2026-10-08 만료 (오늘로부터 31일 뒤)
    const info = getConsentInfo(leadWithConsent(true, "2024-10-08T00:00:00Z"), TODAY);
    expect(info.daysLeft).toBe(31);
    expect(info.status).toBe("유효");
  });

  it("만료 경계: 만료일 당일이면 만료다", () => {
    // 2024-09-07 + 730일 = 2026-09-07 (오늘)
    const info = getConsentInfo(leadWithConsent(true, "2024-09-07T00:00:00Z"), TODAY);
    expect(info.expiresOn).toBe("2026-09-07");
    expect(info.daysLeft).toBe(0);
    expect(info.status).toBe("만료");
  });

  it("2년이 지났으면 만료다", () => {
    const info = getConsentInfo(leadWithConsent(true, "2023-01-01T00:00:00Z"), TODAY);
    expect(info.status).toBe("만료");
    expect(info.daysLeft).toBeLessThan(0);
  });

  it("동의 시점 기록이 없으면 유효성을 증명할 수 없으므로 만료로 본다", () => {
    expect(getConsentInfo(leadWithConsent(true, undefined), TODAY).status).toBe("만료");
  });
});

describe("hasValidConsent", () => {
  it("유효하거나 만료임박이면 발송할 수 있다", () => {
    expect(hasValidConsent(leadWithConsent(true, "2026-09-01T00:00:00Z"), TODAY)).toBe(true);
    expect(hasValidConsent(leadWithConsent(true, "2024-09-28T00:00:00Z"), TODAY)).toBe(true);
  });

  it("만료되었거나 미동의면 발송할 수 없다", () => {
    expect(hasValidConsent(leadWithConsent(true, "2023-01-01T00:00:00Z"), TODAY)).toBe(false);
    expect(hasValidConsent(leadWithConsent(false), TODAY)).toBe(false);
  });
});
