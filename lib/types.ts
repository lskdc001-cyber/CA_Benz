export type LeadStage =
  | "신규문의"
  | "상담중"
  | "시승완료"
  | "견적발송"
  | "계약"
  | "출고대기"
  | "출고완료";

export const LEAD_STAGES: LeadStage[] = [
  "신규문의",
  "상담중",
  "시승완료",
  "견적발송",
  "계약",
  "출고대기",
  "출고완료",
];

export type LeadSource = "AI봇" | "홈페이지" | "지인소개" | "직접등록";

/** 광고성 정보 수신 채널 (정보통신망법 제50조) */
export type ConsentChannel = "카카오 알림톡" | "문자(SMS)" | "이메일";

export const CONSENT_CHANNELS: ConsentChannel[] = ["카카오 알림톡", "문자(SMS)", "이메일"];

/**
 * 광고성 정보 수신동의 기록.
 * 정보통신망법상 동의 여부뿐 아니라 "동의를 받은 시점"을 함께 보관해야 하며,
 * 2년마다 수신동의 유지 여부를 재확인해야 한다.
 */
export interface MarketingConsent {
  agreed: boolean;
  /** 동의 또는 철회가 기록된 시점 (ISO datetime) */
  recordedAt?: string;
  /** 동의한 발송 채널 (미동의 시 빈 배열) */
  channels: ConsentChannel[];
}

export const NO_CONSENT: MarketingConsent = { agreed: false, channels: [] };

export interface Lead {
  id: string;
  name: string;
  phone: string;
  model: string;
  stage: LeadStage;
  source: LeadSource;
  notes?: string;
  deliveryDate?: string; // ISO date, set when stage reaches 출고완료
  /** 광고성 정보 수신동의. 미설정 리드는 미동의로 간주한다. */
  consent?: MarketingConsent;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  text: string;
  at: string; // ISO datetime
}

export interface ChatSession {
  id: string;
  leadName: string;
  channel: "카카오채널" | "홈페이지 위젯";
  messages: ChatMessage[];
  handoff: boolean;
  leadId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 콘텐츠 발행 채널.
 *
 * 채널마다 자동화 가능 범위가 다르다:
 * - 인스타그램 / 카카오채널: 문구 생성 후 수동 발행
 * - 네이버 블로그: 글쓰기 API가 2020년 종료되어 자동 발행 불가.
 *   검색 노출을 노린 SEO 초안까지 만들고 복사해 붙여넣는다.
 * - 유튜브 쇼츠: 대본·자막·메타데이터를 만들고, 영상 촬영은 사람이 한다.
 *   업로드는 YouTube Data API로 자동화 가능(별도 OAuth 설정 필요).
 */
export type ContentChannel = "인스타그램" | "네이버 블로그" | "카카오채널" | "유튜브 쇼츠";

export const CONTENT_CHANNELS: ContentChannel[] = [
  "인스타그램",
  "네이버 블로그",
  "카카오채널",
  "유튜브 쇼츠",
];

export interface ContentPiece {
  channel: ContentChannel;
  /** 본문. 쇼츠는 대본, 블로그는 SEO 구조를 갖춘 원고 */
  body: string;
  hashtags?: string;
  /** 블로그 제목, 쇼츠 영상 제목 등 본문과 분리해 입력해야 하는 값 */
  title?: string;
  /** 촬영 가이드·발행 체크리스트 등 작업자용 메모 (발행물에는 포함하지 않는다) */
  notes?: string;
}

export interface ContentRequest {
  id: string;
  model: string;
  promo: string;
  tone: string;
  channels: ContentChannel[];
  pieces: ContentPiece[];
  createdAt: string;
}

export type FollowUpStatus = "완료" | "예정" | "대기" | "발송불가";

/**
 * 메시지 성격.
 * - 거래안내: 계약·출고에 따른 고지성 안내. 수신동의 없이 발송 가능.
 * - 광고성: 재구매 유도, 프로모션 등. 수신동의가 있어야 발송 가능하며
 *   본문에 "(광고)" 표기와 수신거부 방법을 포함해야 한다.
 */
export type MessageKind = "거래안내" | "광고성";

export interface FollowUpEvent {
  id: string;
  leadId: string;
  leadName: string;
  model: string;
  title: string;
  description: string;
  via: string;
  dueDate: string; // ISO date
  status: FollowUpStatus;
  kind: MessageKind;
  /** 광고성인데 수신동의가 없어 발송이 차단된 경우 사유 */
  blockedReason?: string;
}

export interface DbShape {
  leads: Lead[];
  chatSessions: ChatSession[];
  contentRequests: ContentRequest[];
  followUps: FollowUpEvent[];
}
