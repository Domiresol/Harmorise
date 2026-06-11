# DB 설계서

> **프로젝트:** Harmorise
> **작성팀:** 개발팀
> **버전:** v1.4
> **작성일:** 2026년 6월 11일
> **DB:** PostgreSQL 16 + TimescaleDB

---

## 1. 도메인 구조 개요

```
┌─────────────────────────────────────────────────────────┐
│                     사용자 도메인                         │
│  users / user_profiles / subscriptions / lesson_relations│
└──────────────────────────┬──────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┬───────────────────────┐
        │                  │                  │                       │
┌───────▼──────┐  ┌────────▼───────┐  ┌──────▼──────────┐  ┌────────▼──────────────┐
│  연습 도메인  │  │   곡/악기 도메인 │  │   리포트 도메인  │  │   커뮤니티 도메인       │
│  practice_   │  │  songs         │  │  reports        │  │  friend_requests       │
│  sessions    │  │  instruments   │  │  streaks        │  │  friends               │
│  memos       │  │                │  │                 │  │  rooms / room_members  │
└───────┬──────┘  └────────────────┘  └─────────────────┘  │  room_join_requests   │
        │                                                   └───────────────────────┘
        ├──────────────────────┐
        │                      │
┌───────▼──────────────────┐  ┌▼──────────────────────────────────────────────┐
│  BPM 도메인 (TimescaleDB) │  │  AI 평가 도메인 (Phase 4, Gemini)              │
│  bpm_records (hypertable) │  │  practice_recordings → ai_analysis_jobs        │
└──────────────────────────┘  │                          └─ ai_analysis_results │
                               └───────────────────────────────────────────────┘
```

---

## 2. 사용자 권한 구조

```
role (역할)
├── ADMIN          : 서비스 관리자
└── MEMBER         : 일반 회원
    └── is_teacher (BOOLEAN, 기본값 FALSE)
        ├── FALSE  : 일반 회원 (레슨 수강 가능)
        └── TRUE   : 레슨 선생님 (레슨 제공 + 수강 모두 가능)
```

> **설계 원칙:** MEMBER는 모두 레슨을 받을 수 있으며, `is_teacher = TRUE`인 경우에만 레슨 제공이 가능하다.
> 선생님도 다른 선생님에게 레슨을 받을 수 있는 구조로, 역할이 상호 배타적이지 않다.

---

## 3. 테이블 목록

| # | 테이블명 | 도메인 | 설명 |
|---|---------|--------|------|
| 1 | `users` | 사용자 | 계정 정보, 권한 |
| 2 | `user_profiles` | 사용자 | 프로필, 목표 설정 |
| 3 | `subscriptions` | 사용자 | 유/무료 구독 정보 |
| 4 | `lesson_relations` | 사용자 | 선생님-학생 관계 |
| 5 | `user_characters` | 캐릭터 | 사용자별 캐릭터 커스터마이징 상태 (1:1) |
| 6 | `character_items` | 캐릭터 | 잠금 해제 가능한 아이템 마스터 |
| 7 | `user_unlocked_items` | 캐릭터 | 사용자가 해금한 아이템 (N:M) |
| 8 | `instruments` | 악기 | 악기 마스터 데이터 |
| 9 | `songs` | 곡 | 사용자별 연습 곡 |
| 10 | `practice_sessions` | 연습 | 연습 세션 기록 |
| 11 | `practice_session_types` | 연습 | 세션-연습유형 관계 |
| 12 | `memos` | 연습 | 연습 메모 |
| 13 | `bpm_records` | BPM | BPM 시계열 기록 (hypertable) |
| 14 | `streaks` | 통계 | 연속 연습 일수 |
| 15 | `reports` | 리포트 | 주간/월간 리포트 |
| 16 | `notification_settings` | 알림 | 알림 설정 |
| 17 | `audit_logs` | 보안 | 주요 이벤트 감사 로그 |
| 18 | `practice_recordings` | AI 평가 | 녹음 파일 메타데이터 (S3 키, 상태) |
| 19 | `ai_analysis_jobs` | AI 평가 | 비동기 분석 작업 상태 추적 |
| 20 | `ai_analysis_results` | AI 평가 | Gemini 피드백 + 객관 지표 저장 |

---

## 4. 테이블 상세 명세

---

### 4.1 `users` — 사용자 계정

```sql
CREATE TABLE users (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255)    NOT NULL UNIQUE,
  password_hash   VARCHAR(255),                        -- 소셜 로그인 시 NULL
  role            VARCHAR(20)     NOT NULL DEFAULT 'MEMBER',
  is_teacher      BOOLEAN         NOT NULL DEFAULT FALSE,
  social_provider VARCHAR(20),                         -- 'kakao' | 'google' | 'apple'
  social_id       VARCHAR(255),
  is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_role CHECK (role IN ('ADMIN', 'MEMBER'))
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK, 자동 생성 |
| email | VARCHAR(255) | 로그인 이메일, UNIQUE |
| password_hash | VARCHAR(255) | 소셜 로그인 시 NULL |
| role | VARCHAR(20) | ADMIN / MEMBER |
| is_teacher | BOOLEAN | TRUE면 레슨 제공 가능 (기본값 FALSE) |
| social_provider | VARCHAR(20) | kakao / google / apple |
| social_id | VARCHAR(255) | 소셜 서비스의 고유 ID |
| is_active | BOOLEAN | 탈퇴 처리 여부 |
| last_login_at | TIMESTAMPTZ | 마지막 로그인 시각 |

---

### 4.2 `user_profiles` — 사용자 프로필

```sql
CREATE TABLE user_profiles (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  nickname             VARCHAR(50)  NOT NULL,
  profile_image_url    TEXT,
  main_instrument_id   INT          REFERENCES instruments(id),
  daily_goal_minutes   INT          NOT NULL DEFAULT 30,
  weekly_goal_minutes  INT          NOT NULL DEFAULT 150,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | UUID | FK → users.id (1:1) |
| nickname | VARCHAR(50) | 닉네임 |
| main_instrument_id | INT | 주 악기 FK |
| daily_goal_minutes | INT | 일일 목표 연습 시간 (분) |
| weekly_goal_minutes | INT | 주간 목표 연습 시간 (분) |

---

### 4.3 `subscriptions` — 구독 정보

```sql
CREATE TABLE subscriptions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan          VARCHAR(20)  NOT NULL DEFAULT 'FREE',
  started_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,                           -- FREE는 NULL
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_plan CHECK (plan IN ('FREE', 'PREMIUM'))
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| plan | VARCHAR(20) | FREE / PREMIUM |
| expires_at | TIMESTAMPTZ | 구독 만료일 (무료는 NULL) |
| is_active | BOOLEAN | 현재 활성 구독 여부 |

---

### 4.4 `lesson_relations` — 레슨 선생님-학생 관계

```sql
CREATE TABLE lesson_relations (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID         NOT NULL REFERENCES users(id),
  student_id    UUID         NOT NULL REFERENCES users(id),
  status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_lesson_relation UNIQUE (teacher_id, student_id),
  CONSTRAINT chk_status CHECK (status IN ('PENDING', 'ACTIVE', 'ENDED')),
  CONSTRAINT chk_not_self CHECK (teacher_id <> student_id)
);

CREATE INDEX idx_lesson_teacher ON lesson_relations(teacher_id);
CREATE INDEX idx_lesson_student ON lesson_relations(student_id);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| teacher_id | UUID | FK → users.id (is_teacher = TRUE인 사용자) |
| student_id | UUID | FK → users.id (MEMBER 모두 수강 가능) |
| status | VARCHAR(20) | PENDING / ACTIVE / ENDED |

---

---

### 4.5 `user_characters` — 캐릭터 커스터마이징 상태

> 사용자별 1:1. 연습 기반으로 레벨과 경험치가 올라가며, 장착 중인 아이템 ID를 저장한다.

```sql
CREATE TYPE character_type_enum AS ENUM (
  'HUMAN',   -- 사람형
  'ANIMAL',  -- 동물형
  'ROBOT'    -- 로봇형
);

CREATE TABLE user_characters (
  id                UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID                 NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  character_type    character_type_enum  NOT NULL DEFAULT 'HUMAN',
  level             INT                  NOT NULL DEFAULT 1,
  exp               INT                  NOT NULL DEFAULT 0,

  -- 장착 중인 아이템 (각 슬롯에 하나)
  equipped_hair     VARCHAR(50),         -- character_items.id
  equipped_outfit   VARCHAR(50),         -- character_items.id
  equipped_accessory VARCHAR(50),        -- character_items.id
  equipped_background VARCHAR(50),       -- character_items.id
  equipped_instrument INT REFERENCES instruments(id),  -- 캐릭터가 들고 있는 악기

  -- 기본 외형 옵션 (enum 없이 자유값으로 관리)
  skin_tone         VARCHAR(20)          NOT NULL DEFAULT 'default',
  hair_color        VARCHAR(20)          NOT NULL DEFAULT 'default',

  -- 확장 커스터마이징 (추후 신규 슬롯 대비)
  extras            JSONB                NOT NULL DEFAULT '{}',

  created_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| character_type | ENUM | HUMAN / ANIMAL / ROBOT |
| level | INT | 연습량 기반 캐릭터 레벨 (기본 1) |
| exp | INT | 경험치 — 연습 세션 완료 시 누적 |
| equipped_* | VARCHAR(50) | 각 슬롯에 장착된 `character_items.id` |
| equipped_instrument | INT | 캐릭터가 들고 있는 악기 FK |
| skin_tone / hair_color | VARCHAR | 색상 값 (hex 또는 명칭) |
| extras | JSONB | 미래 확장용 커스터마이징 데이터 |

---

### 4.6 `character_items` — 아이템 마스터

> 게임 내 해금 가능한 아이템 목록. 연습 조건 달성 시 `user_unlocked_items`에 추가된다.

```sql
CREATE TYPE item_type_enum AS ENUM (
  'HAIR',        -- 헤어 스타일
  'OUTFIT',      -- 의상
  'ACCESSORY',   -- 악세서리
  'BACKGROUND'   -- 배경 테마
);

CREATE TABLE character_items (
  id                VARCHAR(50)     PRIMARY KEY,   -- 예: 'outfit_rock_001', 'bg_concert_hall'
  item_type         item_type_enum  NOT NULL,
  name              VARCHAR(100)    NOT NULL,
  description       TEXT,
  thumbnail_url     TEXT,                          -- 아이템 미리보기 이미지
  unlock_condition  VARCHAR(200),                  -- 예: '7일 연속 연습', '레벨 5 달성'
  unlock_streak     INT,                           -- 스트리크 달성 조건 (일 수)
  unlock_level      INT,                           -- 레벨 달성 조건
  is_default        BOOLEAN         NOT NULL DEFAULT FALSE,
  is_premium        BOOLEAN         NOT NULL DEFAULT FALSE,  -- 유료 전용 아이템
  sort_order        INT             NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 기본 아이템 데이터
INSERT INTO character_items (id, item_type, name, is_default) VALUES
  ('hair_default',       'HAIR',       '기본 헤어',     TRUE),
  ('outfit_default',     'OUTFIT',     '기본 의상',     TRUE),
  ('bg_practice_room',   'BACKGROUND', '연습실',        TRUE),
  ('outfit_rock_001',    'OUTFIT',     '록 밴드 의상',  FALSE),
  ('bg_concert_hall',    'BACKGROUND', '콘서트홀',      FALSE);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | VARCHAR(50) | 아이템 고유 ID (슬러그 형태) |
| item_type | ENUM | HAIR / OUTFIT / ACCESSORY / BACKGROUND |
| unlock_condition | VARCHAR | 조건 텍스트 (UI 표시용) |
| unlock_streak | INT | 연속 연습 N일 조건 |
| unlock_level | INT | 캐릭터 레벨 N 달성 조건 |
| is_premium | BOOLEAN | TRUE면 PREMIUM 구독자 전용 |

---

### 4.7 `user_unlocked_items` — 유저 해금 아이템 (N:M)

> 사용자가 해금한 아이템 이력. BullMQ 잡이 연습 완료 이벤트 수신 후 조건 체크하여 INSERT한다.

```sql
CREATE TABLE user_unlocked_items (
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     VARCHAR(50)  NOT NULL REFERENCES character_items(id),
  unlocked_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX idx_unlocked_user ON user_unlocked_items(user_id);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | UUID | 사용자 FK |
| item_id | VARCHAR(50) | 해금된 아이템 FK |
| unlocked_at | TIMESTAMPTZ | 해금 시각 |

> **해금 플로우:** 연습 세션 완료 → Kafka 이벤트 발행 → BullMQ Consumer → 조건 체크 → `user_unlocked_items` INSERT → 알림 발송

---

### 4.9 `instruments` — 악기 마스터

```sql
CREATE TABLE instruments (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,
  category    VARCHAR(50),                             -- '현악기' | '건반' | '타악기' 등
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 기본 데이터
INSERT INTO instruments (name, category) VALUES
  ('기타',   '현악기'),
  ('베이스',  '현악기'),
  ('피아노',  '건반'),
  ('드럼',   '타악기'),
  ('바이올린','현악기'),
  ('보컬',   '보컬'),
  ('기타(직접입력)', NULL);
```

---

### 4.10 `songs` — 연습 곡

```sql
CREATE TABLE songs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  artist        VARCHAR(200),
  target_bpm    INT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_songs_user_id ON songs(user_id);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | UUID | 곡을 등록한 사용자 |
| title | VARCHAR(200) | 곡명 |
| artist | VARCHAR(200) | 아티스트명 (선택) |
| target_bpm | INT | 목표 BPM (선택) |

---

### 4.11 `practice_sessions` — 연습 세션 기록

> 핵심 테이블

```sql
CREATE TABLE practice_sessions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id          UUID         REFERENCES songs(id) ON DELETE SET NULL,
  instrument_id    INT          REFERENCES instruments(id),
  practiced_at     DATE         NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INT          NOT NULL CHECK (duration_minutes BETWEEN 1 AND 720),
  bpm              INT          CHECK (bpm > 0),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_practice_user_id      ON practice_sessions(user_id);
CREATE INDEX idx_practice_practiced_at ON practice_sessions(practiced_at DESC);
CREATE INDEX idx_practice_user_date    ON practice_sessions(user_id, practiced_at DESC);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | UUID | 연습한 사용자 |
| song_id | UUID | 연습한 곡 (선택) |
| instrument_id | INT | 사용 악기 |
| practiced_at | DATE | 연습 날짜 |
| duration_minutes | INT | 연습 시간 (분), 1~720 |
| bpm | INT | 이 세션의 BPM (선택) |

---

### 4.12 `practice_session_types` — 연습 유형 (N:M)

```sql
CREATE TYPE practice_type_enum AS ENUM (
  'BASIC',          -- 기초 연습
  'SONG',           -- 곡 연습
  'IMPROVISATION',  -- 즉흥 연주
  'THEORY'          -- 이론 학습
);

CREATE TABLE practice_session_types (
  session_id    UUID                PRIMARY KEY REFERENCES practice_sessions(id) ON DELETE CASCADE,
  practice_type practice_type_enum  NOT NULL
);

-- 복합 PK로 중복 방지
ALTER TABLE practice_session_types
  DROP CONSTRAINT practice_session_types_pkey,
  ADD PRIMARY KEY (session_id, practice_type);
```

---

### 4.13 `memos` — 연습 메모

```sql
CREATE TABLE memos (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id    UUID         REFERENCES practice_sessions(id) ON DELETE SET NULL,
  content       TEXT         NOT NULL CHECK (char_length(content) <= 1000),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memos_user_id    ON memos(user_id);
CREATE INDEX idx_memos_session_id ON memos(session_id);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| session_id | UUID | 연결된 연습 세션 (NULL 가능 — 독립 메모) |
| content | TEXT | 메모 내용, 최대 1,000자 |

---

### 4.14 `bpm_records` — BPM 시계열 기록 (TimescaleDB hypertable)

```sql
CREATE TABLE bpm_records (
  id            UUID         NOT NULL DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id       UUID         NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  session_id    UUID         REFERENCES practice_sessions(id) ON DELETE SET NULL,
  bpm           INT          NOT NULL CHECK (bpm > 0),
  recorded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- TimescaleDB hypertable 변환 (시간 기준 파티셔닝)
SELECT create_hypertable('bpm_records', 'recorded_at');

-- 인덱스
CREATE INDEX idx_bpm_user_song ON bpm_records(user_id, song_id, recorded_at DESC);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| song_id | UUID | 어떤 곡의 BPM인지 |
| session_id | UUID | 연결된 연습 세션 |
| bpm | INT | 기록된 BPM |
| recorded_at | TIMESTAMPTZ | **TimescaleDB 파티션 기준 컬럼** |

> ⚠️ **hypertable**이므로 PK 대신 `(user_id, song_id, recorded_at)`을 복합 인덱스로 관리

---

### 4.15 `streaks` — 스트리크

```sql
CREATE TABLE streaks (
  user_id            UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak     INT          NOT NULL DEFAULT 0,
  longest_streak     INT          NOT NULL DEFAULT 0,
  last_practiced_at  DATE,
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| current_streak | INT | 현재 연속 연습 일수 |
| longest_streak | INT | 역대 최장 연속 일수 |
| last_practiced_at | DATE | 마지막 연습 날짜 (스트리크 계산 기준) |

> Redis에 캐싱 후 응답, 비동기로 DB 업데이트

---

### 4.16 `reports` — 리포트

```sql
CREATE TABLE reports (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_type     VARCHAR(20)  NOT NULL,
  period_start    DATE         NOT NULL,
  period_end      DATE         NOT NULL,
  data            JSONB        NOT NULL DEFAULT '{}',
  generated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_report UNIQUE (user_id, report_type, period_start),
  CONSTRAINT chk_report_type CHECK (report_type IN ('WEEKLY', 'MONTHLY'))
);

CREATE INDEX idx_reports_user_id ON reports(user_id, report_type, period_start DESC);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| report_type | VARCHAR(20) | WEEKLY / MONTHLY |
| period_start | DATE | 리포트 기간 시작일 |
| period_end | DATE | 리포트 기간 종료일 |
| data | JSONB | 집계된 통계 데이터 전체 |

> BullMQ 잡이 생성하며, `data` 컬럼에 총 연습 시간·BPM 향상·곡별 통계 등 저장

---

### 4.17 `notification_settings` — 알림 설정

```sql
CREATE TABLE notification_settings (
  user_id                 UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reminder_enabled        BOOLEAN      NOT NULL DEFAULT FALSE,
  reminder_time           TIME,                                -- 리마인더 시각 (예: '20:00')
  streak_alert_enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
  goal_alert_enabled      BOOLEAN      NOT NULL DEFAULT TRUE,
  report_alert_enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

## 5. 테이블 관계 요약 (ERD)

```
users (1)
  ├──(1:1)── user_profiles
  ├──(1:1)── subscriptions
  ├──(1:1)── streaks
  ├──(1:1)── notification_settings
  ├──(1:1)── user_characters ──(N:M)── character_items (user_unlocked_items)
  ├──(1:N)── songs
  ├──(1:N)── practice_sessions
  │             ├──(1:N)── practice_session_types
  │             ├──(0:1)── memos
  │             └──(1:N)── bpm_records
  ├──(1:N)── memos
  ├──(1:N)── bpm_records
  ├──(1:N)── reports
  └──(N:M)── users (lesson_relations: teacher ↔ student)

instruments (1)
  ├──(1:N)── practice_sessions
  └──(1:N)── user_characters (equipped_instrument)

character_items (1)
  └──(N:M)── users (user_unlocked_items)
```

---

## 6. TimescaleDB 적용 전략

`bpm_records` 테이블만 hypertable로 관리한다.

```sql
-- 청크 간격: 1개월 단위
SELECT set_chunk_time_interval('bpm_records', INTERVAL '1 month');

-- 압축 정책: 3개월 이상 지난 데이터 자동 압축
ALTER TABLE bpm_records SET (
  timescaledb.compress,
  timescaledb.compress_orderby = 'recorded_at DESC'
);
SELECT add_compression_policy('bpm_records', INTERVAL '3 months');

-- 집계 예시: 곡별 주간 평균 BPM
SELECT
  song_id,
  time_bucket('1 week', recorded_at) AS week,
  AVG(bpm)::INT                       AS avg_bpm,
  MAX(bpm)                            AS max_bpm
FROM bpm_records
WHERE user_id = $1
GROUP BY song_id, week
ORDER BY week DESC;
```

---

### 4.18 `audit_logs` — 감사 로그

```sql
CREATE TYPE "AuditAction" AS ENUM (
  'LOGIN_SUCCESS', 'LOGIN_FAIL',
  'PRACTICE_CREATE', 'PRACTICE_DELETE',
  'PROFILE_UPDATE', 'ADMIN_USER_STATUS_CHANGE'
);

CREATE TABLE audit_logs (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
  action      "AuditAction" NOT NULL,
  meta        JSONB         NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action     ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | UUID? | 행위 주체 (탈퇴 시 NULL) |
| action | AuditAction | 이벤트 종류 |
| meta | JSONB | 부가 정보 (reason, sessionId 등) |

> 서버 측에서만 기록. 별도 API 없음. 실패해도 메인 플로우 영향 없음 (fire-and-forget).

---

## 7. 인덱스 전략 요약

| 테이블 | 인덱스 | 목적 |
|--------|--------|------|
| users | email | 로그인 조회 |
| practice_sessions | (user_id, practiced_at DESC) | 사용자별 최신 기록 조회 |
| bpm_records | (user_id, song_id, recorded_at DESC) | 곡별 BPM 히스토리 조회 |
| reports | (user_id, report_type, period_start DESC) | 리포트 목록 조회 |
| lesson_relations | teacher_id, student_id | 레슨 관계 조회 |

---

## 8. 커뮤니티 도메인 (Phase 2 추가, v1.3)

### user_profiles 변경사항

| 컬럼 추가 | 타입 | 설명 |
|-----------|------|------|
| `handle` | VARCHAR(30) UNIQUE | @handle (가입 시 자동 생성, 1회 변경 가능) |
| `bio` | VARCHAR(150)? | 자기소개 |
| `nicknameChangedAt` | TIMESTAMPTZ? | 닉네임 마지막 변경 시각 (월 1회 제한) |

---

### friend_requests

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (UUID) | PK |
| fromUserId | TEXT | FK → users.id |
| toUserId | TEXT | FK → users.id |
| status | FriendRequestStatus | PENDING / ACCEPTED / REJECTED |
| createdAt | TIMESTAMPTZ | 요청 시각 |
| updatedAt | TIMESTAMPTZ | 상태 변경 시각 |

**인덱스:** (toUserId, status), (fromUserId, status)

---

### friends

| 컬럼 | 타입 | 설명 |
|------|------|------|
| userId | TEXT | FK → users.id |
| friendId | TEXT | FK → users.id |
| createdAt | TIMESTAMPTZ | 친구 맺은 시각 |

**PK:** (userId, friendId)  
**설계 원칙:** 수락 시 (A→B), (B→A) 2행 삽입 → 단순 `userId` 조건 쿼리 가능

---

### rooms

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (UUID) | PK |
| name | VARCHAR(20) | 방 이름 |
| description | VARCHAR(100)? | 방 설명 |
| hostId | TEXT | FK → users.id |
| inviteCode | CHAR(6) UNIQUE | 초대코드 (대문자+숫자) |
| isActive | BOOLEAN | 활성 여부 |
| createdAt | TIMESTAMPTZ | 생성 시각 |
| updatedAt | TIMESTAMPTZ | 수정 시각 |

**인덱스:** inviteCode (UNIQUE), hostId

---

### room_members

| 컬럼 | 타입 | 설명 |
|------|------|------|
| roomId | TEXT | FK → rooms.id |
| userId | TEXT | FK → users.id |
| role | RoomMemberRole | HOST / MEMBER |
| joinedAt | TIMESTAMPTZ | 입장 시각 |

**PK:** (roomId, userId)

---

### room_join_requests

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (UUID) | PK |
| roomId | TEXT | FK → rooms.id |
| userId | TEXT | FK → users.id |
| status | RoomJoinRequestStatus | PENDING / ACCEPTED / REJECTED |
| createdAt | TIMESTAMPTZ | 요청 시각 |
| updatedAt | TIMESTAMPTZ | 상태 변경 시각 |

**인덱스:** (roomId, status), (userId, status)

---

### 커뮤니티 도메인 인덱스 추가

| 테이블 | 인덱스 | 목적 |
|--------|--------|------|
| user_profiles | handle (UNIQUE) | @handle 검색 |
| user_profiles | nickname (GIN/LIKE) | 닉네임 검색 |
| friends | userId | 내 친구 목록 조회 |
| room_join_requests | (roomId, status) | 방장 수락 대기 목록 |
| rooms | inviteCode (UNIQUE) | 초대코드 입장 |

---

---

## 9. AI 평가 도메인 (Phase 3, v1.4)

> **확정 사항:** 2026-06-11 개발팀 설계
> Gemini API 기반 자연어 피드백 + Basic Pitch/Librosa 객관 지표 조합
> 프리미엄 전용 기능으로 제공 예정

---

### 9.1 도메인 구조 개요

```
practice_sessions (1)
    └──(1:N)── practice_recordings     ← 녹음 파일 메타데이터
                    └──(1:1)── ai_analysis_jobs      ← 비동기 분석 작업
                                    └──(1:1)── ai_analysis_results  ← 분석 결과
```

---

### 9.2 음원 파일 처리 방식 (Presigned URL 패턴)

서버 경유 업로드 대신 **S3 Presigned URL** 방식을 사용한다. 대용량 파일이 API 서버 메모리를 점유하지 않고, 클라이언트가 S3에 직접 업로드한다.

```
[클라이언트]                    [API 서버]                [S3]              [BullMQ Worker]
     │                              │                      │                      │
     │ POST /recordings/presign     │                      │                      │
     │─────────────────────────────>│                      │                      │
     │                              │ Presigned PUT URL 발급│                      │
     │<─────────────────────────────│                      │                      │
     │                              │                      │                      │
     │ PUT (파일 직접 업로드)         │                      │                      │
     │────────────────────────────────────────────────────>│                      │
     │                              │                      │ 업로드 완료           │
     │ POST /recordings/{id}/complete│                      │                      │
     │─────────────────────────────>│                      │                      │
     │                              │ practice_recordings 생성                    │
     │                              │ BullMQ 잡 등록 ──────────────────────────>│
     │                              │                      │                      │
     │                              │                      │ 1. Basic Pitch/Librosa 분석
     │                              │                      │ 2. Gemini API 피드백 생성
     │                              │                      │ ai_analysis_results 저장
     │ GET /recordings/{id}/result  │                      │                      │
     │─────────────────────────────>│                      │                      │
     │<─────────────────────────────│                      │                      │
```

**파일 저장 정책**

| 항목 | 내용 |
|------|------|
| 저장소 | AWS S3 (또는 GCS / Cloudflare R2) |
| 경로 규칙 | `recordings/{userId}/{uuid}.{ext}` |
| 허용 포맷 | audio/webm, audio/mp4, audio/wav, audio/ogg |
| 최대 크기 | 50MB (약 5분 분량 기준) |
| 원본 보존 기간 | **30일** 후 S3 자동 삭제 (Lifecycle 정책) |
| 분석 결과 보존 | **영구** (DB에 텍스트로 저장) |
| 상태 변경 | 삭제 시 `status = EXPIRED` 로 업데이트 |

---

### 9.3 테이블 상세 명세

#### `practice_recordings` — 녹음 파일 메타데이터

```sql
CREATE TABLE practice_recordings (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id       UUID          REFERENCES practice_sessions(id) ON DELETE SET NULL,

  storage_key      TEXT          NOT NULL,          -- S3 object key
  file_size_bytes  INT           NOT NULL,
  duration_seconds INT           NOT NULL,
  mime_type        VARCHAR(50)   NOT NULL,

  status           VARCHAR(20)   NOT NULL DEFAULT 'UPLOADED',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_recording_status CHECK (
    status IN ('UPLOADED', 'PROCESSING', 'ANALYZED', 'FAILED', 'EXPIRED')
  )
);

CREATE INDEX idx_recordings_user ON practice_recordings(user_id, created_at DESC);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| storage_key | TEXT | S3 object key (`recordings/{userId}/{uuid}.webm`) |
| file_size_bytes | INT | 업로드 파일 크기 (bytes) |
| duration_seconds | INT | 녹음 길이 (초) |
| mime_type | VARCHAR(50) | audio/webm 등 |
| status | VARCHAR(20) | UPLOADED → PROCESSING → ANALYZED / FAILED / EXPIRED |

---

#### `ai_analysis_jobs` — 비동기 분석 작업 추적

```sql
CREATE TABLE ai_analysis_jobs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id  UUID         NOT NULL UNIQUE REFERENCES practice_recordings(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  provider      VARCHAR(20)  NOT NULL DEFAULT 'GEMINI',
  model         VARCHAR(100) NOT NULL,               -- "gemini-2.0-flash" 등

  status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  retry_count   INT          NOT NULL DEFAULT 0,

  -- 비용 추적 (프리미엄 월별 사용량 제한)
  tokens_used   INT,
  audio_seconds INT,

  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_provider CHECK (provider IN ('GEMINI', 'OPENAI', 'LOCAL')),
  CONSTRAINT chk_job_status CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

CREATE INDEX idx_jobs_user     ON ai_analysis_jobs(user_id, created_at DESC);
CREATE INDEX idx_jobs_pending  ON ai_analysis_jobs(status, created_at)
  WHERE status = 'PENDING';                           -- Worker 조회 최적화
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| provider | VARCHAR(20) | GEMINI / OPENAI / LOCAL |
| model | VARCHAR(100) | 실제 사용 모델명 (버전 추적용) |
| retry_count | INT | 실패 후 재시도 횟수 (최대 3회) |
| tokens_used | INT | 소모 토큰 수 (월별 제한 계산) |
| audio_seconds | INT | 실제 분석된 오디오 길이 |

> **설계 의도:** `provider` + `model` 컬럼으로 나중에 Gemini → GPT-4o 교체 또는 A/B 테스트 시 이력 추적 가능

---

#### `ai_analysis_results` — 분석 결과

```sql
CREATE TABLE ai_analysis_results (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID          NOT NULL UNIQUE REFERENCES ai_analysis_jobs(id) ON DELETE CASCADE,
  user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID          REFERENCES practice_sessions(id) ON DELETE SET NULL,

  -- Gemini 자연어 피드백
  feedback   TEXT          NOT NULL,
  language   VARCHAR(10)   NOT NULL DEFAULT 'ko',

  -- 객관 지표 (Basic Pitch + Librosa) — JSONB 확장 구조
  -- 악기별로 다른 지표를 추가할 수 있도록 JSONB 사용
  metrics    JSONB         NOT NULL DEFAULT '{}',

  -- 종합 점수 (향후 게임화/캐릭터 경험치 연동 대비)
  score      INT,                                    -- 0-100, 현재 선택

  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_results_user ON ai_analysis_results(user_id, created_at DESC);
```

**`metrics` JSONB 구조 (예시)**
```json
{
  "bpmConsistency":       87,    // BPM 일관성 0-100 (Librosa)
  "noteDensityPerMin":    42,    // 분당 음 수 (Basic Pitch)
  "continuousPlaySec":   252,    // 최장 연속 연주 (초)
  "rhythmAccuracy":       91,    // 박자 정확도 0-100 (Librosa onset)
  "tempoStability":       83,    // 템포 안정성 0-100
  "pitchAccuracy":      null     // 단선율 악기만 측정, 코드 악기는 null
}
```

> **확장 원칙:** 새 악기/분석 기능 추가 시 `metrics` JSON 키만 추가하면 됨. 스키마 마이그레이션 불필요.

---

### 9.4 상태 머신

```
[RecordingStatus]              [JobStatus]
UPLOADED ──────> PROCESSING    PENDING ──────> PROCESSING
                 │                              │
          ┌──────┴──────┐              ┌────────┴────────┐
       ANALYZED       FAILED        COMPLETED          FAILED
          │                                           (retry_count < 3 → PENDING)
       EXPIRED
    (30일 후 S3 삭제)
```

---

### 9.5 월별 사용량 제한 쿼리 (프리미엄 기능)

```sql
-- 이번 달 사용자의 AI 분석 횟수 및 총 오디오 길이
SELECT
  COUNT(*)              AS job_count,
  SUM(audio_seconds)    AS total_audio_seconds,
  SUM(tokens_used)      AS total_tokens
FROM ai_analysis_jobs
WHERE user_id = $1
  AND status  = 'COMPLETED'
  AND created_at >= DATE_TRUNC('month', NOW());
```

> **프리미엄 제한 기준 (기획팀 결정 필요):**
> 현재 제안: 월 20회 또는 총 60분 중 먼저 도달하는 기준 적용

---

## 10. 추후 확장 고려 테이블

| 테이블명 | 설명 | Phase |
|---------|------|-------|
| `lesson_feedbacks` | 선생님이 학생 기록에 남기는 피드백 | Phase 3 |
| `ai_recommendations` | AI 맞춤 루틴 추천 결과 (분석 이력 기반) | Phase 4 |
| `recording_segments` | 긴 녹음을 구간별로 분리 분석할 때 | Phase 4 |
