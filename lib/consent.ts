import type { Lead } from "./types";
import { addDays, todayInKst } from "./date";

/**
 * 광고성 정보 수신동의 유효기간.
 *
 * 정보통신망법 시행령에 따라 광고성 정보 수신동의를 받은 자는 2년마다
 * 수신동의 유지 여부를 확인해야 한다. 확인하지 않고 2년이 지나면
 * 그 동의는 더 이상 유효하지 않으므로, 만료된 동의는 미동의와 동일하게 취급한다.
 */
export const CONSENT_VALIDITY_DAYS = 730;

/** 만료 며칠 전부터 "곧 만료"로 표시할지 */
export const CONSENT_EXPIRY_WARNING_DAYS = 30;

export type ConsentStatus =
  /** 동의를 받은 적이 없거나 철회함 */
  | "미동의"
  /** 유효한 동의 */
  | "유효"
  /** 유효하지만 곧 재확인이 필요함 */
  | "만료임박"
  /** 2년이 지나 효력을 잃음 — 미동의와 동일하게 취급 */
  | "만료";

export interface ConsentInfo {
  status: ConsentStatus;
  /** 동의 만료일 (동의한 경우에만) */
  expiresOn?: string;
  /** 만료까지 남은 일수. 음수면 이미 지난 일수 */
  daysLeft?: number;
}

export function getConsentInfo(lead: Lead, today: string = todayInKst()): ConsentInfo {
  const consent = lead.consent;
  if (!consent?.agreed) return { status: "미동의" };

  // 동의 시점을 알 수 없으면 2년 경과 여부를 증명할 수 없다.
  // 법적으로 유효함을 입증해야 하는 쪽은 발송자이므로 만료로 본다.
  if (!consent.recordedAt) return { status: "만료" };

  const recordedOn = consent.recordedAt.slice(0, 10);
  const expiresOn = addDays(recordedOn, CONSENT_VALIDITY_DAYS);
  const daysLeft = Math.round(
    (Date.parse(`${expiresOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
  );

  if (daysLeft <= 0) return { status: "만료", expiresOn, daysLeft };
  if (daysLeft <= CONSENT_EXPIRY_WARNING_DAYS) return { status: "만료임박", expiresOn, daysLeft };
  return { status: "유효", expiresOn, daysLeft };
}

/** 광고성 메시지를 보낼 수 있는 상태인지 (만료된 동의는 보낼 수 없다) */
export function hasValidConsent(lead: Lead, today: string = todayInKst()): boolean {
  const status = getConsentInfo(lead, today).status;
  return status === "유효" || status === "만료임박";
}
