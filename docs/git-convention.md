# Git 협업 규칙

> **프로젝트:** Harmorise  
> **작성팀:** 개발팀  
> **작성일:** 2026-06-08

---

## 1. 브랜치 전략 — GitHub Flow

```
main
 └─ feature/login-api
 └─ feature/bpm-chart
 └─ fix/streak-bug
 └─ hotfix/jwt-expiry
```

| 브랜치 | 용도 | 직접 push |
|--------|------|-----------|
| `main` | 배포 가능한 최신 코드 | ❌ PR만 허용 |
| `feature/*` | 새 기능 개발 | ✅ |
| `fix/*` | 버그 수정 | ✅ |
| `hotfix/*` | 운영 긴급 패치 | ✅ |
| `docs/*` | 문서만 수정 | ✅ |
| `refactor/*` | 리팩토링 | ✅ |

### 규칙
- `main`에 직접 push 금지. 반드시 PR을 통해 머지.
- 브랜치는 작업 단위로 잘게 쪼개기. (하나의 브랜치 = 하나의 기능 or 버그)
- 머지 완료된 브랜치는 즉시 삭제.

---

## 2. 브랜치 네이밍

```
{타입}/{이슈번호}-{간단한-설명}
```

| 타입 | 예시 |
|------|------|
| `feature` | `feature/23-song-list-page` |
| `fix` | `fix/31-streak-calculation` |
| `hotfix` | `hotfix/jwt-null-error` |
| `docs` | `docs/api-spec-update` |
| `refactor` | `refactor/practice-service` |

- 영어 소문자 + 하이픈(`-`) 사용
- 이슈 번호 있으면 포함, 없으면 생략 가능

---

## 3. 커밋 메시지 — Conventional Commits

```
{타입}: {제목}

{본문 — 선택}
```

### 타입 목록

| 타입 | 용도 | 예시 |
|------|------|------|
| `feat` | 새 기능 | `feat: 연습 기록 수정 API 추가` |
| `fix` | 버그 수정 | `fix: 스트릭 연속일 계산 오류 수정` |
| `docs` | 문서 변경 | `docs: API 명세 Songs 섹션 추가` |
| `refactor` | 기능 변화 없는 코드 개선 | `refactor: PracticeService streak 계산 분리` |
| `style` | 포맷·공백 등 (로직 무관) | `style: 들여쓰기 정리` |
| `test` | 테스트 추가·수정 | `test: BPM 서비스 유닛 테스트 추가` |
| `chore` | 빌드·설정 변경 | `chore: watch 모드 설정 추가` |
| `perf` | 성능 개선 | `perf: 곡 목록 쿼리 인덱스 추가` |

### 제목 규칙
- 50자 이내
- 명령형 현재형 (`추가했다` ❌ → `추가` ✅)
- 마침표 없음

### 본문 (선택)
- 왜 변경했는지 설명
- 제목과 빈 줄로 구분

### 예시

```
feat: 내 연습곡 목록 화면 추가

- /songs 라우트 신규 추가
- 전체 곡 / BPM 기록 있는 곡 필터 탭
- 곡 카드 클릭 시 /bpm/:songId 이동
```

```
fix: 세션 삭제 시 BpmRecord 고아 데이터 남는 문제 수정

onDelete: SetNull 설정으로 sessionId만 null이 되고
실제 레코드가 삭제되지 않던 버그. 삭제 전 명시적으로
bpmRecord.deleteMany 호출하도록 수정.
```

---

## 4. PR(Pull Request) 규칙

### PR 제목
커밋 메시지와 동일한 형식:
```
feat: BPM 상세 연습 기록 탭 추가
```

### PR 본문 템플릿

```markdown
## 작업 내용
- 변경한 것 bullet로 간략히

## 관련 이슈
Closes #이슈번호

## 테스트 방법
1. 서버 실행 후 ...
2. ...

## 스크린샷 (UI 변경 시)
```

### 머지 방식: Squash & Merge
- PR의 여러 커밋을 하나로 합쳐서 main에 머지
- main 히스토리가 기능 단위로 깔끔하게 유지됨
- 머지 커밋 메시지 = PR 제목으로 자동 설정

### 리뷰 규칙
- 최소 1명 이상 approve 후 머지
- 본인 PR 본인 머지 금지 (긴급 hotfix 제외)
- 리뷰 요청 후 24시간 내 응답 원칙

---

## 5. 작업 흐름 요약

```bash
# 1. main 최신 상태로 동기화
git switch main
git pull origin main

# 2. 브랜치 생성
git switch -c feature/42-song-list-page

# 3. 작업 후 커밋
git add .
git commit -m "feat: 내 연습곡 목록 화면 추가"

# 4. push
git push origin feature/42-song-list-page

# 5. GitHub에서 PR 생성 → 리뷰 → Squash & Merge

# 6. 머지 후 브랜치 삭제
git switch main
git pull origin main
git branch -d feature/42-song-list-page
```

---

## 6. 하면 안 되는 것

| 금지 | 이유 |
|------|------|
| `main`에 직접 push | 리뷰 없이 배포 코드 오염 |
| `git push --force` on main | 히스토리 파괴 |
| 커밋에 `.env` 포함 | 시크릿 노출 |
| 거대한 PR (500줄+) | 리뷰 불가능 |
| WIP 코드 main 머지 | 빌드 깨짐 |

---

## 7. 긴급 핫픽스

운영 장애 시:

```bash
git switch main
git pull origin main
git switch -c hotfix/jwt-null-error

# 수정 후
git commit -m "hotfix: JWT null 오류 수정"
git push origin hotfix/jwt-null-error

# PR → 빠른 리뷰 → Squash & Merge → 즉시 배포
```
