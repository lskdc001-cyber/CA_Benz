# 세일즈 비서 에이전트 (Sales Secretary Agent)

한성자동차 벤츠 세일즈 컨설턴트를 위한 업무 자동화 웹 앱입니다. **AI 고객 상담봇 · 광고/콘텐츠 자동 생성 · 리드/CRM 관리 · 사후관리 자동화** 4가지 기능을 하나의 대시보드에서 제공합니다.

- 📄 사업 기획서: [`docs/PLANNING.md`](docs/PLANNING.md)
- 📈 마케팅 전략: [`docs/MARKETING.md`](docs/MARKETING.md)
- 🖥️ 클릭 가능한 프로토타입: 별도 Artifact로 발행됨 (세션 내 링크 참고)
- 💻 이 저장소: 실제 동작하는 MVP 앱 (Next.js)

## 4대 기능

| 메뉴 | 설명 |
|---|---|
| 개요 (`/`) | 리드/상담/콘텐츠/사후관리 현황을 요약한 대시보드 |
| AI 상담봇 (`/chatbot`) | 차종 추천, 시승/견적 문의에 자동 응대하고 필요 시 CRM에 리드를 등록 + 컨설턴트 인계 |
| 콘텐츠 생성 (`/content`) | 차종·프로모션 조건을 입력하면 인스타그램/네이버 블로그/카카오채널/유튜브 쇼츠 콘텐츠를 자동 생성 |
| 리드/CRM (`/crm`) | 신규문의 → 상담중 → 시승완료 → 견적발송 → 계약 → 출고대기 → 출고완료 파이프라인 관리 |
| 사후관리 (`/followup`) | 출고일 기준 정기점검·보험 만기·재구매 알림 일정을 자동 계산 |

## 시작하기

```bash
npm install
npm run seed   # data/db.json을 예시 데이터로 초기화 (최초 1회, 또는 데이터 리셋 시)
npm run dev    # http://localhost:3000
```

### Claude API 연동 (선택)

AI 상담봇과 콘텐츠 생성기는 `ANTHROPIC_API_KEY`가 없어도 규칙 기반/템플릿 기반 모의(mock) 응답으로 정상 동작합니다. 실제 Claude API로 응답 품질을 높이려면:

```bash
cp .env.example .env
# .env 파일에 ANTHROPIC_API_KEY=sk-ant-... 입력
```

## 데이터 저장 방식

별도 데이터베이스 설치 없이 `data/db.json` 파일에 리드/상담이력/생성콘텐츠를 저장하는 경량 구조입니다 (MVP 단계 선택). 운영 규모가 커지면 PostgreSQL/Supabase 등으로 교체를 권장합니다 (`docs/PLANNING.md` 3.1 기술 스택 참고).

## 스크립트

- `npm run dev` — 개발 서버 실행
- `npm run build` / `npm run start` — 프로덕션 빌드 및 실행
- `npm run seed` — `data/db.json`을 `data/seed.json` 예시 데이터로 초기화
- `npm test` — 단위 테스트 실행 (사후관리 스케줄러, 날짜 유틸)
- `npm run test:watch` — 테스트 watch 모드

## 폴더 구조

```
app/                # Next.js App Router 페이지 + API 라우트
  page.tsx           개요 대시보드
  chatbot/           AI 상담봇 콘솔
  content/           콘텐츠 자동 생성기
  crm/               리드 파이프라인(칸반)
  followup/          사후관리 자동화 타임라인
  api/               leads / chat / content / followups API
lib/                # 공용 로직 (타입, 파일 DB, AI 연동, 팔로업 스케줄러, 수신동의 만료, 날짜 유틸)
  *.test.ts          단위 테스트 (vitest)
components/         # Sidebar 등 공용 UI
data/               # seed.json(예시 데이터) / db.json(실행 시 생성되는 실데이터, git 미포함)
docs/PLANNING.md    # 사업 기획서
docs/MARKETING.md   # 마케팅 전략 (고객 확보 / 제품 판매 2트랙)
scripts/seed.mjs    # 데이터 초기화 스크립트
.claude/skills/     # 프로젝트 전용 Claude 스킬 (letsgo: "레츠고"로 다음 단계 즉시 실행)
.github/workflows/  # CI (테스트: UTC/Asia/Seoul 두 타임존, 빌드)
```

## 알려진 제약 / 다음 단계

- 현재 저장소는 단일 컨설턴트/단일 프로세스를 가정한 파일 기반 DB로, 다중 사용자 동시 쓰기에는 적합하지 않습니다. 지점 단위 확장 시 실제 DB로 전환이 필요합니다.
- 카카오 알림톡/문자(SMS) 실제 발송 연동은 아직 붙어 있지 않습니다 (사후관리/콘텐츠 화면은 발송 대상·문구까지 생성하고, 실제 채널 연동은 Phase 3 로드맵 항목).
- 광고성 정보 수신동의(정보통신망법)는 CRM 등록 시 수집하며, 동의 없는 채널·만료된 동의(2년 경과)의 광고성 사후관리 메시지는 자동으로 `발송 불가` 처리됩니다. 실발송 연동 시 본문 `(광고)` 표기와 수신거부 방법 명시를 추가 구현해야 합니다.
- `npm audit`에 Next.js 14.x 계열의 알려진 이슈가 일부 표시됩니다. 사내/사설 환경 데모 목적의 MVP이므로 우선 최신 14.2.x 패치 버전을 사용했으며, 외부에 공개 배포하기 전에는 Next.js 15/16으로의 업그레이드를 검토하세요.
