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

export interface Lead {
  id: string;
  name: string;
  phone: string;
  model: string;
  stage: LeadStage;
  source: LeadSource;
  notes?: string;
  deliveryDate?: string; // ISO date, set when stage reaches 출고완료
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

export interface ContentPiece {
  channel: "인스타그램" | "블로그" | "카카오채널";
  body: string;
  hashtags?: string;
}

export interface ContentRequest {
  id: string;
  model: string;
  promo: string;
  tone: string;
  channels: ContentPiece["channel"][];
  pieces: ContentPiece[];
  createdAt: string;
}

export type FollowUpStatus = "완료" | "예정" | "대기";

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
}

export interface DbShape {
  leads: Lead[];
  chatSessions: ChatSession[];
  contentRequests: ContentRequest[];
  followUps: FollowUpEvent[];
}
