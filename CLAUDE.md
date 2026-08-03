# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Docs Sync (문서 동기화)

**코드 변경과 문서 변경은 항상 같이 이루어진다.**

변경 발생 시 아래 문서를 함께 업데이트한다:

| 변경 유형 | 업데이트할 문서 |
|-----------|----------------|
| DB 스키마 변경 (Prisma) | `docs/db-design.md`, `docs/erd.mermaid` |
| API 엔드포인트 추가/변경/삭제 | `docs/api-spec.md` |
| 기능 추가/변경 | `docs/functional-spec.md` |
| 화면 추가/변경 | `docs/screens.md` |
| 디자인 토큰/컴포넌트 변경 | `docs/design-system.md` |

업데이트 순서: 코드 구현 → 타입 체크 → 문서 업데이트

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 6. 프로젝트 현황 (2026-08-03 기준)

### 기술 스택
- **모노레포**: NX 22.7.2
- **백엔드**: NestJS 11, Prisma ORM, PostgreSQL 16 + TimescaleDB
- **프론트**: React + Vite, Tailwind CSS
- **인프라**: Redis, Redpanda(Kafka 호환), Docker Compose

### 로컬 실행 방법
```bash
# 1. 인프라 띄우기 (DB / Redis / Kafka)
docker compose up postgres redis redpanda -d

# 2. API 서버
npx nx serve api

# 3. Web 서버 (별도 터미널)
npx nx serve web
```
- Web: http://localhost:4200
- API: http://localhost:3000/api

### .env 필수값
```
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/harmorise_db"
JWT_SECRET=             # openssl rand -hex 64
PHONE_TOKEN_SECRET=     # openssl rand -hex 32
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
```

### 완료된 기능
- 회원가입 / 로그인 (JWT + 전화번호 인증)
- 연습 기록 CRUD (악기, 곡, BPM, 메모)
- BPM 트래킹 (곡별 히스토리, 차트)
- 캘린더 (월간 연습 현황, 주간 목표 달성 뱃지)
- 리포트 (주간/월간 — 실제 DB 집계, ISO 주차 기준)
- 커뮤니티 (친구 시스템, 연습방 피드/멤버/참가 요청)
- 연습방 참가 요청 알림 — 방장 "관리" 버튼에 빨간 점 뱃지
- 반응형 레이아웃 — 모바일(BottomTabBar) / 태블릿+(SideNav)
- 메트로놈, 튜너 (튜너: 100ms 감지 주기, ±3/±10¢ 색상 기준)
- AI 평가 도메인 DB 설계 완료 (구현 미착수)
- Docker 설정 (Dockerfile × 2, nginx.conf, docker-compose 전체)

### 다음 할 일 (미구현)
- AI 평가 기능 구현 (Gemini API 연동, S3 업로드, BullMQ 큐)
- 소셜 로그인 (카카오 등)
- 푸시 알림
- 관리자 대시보드 고도화

### 주요 결정 사항 (배경 이해용)
- **0주차 버그**: `getWeekOfMonth`는 `Math.ceil(date.getUTCDate() / 7)` 사용 (월 첫날이 월요일이면 0이 나오는 버그 수정)
- **리포트 라우트**: `/report/weekly/:year/:week`, `/report/monthly/:year/:month` (id 기반 → year/week 기반으로 변경)
- **Docker JWT_SECRET**: compose 파일에서 `:?` 대신 `:-` 사용 — 인프라만 따로 띄울 때 검증 에러 방지
- **Prisma 클라이언트 경로**: `output = "../../../node_modules/.prisma/client"` (모노레포 루트 node_modules)
- **PC 간 협업**: 각 PC에서 `npm install` 별도 실행 필요 (Prisma 네이티브 바이너리가 OS별로 다름)
