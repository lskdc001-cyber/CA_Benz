import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ContentChannel, ContentPiece } from "./types";

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

/**
 * 컨설턴트에게 상담을 넘겨야 하는 시점인지 판정한다.
 *
 * 첫 문의부터 바로 넘기면 단순 정보 문의까지 전부 인계돼 컨설턴트가 지치므로,
 * 고객이 두 번 이상 대화를 이어가면서 구매 단계와 직결된 의사를 보였을 때만 넘긴다.
 *
 * 규칙기반 응답과 Claude API 응답이 같은 기준을 쓰도록 여기 한 곳에 둔다.
 * (예전에는 두 경로가 서로 다른 키워드를 써서 API 키 설정 여부에 따라 판정이 달라졌다.)
 */
export const HANDOFF_KEYWORDS = /(시승|예약|견적|계약|구매|가격|할부|리스)/;

export function shouldHandoff(history: ChatMessage[]): boolean {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser) return false;

  const userTurns = history.filter((m) => m.role === "user").length;
  return HANDOFF_KEYWORDS.test(lastUser.text) && userTurns >= 2;
}

function ruleBasedChatReply(history: ChatMessage[]): { text: string; handoff: boolean } {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const msg = (lastUser?.text || "").toLowerCase();

  const wantsHandoff = shouldHandoff(history);

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

    return { text: text || ruleBasedChatReply(history).text, handoff: shouldHandoff(history) };
  } catch (err) {
    console.error("[ai] chatReply fallback due to error:", err);
    return ruleBasedChatReply(history);
  }
}

/**
 * 채널별 작성 지침.
 *
 * 채널마다 읽는 맥락이 달라서 같은 문구를 돌려쓰면 전부 어중간해진다.
 * 블로그는 검색으로 들어온 사람이 정보를 찾으러 오고, 쇼츠는 넘기다 멈춘
 * 사람을 3초 안에 붙잡아야 하며, 카카오채널은 이미 관계가 있는 고객에게 간다.
 */
const CHANNEL_GUIDE: Record<ContentChannel, string> = {
  인스타그램:
    "2~4문장 + 줄바꿈으로 시각적 여백을 준다. 첫 문장이 스크롤을 멈추게 해야 한다. 마지막에 댓글/DM 유도 한 줄.",
  "네이버 블로그":
    "검색 유입이 목적이다. 제목은 40자 이내로 핵심 키워드를 앞에 배치한다. " +
    "본문은 소제목(▪ 또는 ##)으로 3~4개 단락을 나누고, 각 단락은 3~5문장. " +
    "첫 단락 안에 핵심 키워드를 자연스럽게 2회 넣는다. " +
    "본문 중간에 [이미지: 설명] 형태로 사진 삽입 위치를 3곳 표시한다. " +
    "마지막은 상담 문의 유도로 닫는다. 태그는 10~15개.",
  카카오채널:
    "이미 상담 이력이 있는 고객에게 간다. 인사 → 핵심 혜택 → 회신 유도 순으로 6줄 이내. " +
    "광고성 메시지이므로 본문 첫머리에 (광고) 표기를 넣는다.",
  "유튜브 쇼츠":
    "60초 이내 세로 영상 대본이다. 아래 구조를 그대로 지킨다.\n" +
    "[0-3초 후킹] 스크롤을 멈추게 하는 한 문장\n" +
    "[4-45초 본론] 자막 단위로 줄바꿈, 한 줄 15자 이내\n" +
    "[46-60초 CTA] 프로필 링크/댓글 유도\n" +
    "각 줄 앞에 초 단위 타임코드를 붙인다.",
};

/** 채널별 부가 산출물(제목·촬영 가이드) 작성 지침 */
const CHANNEL_EXTRA_GUIDE: Partial<Record<ContentChannel, string>> = {
  "네이버 블로그": "title에는 검색 노출용 제목을, notes에는 발행 전 확인할 체크리스트를 넣는다.",
  "유튜브 쇼츠":
    "title에는 영상 제목(30자 이내)을, notes에는 필요한 촬영 샷 리스트를 3~5개 넣는다.",
};

function mockContent(
  model: string,
  promo: string,
  tone: string,
  channels: ContentChannel[]
): ContentPiece[] {
  const tag = model.replace(/\s/g, "");
  const pieces: ContentPiece[] = [];

  if (channels.includes("인스타그램")) {
    pieces.push({
      channel: "인스타그램",
      body: `${model}, 지금이 만나볼 타이밍입니다.\n\n${promo}\n디자인과 주행 감성, 안전 사양까지 새로워진 ${model}을 직접 시승해보세요.\n\n댓글로 "시승" 남겨주시면 편하신 일정으로 안내드립니다 🚗`,
      hashtags: `#한성자동차 #벤츠 #${tag} #시승예약`,
    });
  }

  if (channels.includes("네이버 블로그")) {
    pieces.push({
      channel: "네이버 블로그",
      title: `${model} 견적과 ${promo} 총정리`,
      body: `안녕하세요, 한성자동차 세일즈 컨설턴트입니다.\n${model} 견적을 알아보고 계신 분들을 위해 ${promo} 내용을 정리했습니다.\n\n[이미지: ${model} 외관 전면]\n\n▪ 이번 달 혜택\n${promo}이 적용됩니다. 적용 조건은 트림과 계약 시점에 따라 달라지므로 상담 시 정확히 안내드리고 있습니다.\n\n▪ ${model} 어떤 분께 맞을까\n일상 주행과 장거리를 함께 소화해야 하는 분께 적합합니다. 실제 시승을 통해 주행 감성을 확인해보시길 권합니다.\n\n[이미지: 실내 인테리어]\n\n▪ 견적 문의 방법\n댓글이나 아래 연락처로 문의 주시면 조건에 맞는 견적을 안내드리겠습니다.\n\n[이미지: 전시장 전경]`,
      hashtags: `#${tag} #${tag}견적 #벤츠${tag} #한성자동차 #수입차견적 #시승예약 #벤츠프로모션`,
      notes: "발행 전 확인: 실제 프로모션 조건과 일치하는지 · 브랜드 이미지 사용 범위 · 이미지 3장 준비",
    });
  }

  if (channels.includes("카카오채널")) {
    pieces.push({
      channel: "카카오채널",
      body: `(광고) [한성자동차] ${model} 안내\n\n안녕하세요 고객님,\n${promo}\n\n관심 있으시면 "상담 문의"라고 답장 주세요. 담당 컨설턴트가 바로 안내드릴게요 🙌\n\n무료수신거부 080-XXX-XXXX`,
      hashtags: "발송 대상: 광고성 정보 수신동의 고객",
    });
  }

  if (channels.includes("유튜브 쇼츠")) {
    pieces.push({
      channel: "유튜브 쇼츠",
      title: `${model} 지금 사면 이거 받습니다`,
      body: `[0-3초] ${model}, 지금 계약하면 뭐가 달라지냐면\n[4-10초] ${promo}\n[11-20초] 트림에 따라 조건이 달라집니다\n[21-32초] 실제 견적은 상담으로만 정확히 나와요\n[33-45초] 시승부터 해보시는 걸 추천드립니다\n[46-60초] 프로필 링크로 시승 예약하세요`,
      hashtags: `#${tag} #벤츠 #쇼츠 #시승 #한성자동차`,
      notes: "촬영 샷: ① 전면 워킹샷 ② 실내 대시보드 ③ 주행 중 핸들 ④ 전시장 외관 ⑤ 컨설턴트 정면 인터뷰",
    });
  }

  return pieces;
}

export async function generateContent(
  model: string,
  promo: string,
  tone: string,
  channels: ContentChannel[]
): Promise<ContentPiece[]> {
  const client = getClient();
  if (!client) {
    return mockContent(model, promo, tone, channels);
  }

  const channelInstructions = channels
    .map((ch) => {
      const extra = CHANNEL_EXTRA_GUIDE[ch];
      return `- ${ch}: ${CHANNEL_GUIDE[ch]}${extra ? ` ${extra}` : ""}`;
    })
    .join("\n");

  const prompt = `아래 조건에 맞춰 자동차 세일즈 컨설턴트가 쓸 홍보 콘텐츠를 채널별로 작성해줘.

차종: ${model}
프로모션/핵심 메시지: ${promo}
톤앤매너: ${tone}

채널별 작성 지침:
${channelInstructions}

지켜야 할 것:
- 가격, 할부/리스 조건, 재고를 확정해서 쓰지 말 것. 정확한 조건은 상담으로 안내한다고 쓴다.
- 벤츠코리아/한성자동차 공식 발표로 오인될 표현을 쓰지 말 것.
- 과장 표현("최저가", "무조건" 등) 대신 확인 가능한 사실만 쓸 것.

반드시 아래 JSON 배열 형식으로만 답해줘 (설명 문장 없이 JSON만):
[{"channel": "채널명", "title": "제목(해당 채널만)", "body": "본문", "hashtags": "해시태그", "notes": "작업자 메모(해당 채널만)"}]`;

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
