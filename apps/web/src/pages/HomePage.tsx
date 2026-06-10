import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/ui/PageLayout';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { StreakBadge, PracticeTypeBadge } from '../components/ui/Badge';
import { NoPracticeState } from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

// ── API 응답 타입 ──────────────────────────────────────────
interface SummaryResponse {
  todayMinutes: number;
  weekPracticedDays: number;
  weekGoalDays: number;
  weekPracticedDates: string[];
  streak: { currentStreak: number; longestStreak: number };
  recentSessions: {
    id: string;
    practicedAt: string;
    durationMinutes: number;
    bpm: number | null;
    instrumentName: string | null;
    songTitle: string | null;
    artist: string | null;
    practiceTypes: string[];
    memos: { id: string; content: string; createdAt: string }[];
    createdAt: string;
  }[];
}

interface BpmSong {
  songId: string;
  title: string;
  artist: string | null;
  currentBpm: number;
  targetBpm: number;
  pct: number;
  lastRecordedAt: string | null;
}

// ── 날짜 표시 헬퍼 ─────────────────────────────────────────
function formatPracticedAt(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();

  const dDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const diffMs = today.getTime() - dDate.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [bpmSongs, setBpmSongs] = useState<BpmSong[]>([]);

  useEffect(() => {
    // summary + BPM 동시 요청
    Promise.all([
      apiFetch<SummaryResponse>('/practice/stats/summary'),
      apiFetch<BpmSong[]>('/bpm/songs'),
    ]).then(([s, b]) => {
      setSummary(s);
      setBpmSongs(b.slice(0, 3)); // 홈 화면엔 최대 3개
    }).catch(() => {
      // 에러 시 빈 상태 유지 (로그인 직후 데이터 없을 수 있음)
    });
  }, []);

  const nickname = user?.profile?.nickname ?? '연습생';
  const level    = user?.character?.level   ?? 1;
  const goalMin  = user?.profile?.dailyGoalMinutes ?? 30;

  const todayMin          = summary?.todayMinutes        ?? 0;
  const weekDays          = summary?.weekPracticedDays   ?? 0;
  const weekGoalDays      = summary?.weekGoalDays        ?? 5;
  const weekPracticedDates= new Set(summary?.weekPracticedDates ?? []);
  const streak            = summary?.streak?.currentStreak ?? 0;
  const goalPct           = Math.min(Math.round((todayMin / goalMin) * 100), 100);
  const recentSessions    = summary?.recentSessions ?? [];

  // 이번 주 월~일 날짜 배열 계산
  const todayDate   = new Date();
  const dow         = todayDate.getDay(); // 0=일
  const diffToMon   = dow === 0 ? -6 : 1 - dow;
  const weekDates   = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() + diffToMon + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const DAY_LABELS  = ['월', '화', '수', '목', '금', '토', '일'];
  const weekGoalMet = weekDays >= weekGoalDays;

  return (
    <PageLayout hasTabBar title={undefined} showBack={false}>

      {/* ── 상단 캐릭터 + 인사 ─────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-primary-pale flex items-center justify-center text-3xl">
            🎸
          </div>
          <span className="absolute -bottom-1 -right-1 bg-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-pill">
            Lv.{level}
          </span>
        </div>
        <div>
          <p className="text-sm text-slate-400">안녕하세요,</p>
          <p className="text-lg font-bold text-slate-900">{nickname} 님 👋</p>
          <StreakBadge count={streak} />
        </div>
      </div>

      {/* ── 오늘 요약 카드 ─────────────────────────────────── */}
      <Card highlighted className="mb-4">
        <CardHeader>
          <CardTitle>오늘의 연습</CardTitle>
          <span className="text-sm text-primary font-semibold">{goalPct}%</span>
        </CardHeader>

        {/* 목표 프로그레스 바 */}
        <div className="w-full h-2 rounded-pill bg-primary-pale mb-2">
          <div
            className="h-2 rounded-pill bg-primary transition-all"
            style={{ width: `${goalPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mb-4">
          {todayMin}분 / 목표 {goalMin}분
        </p>

        {/* 스트리크 + 이번 주 */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white rounded-item p-3 text-center">
            <p className="text-2xl font-bold text-primary">{streak}</p>
            <p className="text-xs text-slate-400 mt-0.5">연속 연습 🔥</p>
          </div>
          <div className="bg-white rounded-item p-3 text-center">
            <p className="text-2xl font-bold text-slate-800">
              {weekDays}
              <span className="text-sm font-normal text-slate-400">/{weekGoalDays}일</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">이번 주 목표</p>
          </div>
        </div>

        {/* 주간 미션 — 요일 도트 */}
        <div className="bg-white rounded-item px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500">이번 주 미션</span>
            {weekGoalMet
              ? <span className="text-xs font-bold text-primary">🏆 달성!</span>
              : <span className="text-xs text-slate-400">{weekDays}/{weekGoalDays}일</span>
            }
          </div>
          <div className="flex gap-1">
            {weekDates.map((date, i) => {
              const practiced = weekPracticedDates.has(date);
              const isToday   = date === weekDates[todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1];
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className={`text-[10px] font-medium ${isToday ? 'text-primary' : 'text-slate-400'}`}>
                    {DAY_LABELS[i]}
                  </span>
                  <span className={[
                    'w-full aspect-square rounded-full max-w-[28px]',
                    practiced
                      ? 'bg-primary'
                      : isToday
                        ? 'bg-primary-pale ring-1 ring-primary'
                        : 'bg-slate-100',
                  ].join(' ')} />
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── BPM 현황 ───────────────────────────────────────── */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-md font-bold text-slate-800">BPM 성장 현황</h2>
          <button
            onClick={() => navigate('/bpm')}
            className="text-sm text-primary font-medium"
          >
            전체 보기
          </button>
        </div>
        {bpmSongs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">아직 BPM 기록이 없어요.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bpmSongs.map((item) => (
              <Card
                key={item.songId}
                clickable
                padding="sm"
                onClick={() => navigate(`/bpm/${item.songId}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 h-1.5 rounded-pill bg-slate-100">
                        <div
                          className="h-1.5 rounded-pill bg-primary"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {item.currentBpm}/{item.targetBpm} BPM
                      </span>
                    </div>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${item.pct >= 100 ? 'text-accent' : 'text-primary'}`}>
                    {item.pct}%
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── 최근 연습 기록 ─────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-md font-bold text-slate-800">최근 연습</h2>
          <button
            onClick={() => navigate('/practice')}
            className="text-sm text-primary font-medium"
          >
            전체 보기
          </button>
        </div>

        {recentSessions.length === 0 ? (
          <NoPracticeState onAction={() => navigate('/practice/new')} />
        ) : (
          <div className="flex flex-col gap-2">
            {recentSessions.map((rec) => (
              <Card
                key={rec.id}
                clickable
                onClick={() => navigate(`/practice/${rec.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400">{formatPracticedAt(rec.practicedAt)}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{rec.instrumentName ?? '악기 미지정'}</span>
                    </div>
                    <p className="text-base font-semibold text-slate-900 truncate">
                      {rec.songTitle ?? '곡 미지정'}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {rec.practiceTypes.map((t) => (
                        <PracticeTypeBadge key={t} type={t} />
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-primary">{rec.durationMinutes}</p>
                    <p className="text-xs text-slate-400">분</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageLayout>
  );
}
