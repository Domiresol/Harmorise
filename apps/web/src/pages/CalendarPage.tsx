import { useState, useEffect } from 'react';
import { PageLayout } from '../components/ui/PageLayout';
import { Card, CardDivider } from '../components/ui/Card';
import { StreakBadge } from '../components/ui/Badge';
import { apiFetch } from '../lib/api';

// ── 타입 ─────────────────────────────────────────────────────
type DayLevel = 'perfect' | 'great' | 'good' | 'none';

interface DayStat {
  totalMinutes: number;
  level: DayLevel;
  sessions: {
    id: string;
    songTitle: string | null;
    instrumentName: string | null;
    durationMinutes: number;
    bpm: number | null;
  }[];
}

interface MonthlyStatsResponse {
  year: number;
  month: number;
  dailyGoalMinutes: number;
  days: Record<string, DayStat>;
  summary: {
    practicedDays: number;
    totalMinutes: number;
    perfectDays: number;
    greatDays: number;
    goodDays: number;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
  };
}

// ── 디자인 토큰 (디자인팀) ────────────────────────────────────
const LEVEL_CONFIG: Record<
  DayLevel,
  { bg: string; label: string; emoji: string }
> = {
  perfect: { bg: 'bg-primary', label: 'Perfect', emoji: '🔥' },
  great: { bg: 'bg-sky-400', label: 'Great', emoji: '⭐' },
  good: { bg: 'bg-sky-200', label: 'Good', emoji: '✅' },
  none: { bg: 'bg-slate-100', label: '', emoji: '' },
};

// ── 유틸 ──────────────────────────────────────────────────────
const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

function formatKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatMinutes(min: number) {
  if (min === 0) return '0분';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}시간 ${m > 0 ? `${m}분` : ''}`.trim() : `${m}분`;
}

// ── 컴포넌트 ──────────────────────────────────────────────────
export function CalendarPage() {
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selected, setSelected] = useState<string | null>(
    formatKey(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const [stats, setStats] = useState<MonthlyStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API 호출 — 월 변경마다 재호출
  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<MonthlyStatsResponse>(
      `/practice/stats/monthly?year=${year}&month=${month + 1}`,
    )
      .then((data) => setStats(data))
      .catch(() => setError('데이터를 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, [year, month]);

  const cells = buildCalendar(year, month);

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
    setSelected(null);
  };

  const days = stats?.days ?? {};
  const summary = stats?.summary;
  const streak = stats?.streak;
  const dailyGoalMinutes = stats?.dailyGoalMinutes ?? 30;

  const selectedDay = selected ? days[selected] : null;
  const selectedSessions = selectedDay?.sessions ?? [];

  return (
    <PageLayout title="연습 캘린더" hasTabBar>
      {/* ── 스트리크 카드 ─────────────────────────────────── */}
      <Card highlighted className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">연속 연습일자</p>
          <StreakBadge count={streak?.currentStreak ?? 0} />
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">최장 기록</p>
          <p className="text-sm font-bold text-slate-700">
            🏆 {streak?.longestStreak ?? 0}일
          </p>
        </div>
      </Card>

      {/* ── 달력 카드 ─────────────────────────────────────── */}
      <Card className="mb-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-1 text-slate-500 active:opacity-60"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <p className="text-md font-bold text-slate-900">
            {year}년 {month + 1}월
          </p>
          <button
            onClick={nextMonth}
            className="p-1 text-slate-500 active:opacity-60"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_KR.map((d, i) => (
            <p
              key={d}
              className={`text-center text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}
            >
              {d}
            </p>
          ))}
        </div>

        {/* 날짜 그리드 */}
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm text-slate-400">불러오는 중…</p>
          </div>
        ) : error ? (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const key = formatKey(year, month, day);
              const level = (days[key]?.level ?? 'none') as DayLevel;
              const isToday =
                key ===
                formatKey(
                  today.getFullYear(),
                  today.getMonth(),
                  today.getDate(),
                );
              const isSel = key === selected;

              return (
                <button
                  key={key}
                  onClick={() => setSelected(isSel ? null : key)}
                  className="flex flex-col items-center gap-0.5 py-0.5"
                >
                  <span
                    className={[
                      'text-xs w-7 h-7 flex items-center justify-center rounded-full font-medium transition-all',
                      isSel
                        ? 'bg-primary text-white'
                        : isToday
                          ? 'ring-2 ring-primary text-primary'
                          : 'text-slate-700',
                    ].join(' ')}
                  >
                    {day}
                  </span>
                  {/* 달성 레벨 도트 */}
                  <span
                    className={`w-4 h-1.5 rounded-full ${LEVEL_CONFIG[level].bg}`}
                  />
                </button>
              );
            })}
          </div>
        )}

        <CardDivider />

        {/* 범례 */}
        <div className="flex items-center gap-3 justify-center flex-wrap">
          {(['perfect', 'great', 'good', 'none'] as DayLevel[]).map((l) => (
            <div key={l} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-full ${LEVEL_CONFIG[l].bg}`} />
              <span className="text-xs text-slate-500">
                {l === 'none' ? '없음' : LEVEL_CONFIG[l].label}
              </span>
            </div>
          ))}
        </div>

        {/* 목표 안내 */}
        <p className="text-xs text-slate-400 text-center mt-2">
          Perfect = 일일 목표 {dailyGoalMinutes}분 달성
        </p>
      </Card>

      {/* ── 선택된 날 상세 ───────────────────────────────── */}
      {selected && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-semibold text-slate-700">
              {parseInt(selected.split('-')[1])}월{' '}
              {parseInt(selected.split('-')[2])}일 기록
            </p>
            {selectedDay && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${LEVEL_CONFIG[selectedDay.level].bg}`}
              >
                {LEVEL_CONFIG[selectedDay.level].emoji}{' '}
                {LEVEL_CONFIG[selectedDay.level].label}
              </span>
            )}
          </div>

          {selectedSessions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              이 날은 연습 기록이 없어요
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedSessions.map((s) => (
                <Card key={s.id} padding="sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {s.songTitle ?? s.instrumentName ?? '연습'}
                      </p>
                      {s.bpm && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          🥁 {s.bpm} BPM
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-primary">
                      {formatMinutes(s.durationMinutes)}
                    </span>
                  </div>
                </Card>
              ))}
              {selectedDay && (
                <p className="text-xs text-slate-400 text-right">
                  총 {formatMinutes(selectedDay.totalMinutes)} 연습
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 이달 요약 ─────────────────────────────────────── */}
      <Card className="mb-4">
        <p className="text-sm font-bold text-slate-800 mb-3">
          {month + 1}월 요약
        </p>
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-2">
            불러오는 중…
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-primary-pale rounded-item p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {summary?.practicedDays ?? 0}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">연습 일수</p>
              </div>
              <div className="bg-accent-light rounded-item p-3 text-center">
                <p className="text-2xl font-bold text-teal-600">
                  {formatMinutes(summary?.totalMinutes ?? 0)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">총 연습 시간</p>
              </div>
            </div>

            {/* 달성 레벨 분포 */}
            <div className="flex gap-2 justify-center">
              {(['perfect', 'great', 'good'] as DayLevel[]).map((l) => (
                <div
                  key={l}
                  className="flex-1 rounded-item p-2 text-center bg-slate-50"
                >
                  <p className="text-lg font-bold text-slate-800">
                    {l === 'perfect'
                      ? (summary?.perfectDays ?? 0)
                      : l === 'great'
                        ? (summary?.greatDays ?? 0)
                        : (summary?.goodDays ?? 0)}
                    일
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span
                      className={`w-2 h-2 rounded-full ${LEVEL_CONFIG[l].bg}`}
                    />
                    <span className="text-xs text-slate-500">
                      {LEVEL_CONFIG[l].label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </PageLayout>
  );
}
