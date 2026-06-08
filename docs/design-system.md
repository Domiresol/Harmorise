# 디자인 시스템

> **프로젝트:** Harmorise
> **작성팀:** 디자인팀
> **버전:** v1.0
> **작성일:** 2026년 5월 23일

---

## 1. 디자인 원칙

| 원칙 | 설명 |
|------|------|
| **단순하고 빠르게** | 연습 기록은 3탭 이내에 완료되어야 한다. 복잡한 UI는 습관 형성을 방해한다. |
| **성장이 보이게** | 숫자와 그래프로 성장을 직관적으로 체감할 수 있도록 시각화를 중심에 둔다. |
| **적당히 게임 같게** | 캐릭터, 스트리크, 해금 시스템으로 동기부여를 강화하되 과하지 않게 유지한다. |
| **모바일 최우선** | 터치 타깃 최소 44px, 한 손 조작 가능한 레이아웃 기준으로 설계한다. |

---

## 2. 지원 화면 규격

| 구분 | 해상도 기준 | 레이아웃 |
|------|------------|---------|
| 모바일 세로 | ~ 767px | 단일 컬럼, 하단 탭 네비게이션 |
| 태블릿 가로 | 768px ~ | 2컬럼 구조, 사이드 네비게이션 고려 |

> 데스크탑은 공식 지원하지 않는다. (768px 이상은 태블릿 가로 뷰로 최적화)

---

## 3. 컬러 시스템

### 3.1 브랜드 컬러

시원하고 청량한 **스카이 블루 + 소프트 틸** 파스텔 조합을 기본으로 한다.

| 토큰명 | Hex | 미리보기 | 용도 |
|--------|-----|---------|------|
| `--color-primary` | `#0EA5E9` | 🔵 Sky-500 | 주요 버튼, 활성 상태, 강조 |
| `--color-primary-light` | `#7DD3FC` | 🩵 Sky-300 | 호버 상태, 선택 배경 |
| `--color-primary-pale` | `#E0F2FE` | ⬜ Sky-100 | 카드 강조 배경, 뱃지 배경 |
| `--color-primary-dark` | `#0284C7` | 🔵 Sky-600 | 프레스 상태 |
| `--color-accent` | `#2DD4BF` | 🩵 Teal-400 | 스트리크, 해금 이벤트, 포인트 |
| `--color-accent-light` | `#CCFBF1` | ⬜ Teal-100 | 스트리크 배경, 캐릭터 레벨업 배경 |

### 3.2 시멘틱 컬러

| 토큰명 | Hex | 용도 |
|--------|-----|------|
| `--color-success` | `#10B981` | 목표 달성, 저장 완료 |
| `--color-warning` | `#F59E0B` | 스트리크 위기 알림 |
| `--color-error` | `#EF4444` | 오류, 삭제 확인 |
| `--color-info` | `#38BDF8` | 안내 메시지, 팁 (sky-400) |

### 3.3 그레이 스케일

| 토큰명 | Hex | 용도 |
|--------|-----|------|
| `--color-gray-50` | `#F0F9FF` | 페이지 배경 (sky 계열 tinted) |
| `--color-gray-100` | `#F1F5F9` | 카드 배경, 입력 필드 배경 |
| `--color-gray-200` | `#E2E8F0` | 구분선, 비활성 테두리 |
| `--color-gray-400` | `#94A3B8` | 플레이스홀더, 보조 텍스트 |
| `--color-gray-600` | `#475569` | 보조 텍스트, 캡션 |
| `--color-gray-800` | `#1E293B` | 본문 텍스트 |
| `--color-gray-900` | `#0F172A` | 제목, 강조 텍스트 |

### 3.4 다크모드 (Phase 2 대비)

다크모드는 Phase 2에서 대응한다. 현재는 라이트모드 단일 구현. CSS 변수 구조는 다크모드 전환을 고려하여 `--color-*` 토큰 기반으로 유지한다.

### 3.5 히트맵 컬러 (캘린더)

| 레벨 | 색상 | 기준 |
|------|------|------|
| 0 (없음) | `#E2E8F0` | 연습 없음 |
| 1 (낮음) | `#BAE6FD` | ~29분 (sky-200) |
| 2 (보통) | `#38BDF8` | 30~59분 (sky-400) |
| 3 (높음) | `#0EA5E9` | 60분 이상 (sky-500) |

---

## 4. 타이포그래피

**기본 폰트:** Pretendard (한글), Inter (영문/숫자)

```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
```

### 타입 스케일

| 토큰명 | 크기 | 굵기 | 용도 |
|--------|------|------|------|
| `--text-xs` | 11px | 400 | 캡션, 태그 |
| `--text-sm` | 13px | 400 | 보조 텍스트, 라벨 |
| `--text-base` | 15px | 400 | 본문 |
| `--text-md` | 17px | 500 | 카드 제목, 강조 본문 |
| `--text-lg` | 20px | 600 | 섹션 제목 |
| `--text-xl` | 24px | 700 | 페이지 제목, 주요 수치 |
| `--text-2xl` | 32px | 700 | 대시보드 핵심 수치 (스트리크, 시간) |

### 숫자 표시 원칙

- 스트리크, BPM, 연습 시간 등 핵심 수치는 `--text-2xl` + `--color-primary`
- 단위 텍스트 (일, 분, BPM)는 `--text-sm` + `--color-gray-600`

---

## 5. 간격 시스템 (Spacing)

4px 단위 기반 (Tailwind CSS 기본 스케일 활용)

| 토큰 | 값 | 주요 용도 |
|------|----|---------|
| `space-1` | 4px | 아이콘-텍스트 간격 |
| `space-2` | 8px | 인라인 요소 내부 패딩 |
| `space-3` | 12px | 소형 컴포넌트 패딩 |
| `space-4` | 16px | 카드 내부 패딩, 기본 간격 |
| `space-5` | 20px | 섹션 간 마진 |
| `space-6` | 24px | 카드 간격, 리스트 간격 |
| `space-8` | 32px | 페이지 섹션 간격 |
| `space-16` | 64px | 하단 탭 바 높이 여백 |

---

## 6. 컴포넌트 명세

### 6.1 버튼

| 종류 | 배경 | 텍스트 | 용도 |
|------|------|--------|------|
| Primary | `--color-primary` | white | 주요 CTA (저장, 완료) |
| Secondary | white | `--color-primary` | 보조 액션 (취소, 이전) |
| Danger | `--color-error` | white | 삭제, 탈퇴 |
| Ghost | transparent | `--color-gray-600` | 덜 중요한 액션 |

**공통 규격**
- 높이: 48px (모바일 기본), 44px (소형)
- 모서리: `border-radius: 12px`
- 비활성: opacity 40%
- 전체 너비 버튼: 하단 CTA는 `width: 100%`

---

### 6.2 카드

```
┌─────────────────────────────┐
│  [아이콘/이미지]  제목        │  ← 16px padding
│                 보조 텍스트  │
│  ─────────────────────────  │
│  내용 영역                   │
└─────────────────────────────┘
```

**규격**
- 배경: white
- 테두리: none (그림자로 구분)
- Shadow: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`
- 모서리: `border-radius: 16px`
- 내부 패딩: 16px

---

### 6.3 하단 탭 바

```
┌──────────────────────────────────┐
│  🏠    📝   [●FAB]   📅    ⚙️    │
│  홈   연습  기록하기  캘린더  설정 │
└──────────────────────────────────┘
```

**규격**
- 높이: 60px + Safe Area (iOS 하단 노치 대응)
- 배경: white
- 상단 구분선: `1px solid --color-gray-200`
- 활성 탭: `--color-primary` 아이콘 + 텍스트
- 비활성 탭: `--color-gray-400`
- FAB 버튼: 지름 56px, `--color-primary` 배경, 중앙 돌출

---

### 6.4 입력 필드

**기본 상태**
- 배경: `--color-gray-100`
- 테두리: `1px solid transparent`
- 모서리: `border-radius: 12px`
- 높이: 48px (단행), auto (다행)
- 패딩: `12px 16px`

**포커스 상태**
- 배경: white
- 테두리: `1px solid --color-primary`

**에러 상태**
- 테두리: `1px solid --color-error`
- 에러 메시지: `--text-xs` + `--color-error` (필드 하단)

---

### 6.5 슬라이더 (연습 시간 / 목표 설정)

- 트랙 색: `--color-gray-200`
- 채워진 트랙: `--color-primary`
- 썸: 지름 24px, white + `--color-primary` 테두리
- 현재 값: 슬라이더 상단 중앙에 툴팁 형태 표시

---

### 6.6 뱃지 / 태그

| 종류 | 배경 | 텍스트 | 용도 |
|------|------|--------|------|
| 스트리크 | `--color-accent` | white | 🔥 N일 |
| 연습 유형 | `--color-primary-light` 10% | `--color-primary` | BASIC, SONG 등 |
| 잠금 해제 | `--color-success` 10% | `--color-success` | NEW 아이템 |
| 프리미엄 | `#F59E0B` 10% | `#B45309` | PREMIUM 전용 |

**규격**
- 높이: 22px
- 패딩: `2px 8px`
- 모서리: `border-radius: 99px` (pill)
- 폰트: `--text-xs` 600

---

### 6.7 차트 스타일

**라인 차트 (BPM 성장)**
- 라인 색: `--color-primary`
- 데이터 포인트: 지름 6px, `--color-primary`
- 목표 BPM 라인: `--color-accent` 점선 (`stroke-dasharray: 4 4`)
- 그리드 라인: `--color-gray-200`
- 배경: white

**도넛 차트 (악기/유형 비율)**
- 색상: 최대 6개 팔레트
  - `#7C3AED` `#10B981` `#F59E0B` `#3B82F6` `#EC4899` `#6366F1`
- 두께: 전체 지름의 30%
- 중앙: 주요 수치 + 단위

**바 차트 (주간/요일 패턴)**
- 바 색: `--color-primary`
- 배경 바: `--color-gray-100`
- 모서리: `border-radius: 4px`

---

### 6.8 캐릭터 영역

**홈 화면 캐릭터**
- 크기: 80px × 80px (원형 클리핑)
- 배경: `--color-primary-light` 20% 원형
- 레벨 뱃지: 우측 하단 오버레이 (`Lv.N`)

**설정 프로필 캐릭터 미리보기**
- 크기: 160px × 160px
- 배경: 선택된 배경 아이템 렌더링
- 실시간 업데이트: 슬롯 변경 즉시 반영

**아이템 그리드**
- 열 수: 4열 (모바일), 6열 (태블릿)
- 아이템 카드: 정사각형, 모서리 12px
- 잠금 상태: 배경 dimmed (opacity 50%) + 자물쇠 아이콘 중앙
- 해금 조건: 아이템 하단 `--text-xs` 텍스트

---

## 7. 아이콘 시스템

**사용 라이브러리:** Lucide React

주요 아이콘 매핑:

| 기능 | 아이콘 |
|------|--------|
| 홈 | `Home` |
| 연습 기록 | `Music` |
| 캘린더 | `Calendar` |
| 리포트 | `BarChart2` |
| 설정 | `Settings` |
| BPM / 메트로놈 | `Activity` |
| 메모 | `FileText` |
| 스트리크 | `Flame` |
| 잠금 | `Lock` |
| 해금 | `Unlock` |
| 추가 (FAB) | `Plus` |
| 삭제 | `Trash2` |
| 수정 | `Pencil` |
| 목표 달성 | `Trophy` |

**규격**
- 탭 바 아이콘: 24px
- 카드 내 아이콘: 20px
- 인라인 아이콘: 16px
- 색상: 텍스트 색과 동일하게 상속

---

## 8. 모션 / 인터랙션

| 상황 | 애니메이션 | 값 |
|------|-----------|-----|
| 화면 전환 | slide-up | 200ms ease-out |
| 카드 탭 | scale down | 0.97, 100ms |
| FAB 탭 | scale + ripple | 150ms |
| 스트리크 업 | bounce + glow | 400ms |
| 아이템 해금 | scale-in + shimmer | 500ms |
| Bottom Sheet 열림 | slide-up | 250ms ease-out |
| 로딩 상태 | skeleton shimmer | 1.2s infinite |

---

## 9. 빈 상태 (Empty State)

연습 기록이 없거나 리포트가 없을 때 일관된 빈 상태 UI를 사용한다.

**구성 요소**
- 캐릭터 일러스트 (의아한 표정) 또는 심플 아이콘
- 제목 텍스트 (`--text-md` Bold)
- 안내 문구 (`--text-sm`, `--color-gray-400`)
- CTA 버튼 (첫 기록 유도)

**예시**
- 연습 기록 없음: "아직 연습 기록이 없어요! 첫 연습을 기록해볼까요?"
- 리포트 없음: "이번 주 데이터를 모으는 중이에요. 조금만 기다려주세요!"
- BPM 곡 없음: "연습 기록 시 BPM을 입력하면 성장 그래프가 생겨요!"

---

## 10. Tailwind CSS 설정 가이드

`tailwind.config.js`에 디자인 토큰을 확장하여 사용한다.

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0EA5E9',
          light:   '#7DD3FC',
          pale:    '#E0F2FE',
          dark:    '#0284C7',
        },
        accent: {
          DEFAULT: '#2DD4BF',
          light:   '#CCFBF1',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        btn:  '12px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      },
    },
  },
}
```
