import { beforeEach, describe, expect, it, vi } from "vitest";
import { chatReply, generateContent, shouldHandoff } from "./ai";
import type { ChatMessage } from "./types";

function user(text: string): ChatMessage {
  return { role: "user", text, at: "2026-09-07T00:00:00Z" };
}
function bot(text: string): ChatMessage {
  return { role: "assistant", text, at: "2026-09-07T00:00:00Z" };
}

describe("shouldHandoff", () => {
  it("대화가 없으면 넘기지 않는다", () => {
    expect(shouldHandoff([])).toBe(false);
  });

  it("첫 문의만으로는 넘기지 않는다", () => {
    // 단순 정보 문의까지 전부 인계되면 컨설턴트가 감당하지 못한다
    expect(shouldHandoff([user("GLC 시승 가능한가요?")])).toBe(false);
  });

  it("두 번째 턴에서 구매 의사를 보이면 넘긴다", () => {
    const history = [user("안녕하세요"), bot("안녕하세요, 무엇을 도와드릴까요?"), user("시승 예약하고 싶어요")];
    expect(shouldHandoff(history)).toBe(true);
  });

  it("대화가 길어도 마지막 고객 발화에 구매 신호가 없으면 넘기지 않는다", () => {
    const history = [
      user("GLC 색상 어떤 게 있나요?"),
      bot("여러 색상이 있습니다."),
      user("실내 옵션도 궁금해요"),
    ];
    expect(shouldHandoff(history)).toBe(false);
  });

  it("가격·할부·리스 문의도 인계 대상이다", () => {
    for (const keyword of ["가격이 얼마인가요", "할부로 하면 어떻게 되나요", "리스 조건 알려주세요"]) {
      const history = [user("안녕하세요"), bot("네, 안녕하세요"), user(keyword)];
      expect(shouldHandoff(history), keyword).toBe(true);
    }
  });

  it("상담사 발화는 고객 턴 수로 세지 않는다", () => {
    // assistant 메시지가 아무리 많아도 고객이 한 번만 말했으면 넘기지 않는다
    const history = [bot("안녕하세요"), bot("무엇을 도와드릴까요?"), user("견적 부탁드려요")];
    expect(shouldHandoff(history)).toBe(false);
  });

  it("판정 기준은 마지막 고객 발화다", () => {
    // 앞에서 시승을 말했더라도 마지막 발화가 일반 문의면 넘기지 않는다
    const history = [user("시승 하고 싶어요"), bot("안내드릴게요"), user("아 그런데 전시장 위치가 어디죠?")];
    expect(shouldHandoff(history)).toBe(false);
  });
});

describe("chatReply (API 키 없이 규칙기반 동작)", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });

  it("시승 문의에는 일정 확인 안내로 답한다", async () => {
    const res = await chatReply([user("시승 예약하고 싶어요")]);
    expect(res.text).toContain("시승 예약");
  });

  it("가격 문의에는 확정 금액 대신 컨설턴트 상담으로 연결한다", async () => {
    // 정확한 견적을 봇이 확정해버리면 실제 계약 조건과 어긋날 수 있다
    const res = await chatReply([user("GLC 얼마인가요?")]);
    expect(res.text).toContain("컨설턴트");
    expect(res.text).toMatch(/정확한 견적|맞춤/);
  });

  it("차종을 언급하면 시승을 제안한다", async () => {
    const res = await chatReply([user("GLC 300 알아보고 있어요")]);
    expect(res.text).toContain("시승");
  });

  it("맥락 없는 인사에는 안내 문구로 답하고 넘기지 않는다", async () => {
    const res = await chatReply([user("안녕하세요")]);
    expect(res.handoff).toBe(false);
    expect(res.text).toContain("한성자동차");
  });

  it("응답의 handoff 값은 shouldHandoff와 일치한다", async () => {
    const history = [user("안녕하세요"), bot("네 안녕하세요"), user("견적 뽑아주세요")];
    const res = await chatReply(history);
    expect(res.handoff).toBe(shouldHandoff(history));
    expect(res.handoff).toBe(true);
  });
});

describe("generateContent (API 키 없이 템플릿 동작)", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });

  it("요청한 채널만 생성한다", async () => {
    const pieces = await generateContent("GLC 300 4MATIC", "9월 프로모션", "신뢰감 있는 전문가", [
      "네이버 블로그",
      "유튜브 쇼츠",
    ]);
    expect(pieces.map((p) => p.channel)).toEqual(["네이버 블로그", "유튜브 쇼츠"]);
  });

  it("네이버 블로그는 제목과 이미지 삽입 위치를 함께 준다", async () => {
    // 네이버는 글쓰기 API가 없어 복붙으로 발행하므로, 제목이 본문과 분리돼 있어야 한다
    const [blog] = await generateContent("E 300", "가을 프로모션", "신뢰감 있는 전문가", [
      "네이버 블로그",
    ]);
    expect(blog.title).toBeTruthy();
    expect(blog.body).toContain("[이미지:");
    expect(blog.notes).toBeTruthy();
  });

  it("유튜브 쇼츠 대본은 3초 후킹으로 시작하고 타임코드를 붙인다", async () => {
    const [shorts] = await generateContent("S 580 4MATIC", "연말 혜택", "친근한 대화체", [
      "유튜브 쇼츠",
    ]);
    expect(shorts.body).toMatch(/^\[0-3초\]/);
    expect(shorts.body).toMatch(/\[46-60초\]/);
    expect(shorts.notes).toContain("촬영 샷");
    expect(shorts.title).toBeTruthy();
  });

  it("카카오채널 문구에는 (광고) 표기와 수신거부 안내가 들어간다", async () => {
    // 광고성 정보 전송 시 법정 표기 사항이라 문구에서 빠지면 안 된다
    const [kakao] = await generateContent("GLE 350d", "겨울 프로모션", "간결한 정보형", [
      "카카오채널",
    ]);
    expect(kakao.body).toContain("(광고)");
    expect(kakao.body).toMatch(/무료수신거부/);
  });

  it("차종명이 해시태그에 반영된다", async () => {
    const [insta] = await generateContent("GLC 300 4MATIC", "프로모션", "친근한 대화체", [
      "인스타그램",
    ]);
    expect(insta.hashtags).toContain("#GLC3004MATIC");
  });
});
