import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ContentPiece } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const CHAT_SYSTEM_PROMPT = `당신은 한성자동차 벤츠 세일즈 컨설턴트를 돕는 "AI 고객 상담 비서"입니다.
역할:
- 차종 추천, 옵션/트림 안내, 시승 예약, 자주 묻는 질문(할부·리스·트레이드인 등)에 친절하고 신뢰감 있게 답합니다.
- 정확한 가격·할부/리스 조건·재고는 절대 확정해서 답하지 말고, "정확한 조건은 담당 컨설턴트가 맞춤 상담으로 안내드리겠습니다" 형태로 안내합니다.
- 고객이 시승 예약, 견적 요청, 구매 의사를 밝히면 담당 컨설턴트에게 연결이 필요하다고 자연스럽게 안내합니다.
- 답변은 한국어로, 2~4문장 이내로 간결하게 작성합니다.
- 브랜드 톤: 전문적이고 정중하되 딱딱하지 않게.`;

function ruleBasedChatReply(history: ChatMessage[]): { text: string; handoff: boolean } {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const msg = (lastUser?.text || "").toLowerCase();

  const wantsHandoff =
    /(시승|예약|견적|계약|구매|가격|할부|리스)/.test(msg) &&
    history.filter((m) => m.role === "user").length >= 2;

  if (/시승|예약/.test(msg)) {
    return {
      text: "네, 시승 예약 도와드릴게요. 편하신 요일과 오전/오후만 알려주시면 가까운 전시장 일정을 확인해 담당 컨설턴트가 확정 연락드리겠습니다.",
      handoff: wantsHandoff,
    };
  }
  if (/가격|견적|얼마|할부|리스/.test(msg)) {
    return {
      text: "정확한 견적은 트림, 선수율, 계약 조건에 따라 달라져서 담당 컨설턴트가 맞춤으로 안내드리는 게 가장 정확해요. 관심 있으신 트림을 알려주시면 컨설턴트 상담을 연결해드릴게요.",
      handoff: wantsHandoff,
    };
  }
  if (/glc|gle|eqe|s\s?580|e\s?300|s클래스|e클래스/.test(msg)) {
    return {
      text: "좋은 선택이세요! 해당 차종은 현재 시승이 가능하고, 이번 달 프로모션도 적용될 수 있어요. 시승을 먼저 예약해보시겠어요?",
      handoff: false,
    };
  }
  return {
    text: "안녕하세요, 한성자동차 AI 상담 비서입니다 🙂 어떤 차종에 관심이 있으신지, 또는 시승·견적 중 원하시는 걸 알려주시면 안내해드릴게요.",
    handoff: false,
  };
}

export async function chatReply(history: ChatMessage[]): Promise<{ text: string; handoff: boolean }> {
  const client = getClient();
  if (!client) {
    return ruleBasedChatReply(history);
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: CHAT_SYSTEM_PROMPT,
      messages: history
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.text })),
    });
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    const lastUser = [...history].reverse().find((m) => m.role === "user")?.text || "";
    const handoff =
      /(시승|예약|견적|계약|구매)/.test(lastUser) &&
      history.filter((m) => m.role === "user").length >= 2;

    return { text: text || ruleBasedChatReply(history).text, handoff };
  } catch (err) {
    console.error("[ai] chatReply fallback due to error:", err);
    return ruleBasedChatReply(history);
  }
}

function mockContent(model: string, promo: string, tone: string, channels: ContentPiece["channel"][]): ContentPiece[] {
  const pieces: ContentPiece[] = [];
  if (channels.includes("인스타그램")) {
    pieces.push({
      channel: "인스타그램",
      body: `${model}, 지금이 만나볼 타이밍입니다.\n\n${promo}\n디자인과 주행 감성, 안전 사양까지 새로워진 ${model}을 직접 시승해보세요.\n\n댓글로 "시승" 남겨주시면 편하신 일정으로 안내드립니다 🚗`,
      hashtags: `#한성자동차 #벤츠 #${model.replace(/\s/g, "")} #시승예약`,
    });
  }
  if (channels.includes("블로그")) {
    pieces.push({
      channel: "블로그",
      body: `[한성자동차] ${model}, ${promo} 총정리\n\n안녕하세요, 한성자동차 세일즈 컨설턴트입니다.\n이번 프로모션 대상 차종은 ${model}이며, ${promo} 혜택이 적용됩니다.\n\n정확한 견적과 최적 조건은 상담을 통해 안내드리고 있습니다. 문의 남겨주시면 빠르게 회신드리겠습니다.`,
      hashtags: `#한성자동차벤츠 #${model.replace(/\s/g, "")}`,
    });
  }
  if (channels.includes("카카오채널")) {
    pieces.push({
      channel: "카카오채널",
      body: `[한성자동차] ${model} 안내\n\n안녕하세요 고객님,\n${promo}\n\n관심 있으시면 "상담 문의"라고 답장 주세요. 담당 컨설턴트가 바로 안내드릴게요 🙌`,
      hashtags: "발송 대상: 기존 상담 이력 보유 고객",
    });
  }
  return pieces;
}

export async function generateContent(
  model: string,
  promo: string,
  tone: string,
  channels: ContentPiece["channel"][]
): Promise<ContentPiece[]> {
  const client = getClient();
  if (!client) {
    return mockContent(model, promo, tone, channels);
  }

  const prompt = `아래 조건에 맞춰 자동차 세일즈 컨설턴트가 쓸 홍보 콘텐츠를 채널별로 작성해줘.
차종: ${model}
프로모션/핵심 메시지: ${promo}
톤앤매너: ${tone}
생성할 채널: ${channels.join(", ")}

반드시 아래 JSON 배열 형식으로만 답해줘 (설명 문장 없이 JSON만):
[{"channel": "채널명", "body": "본문", "hashtags": "해시태그 또는 참고 문구"}]`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("no JSON in AI response");
    const parsed = JSON.parse(jsonMatch[0]) as ContentPiece[];
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("empty AI content");
    return parsed;
  } catch (err) {
    console.error("[ai] generateContent fallback due to error:", err);
    return mockContent(model, promo, tone, channels);
  }
}
