# Harmorise API 명세서

> **Base URL** `http://localhost:3000/api` (개발) / `https://api.harmorise.app/api` (운영 예정)
> **인증 방식** Bearer Token (JWT)  
> **최종 업데이트** 2026-06-08 (Songs API, PATCH /practice/:id, PATCH /bpm/songs/:songId 추가)

## 보안 정책

### Rate Limit

| 엔드포인트 | 윈도우 | 최대 요청 | 이유 |
|------------|--------|-----------|------|
| `POST /auth/phone/send-code` | 10분 | 3회 | SMS 요금 폭탄 방지 |
| `POST /auth/phone/verify` | 10분 | 10회 | 인증코드 브루트포스 방지 |
| `POST /auth/signup` | 1시간 | 5회 | 계정 남용 방지 |
| `POST /auth/login` | 15분 | 10회 | 비밀번호 브루트포스 방지 |
| `POST /auth/find-id` | 10분 | 5회 | 사용자 열거 방지 |
| `POST /auth/reset-password` | 10분 | 5회 | 계정 탈취 방지 |

초과 시 **429 Too Many Requests** 응답. `message` 필드에 재시도 가능 시간(초) 포함.

### SMS 쿨다운

같은 번호로 60초 이내 재발송 요청 시 **400 Bad Request** + 남은 대기 시간 반환.

### 보안 헤더

모든 응답에 아래 헤더 포함:

| 헤더 | 값 |
|------|----|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `microphone=(), camera=()` |
| `Strict-Transport-Security` | `max-age=31536000` (운영 환경만) |

### 환경변수 체크리스트 (배포 전 필수)

- [ ] `JWT_SECRET` — `openssl rand -hex 32` 로 생성한 강력한 값으로 교체
- [ ] `PHONE_TOKEN_SECRET` — `openssl rand -hex 32` 로 생성, JWT_SECRET과 다른 값
- [ ] `FRONTEND_URL` — 실제 운영 도메인으로 설정 (CORS 화이트리스트)
- [ ] `NODE_ENV=production` 으로 설정

---

---

## 목차

1. [공통 규칙](#공통-규칙)
2. [인증 (Auth)](#인증-auth)
3. [연습 기록 (Practice)](#연습-기록-practice)
4. [곡 (Songs)](#곡-songs)
5. [BPM](#bpm)
6. [유저 (Users)](#유저-users)

---

## 공통 규칙

### 요청 헤더

| 헤더 | 설명 | 필수 |
|------|------|------|
| `Content-Type` | `application/json` | 항상 |
| `Authorization` | `Bearer {JWT토큰}` | 인증 필요 엔드포인트 |

### 공통 에러 응답

```json
{ "statusCode": 400, "message": "에러 메시지" }
```

| 상태코드 | 의미 |
|----------|------|
| 400 | 잘못된 요청 (유효성 검사 실패) |
| 401 | 인증 실패 / 토큰 만료 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 내부 오류 |

---

## 인증 (Auth)

### POST /auth/phone/send-code

SMS 인증 코드 발송. 개발 환경에서는 서버 콘솔에 출력.

**Query**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `signup` | `boolean` | `true` = 회원가입용 (이미 가입된 번호 차단) |

**Request Body**

```json
{ "phone": "01012345678" }
```

**Response 200**

```json
{ "message": "인증 코드가 발송되었습니다." }
```

---

### POST /auth/phone/verify

SMS 인증 코드 검증. 성공 시 `phoneToken` 반환 (3분 유효).

**Request Body**

```json
{ "phone": "01012345678", "code": "123456" }
```

**Response 200**

```json
{ "phoneToken": "uuid-형식-토큰" }
```

---

### POST /auth/signup

회원가입. `phoneToken`은 `/auth/phone/verify`에서 받은 값.

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "abc12345",
  "phone": "01012345678",
  "phoneToken": "uuid-형식-토큰"
}
```

> 비밀번호: 8자 이상, 영문+숫자 포함

**Response 201**

```json
{ "message": "회원가입이 완료되었습니다." }
```

---

### POST /auth/login

로그인. JWT 액세스 토큰 반환 (7일 유효).

**Request Body**

```json
{ "email": "user@example.com", "password": "abc12345" }
```

**Response 200**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "MEMBER"
  }
}
```

---

### POST /auth/find-id

전화번호로 이메일(아이디) 찾기.

**Request Body**

```json
{ "phone": "01012345678", "phoneToken": "uuid-형식-토큰" }
```

**Response 200**

```json
{ "email": "u***@example.com" }
```

---

### POST /auth/reset-password

비밀번호 재설정.

**Request Body**

```json
{
  "phone": "01012345678",
  "phoneToken": "uuid-형식-토큰",
  "newPassword": "newpass123"
}
```

**Response 200**

```json
{ "message": "비밀번호가 변경되었습니다." }
```

---

## 연습 기록 (Practice)

> 모든 엔드포인트 `Authorization: Bearer {token}` 필수

### POST /practice

연습 기록 생성.

**Request Body**

```json
{
  "practicedAt": "2026-05-31",
  "durationMinutes": 45,
  "instrumentName": "기타",
  "songTitle": "Blackbird",
  "artist": "The Beatles",
  "bpm": 80,
  "practiceTypes": ["SONG", "BASIC"],
  "memo": "3번 줄 코드 전환 집중 연습"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `practicedAt` | `YYYY-MM-DD` | ✅ | 연습 날짜 |
| `durationMinutes` | `number` | ✅ | 연습 시간 (5~720분) |
| `instrumentName` | `string` | - | 악기 이름 (없으면 자동 생성) |
| `songTitle` | `string` | - | 곡 제목. 동명 곡은 upsert (title 기준 찾거나 생성) |
| `artist` | `string` | - | 아티스트 |
| `bpm` | `number` | - | 달성 BPM (20~300) |
| `targetBpm` | `number` | - | 목표 BPM (20~300). 입력 시 해당 곡의 목표치로 저장 |
| `practiceTypes` | `PracticeType[]` | - | `BASIC` \| `SONG` \| `IMPROVISATION` \| `THEORY` |
| `memo` | `string` | - | 메모 (최대 1000자) |

**Response 201**

```json
{
  "id": "uuid",
  "practicedAt": "2026-05-31T00:00:00.000Z",
  "durationMinutes": 45,
  "bpm": 80,
  "instrumentName": "기타",
  "songTitle": "Blackbird",
  "artist": "The Beatles",
  "practiceTypes": ["SONG", "BASIC"],
  "memos": [{ "id": "uuid", "content": "3번 줄 코드 전환 집중 연습", "createdAt": "..." }],
  "createdAt": "..."
}
```

---

### GET /practice

연습 기록 목록 (최신순, cursor 기반 페이지네이션).

**Query**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `cursor` | `string` | - | 이전 응답의 `nextCursor` |
| `limit` | `number` | `20` | 페이지 크기 |

**Response 200**

```json
{
  "items": [ /* PracticeSession 배열 */ ],
  "nextCursor": "uuid 또는 null"
}
```

---

### GET /practice/streak

현재 연속 연습 streak 조회.  
저장된 카운터가 아닌 실제 세션 날짜 데이터에서 매번 계산 (삭제/수정 반영됨).

**Response 200**

```json
{
  "currentStreak": 12,
  "longestStreak": 21
}
```

---

### GET /practice/stats/monthly

월별 캘린더 통계. 날짜별 달성 레벨 포함.

**Query**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `year` | `number` | 현재 년도 | 연도 |
| `month` | `number` | 현재 월 | 월 (1~12) |

**Response 200**

```json
{
  "year": 2026,
  "month": 5,
  "dailyGoalMinutes": 30,
  "days": {
    "2026-05-24": {
      "totalMinutes": 45,
      "level": "perfect",
      "sessions": [
        {
          "id": "uuid",
          "songTitle": "Blackbird",
          "instrumentName": "기타",
          "durationMinutes": 45,
          "bpm": 80
        }
      ]
    }
  },
  "summary": {
    "practicedDays": 18,
    "totalMinutes": 740,
    "perfectDays": 8,
    "greatDays": 5,
    "goodDays": 5
  },
  "streak": {
    "currentStreak": 12,
    "longestStreak": 21
  }
}
```

**달성 레벨 기준**

| 레벨 | 조건 | 색상 |
|------|------|------|
| `perfect` | `totalMinutes >= dailyGoalMinutes` (100%) | 진보라 |
| `great` | `totalMinutes >= dailyGoalMinutes × 0.7` (70%) | 하늘파랑 |
| `good` | `totalMinutes > 0` (1분 이상) | 연파랑 |
| `none` | `0분` | 회색 |

---

### GET /practice/stats/summary

홈 화면용 오늘 연습 시간·주간 일수·스트리크·최근 기록 3개.

**Response 200**

```json
{
  "todayMinutes": 45,
  "weekPracticedDays": 3,
  "streak": { "currentStreak": 12, "longestStreak": 21 },
  "recentSessions": [ /* PracticeSession 배열 (최대 3개) */ ]
}
```

---

### GET /practice/:id

연습 기록 단건 조회.

**Response 200** — `POST /practice` 응답과 동일 구조 (memos 포함)

**Response 403** — 다른 유저의 기록 접근 시

---

### PATCH /practice/:id

연습 기록 수정. 전달한 필드만 업데이트.

**Request Body** (모든 필드 선택)

| 필드 | 타입 | 설명 |
|------|------|------|
| `practicedAt` | `YYYY-MM-DD` | 연습 날짜 |
| `durationMinutes` | `number` | 연습 시간 (5~720분) |
| `instrumentName` | `string` | 악기 이름 |
| `songTitle` | `string` | 곡 제목 |
| `artist` | `string` | 아티스트 |
| `bpm` | `number` | 달성 BPM. 변경 시 기존 BpmRecord 교체 |
| `targetBpm` | `number` | 목표 BPM |
| `practiceTypes` | `PracticeType[]` | 연습 유형 (전체 교체) |
| `memo` | `string \| null` | 메모. `null` 전달 시 삭제 |

**Response 200** — 업데이트된 `PracticeSession` 반환

**Response 403** — 다른 유저의 기록 수정 시도 시

---

### DELETE /practice/:id

연습 기록 삭제.

**Response 200**

```json
{ "message": "삭제되었습니다." }
```

---

## 유저 (Users)

> 모든 엔드포인트 `Authorization: Bearer {token}` 필수

### GET /users/me

내 프로필 조회.

**Response 200**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "MEMBER",
  "isTeacher": false,
  "phone": "010****5678",
  "profile": {
    "nickname": "솔",
    "profileImageUrl": null,
    "mainInstrumentId": null,
    "dailyGoalMinutes": 30,
    "weeklyGoalMinutes": 150
  }
}
```

---

### PATCH /users/me

프로필 수정. 전달한 필드만 업데이트.

**Request Body**

```json
{
  "nickname": "솔",
  "mainInstrumentId": "uuid",
  "dailyGoalMinutes": 45,
  "weeklyGoalMinutes": 210
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `nickname` | `string` | 최대 50자 |
| `mainInstrumentId` | `string` | instruments 테이블 UUID |
| `dailyGoalMinutes` | `number` | 5~720분 |
| `weeklyGoalMinutes` | `number` | 10~5040분 |

**Response 200** — 업데이트된 프로필 반환

---

## 관리자 (Admin)

> 모든 엔드포인트 `Authorization: Bearer {token}` + `role=ADMIN` 필수  
> 권한 없을 시 **403 Forbidden**

### GET /admin/stats/overview

대시보드 핵심 지표.

**Response 200**

```json
{
  "totalUsers": 1284,
  "dau": 312,
  "premiumCount": 89,
  "premiumRate": 6.9,
  "avgPracticeMinutes": 38,
  "newUsersThisWeek": 48
}
```

---

### GET /admin/stats/activity

요일별 연습 세션 수 + 악기 분포 (최근 4주 기준).

**Response 200**

```json
{
  "weekdaySessions": [
    { "label": "일", "count": 132 },
    { "label": "월", "count": 216 }
  ],
  "instrumentDist": [
    { "name": "기타", "count": 450, "percentage": 50 },
    { "name": "피아노", "count": 225, "percentage": 25 }
  ]
}
```

---

### GET /admin/users

유저 목록 (cursor 기반 페이지네이션, 이메일 검색).

**Query**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `cursor` | `string` | - | 이전 응답의 `nextCursor` |
| `limit` | `number` | `20` | 페이지 크기 |
| `search` | `string` | - | 이메일 검색 (부분일치) |

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "email": "k***@naver.com",
      "nickname": "솔",
      "role": "MEMBER",
      "isActive": true,
      "plan": "FREE",
      "isPremium": false,
      "sessionCount": 24,
      "lastLoginAt": "2026-05-31T...",
      "createdAt": "2026-05-01T..."
    }
  ],
  "nextCursor": "uuid 또는 null"
}
```

> 이메일은 마스킹 처리됨 (`k***@naver.com`)

---

### PATCH /admin/users/:id/status

유저 활성/정지 토글. `role=ADMIN` 유저는 토글 불가.

**Request Body**

```json
{ "isActive": false }
```

**Response 200**

```json
{ "id": "uuid", "isActive": false }
```

---

---

## 곡 (Songs)

> 모든 엔드포인트 `Authorization: Bearer {token}` 필수

### GET /songs

내 전체 곡 목록. `q` 파라미터 없으면 최근 수정순 전체 반환.  
연습 기록 작성 화면의 곡 선택 자동완성 및 내 연습곡 목록 화면에서 사용.

**Query**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `q` | `string` | 곡명 / 아티스트 부분 검색 |
| `limit` | `number` | 최대 반환 수 (기본 100, `q` 있을 때 기본 20) |

**Response 200**

```json
[
  {
    "id": "uuid",
    "title": "Blackbird",
    "artist": "The Beatles",
    "targetBpm": 100,
    "sessionCount": 5,
    "lastPracticedAt": "2026-06-08T00:00:00.000Z",
    "latestBpm": 88,
    "pct": 88
  }
]
```

> `pct`: `latestBpm / targetBpm * 100` (최대 100). `targetBpm` 없으면 `null`.

---

### GET /songs/:id

곡 단건 조회.

**Response 200**

```json
{
  "id": "uuid",
  "title": "Blackbird",
  "artist": "The Beatles",
  "targetBpm": 100
}
```

---

### GET /songs/:id/sessions

특정 곡의 연습 기록 목록 + 통계. BPM 상세 화면 "연습 기록" 탭에서 사용.

**Response 200**

```json
{
  "song": { "id": "uuid", "title": "Blackbird", "artist": "The Beatles", "targetBpm": 100 },
  "stats": {
    "totalMinutes": 230,
    "sessionCount": 5,
    "startBpm": 72,
    "latestBpm": 88
  },
  "sessions": [
    {
      "id": "uuid",
      "practicedAt": "2026-06-08T00:00:00.000Z",
      "durationMinutes": 45,
      "bpm": 88,
      "instrumentName": "기타",
      "practiceTypes": ["SONG"],
      "memos": [],
      "createdAt": "..."
    }
  ]
}
```

---

## BPM

> 모든 엔드포인트 `Authorization: Bearer {token}` 필수

### GET /bpm/songs

BPM 기록이 있는 곡 목록. 홈 화면 + BPM 목록 화면에서 사용.

**Response 200**

```json
[
  {
    "songId": "uuid",
    "title": "Blackbird",
    "artist": "The Beatles",
    "currentBpm": 84,
    "targetBpm": 100,
    "pct": 84,
    "lastRecordedAt": "2026-05-31T00:00:00.000Z"
  }
]
```

---

### GET /bpm/songs/:songId

특정 곡의 BPM 성장 이력 (시계열). BPM 상세 화면 차트용.

**Response 200**

```json
{
  "song": {
    "id": "uuid",
    "title": "Blackbird",
    "artist": "The Beatles",
    "targetBpm": 100
  },
  "records": [
    { "bpm": 72, "recordedAt": "2026-05-01T00:00:00.000Z" },
    { "bpm": 84, "recordedAt": "2026-05-31T00:00:00.000Z" }
  ]
}
```

**Response 404** — 곡이 없거나 다른 유저의 곡일 때

---

### PATCH /bpm/songs/:songId

목표 BPM 수정. BPM 상세 화면에서 사용.

**Request Body**

```json
{ "targetBpm": 120 }
```

**Response 200** — 업데이트된 Song 반환

```json
{
  "id": "uuid",
  "title": "Blackbird",
  "artist": "The Beatles",
  "targetBpm": 120
}
```

---

## 개발 예정 (Phase 1 미완성)

| 엔드포인트 | 설명 | 우선순위 |
|------------|------|----------|
| `GET /reports` | 리포트 목록 | 🟡 중간 |
| `GET /reports/:id` | 리포트 상세 | 🟡 중간 |
| `GET /users/me/notifications` | 알림 설정 조회 | 🟡 중간 |
| `PATCH /users/me/notifications` | 알림 설정 변경 | 🟡 중간 |

---

## 감사 로그 (AuditLog)

DB에 기록되는 내부 이벤트 로그. 별도 API 엔드포인트 없이 서버 측에서만 기록.

| 액션 | 트리거 시점 |
|------|------------|
| `LOGIN_SUCCESS` | 로그인 성공 |
| `LOGIN_FAIL` | 이메일 불일치 / 비밀번호 불일치 / 비활성 계정 |
| `PRACTICE_CREATE` | 연습 기록 생성 |
| `PRACTICE_DELETE` | 연습 기록 삭제 |
| `PROFILE_UPDATE` | 프로필 변경 (예정) |
| `ADMIN_USER_STATUS_CHANGE` | 관리자의 유저 상태 변경 |

**audit_logs 테이블 스키마**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (UUID) | PK |
| userId | TEXT? | FK → users.id (SET NULL on delete) |
| action | AuditAction enum | 이벤트 종류 |
| meta | JSONB | 부가 정보 (ip, targetId, reason 등) |
| createdAt | TIMESTAMPTZ | 기록 시각 |
