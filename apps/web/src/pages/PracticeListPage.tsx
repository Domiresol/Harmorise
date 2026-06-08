import { useNavigate }        from 'react-router-dom';
import { PageLayout }          from '../components/ui/PageLayout';
import { Card }                from '../components/ui/Card';
import { PracticeTypeBadge }   from '../components/ui/Badge';
import { NoPracticeState }     from '../components/ui/EmptyState';
import { usePracticeSessions } from '../hooks/usePracticeSessions';

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function PracticeListPage() {
  const navigate = useNavigate();
  const { sessions, loading, error, hasMore, streak, fetchMore } = usePracticeSessions();

  return (
    <PageLayout
      title="연습 기록"
      hasTabBar
      rightAction={
        <button
          className="text-sm text-primary font-medium"
          onClick={() => navigate('/practice/new')}
        >
          + 기록
        </button>
      }
    >
      {/* ── 스트릭 뱃지 ─────────────────────────────────── */}
      {streak && streak.currentStreak > 0 && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-lg">🔥</span>
          <span className="text-sm font-semibold text-orange-500">
            {streak.currentStreak}일 연속 연습 중!
          </span>
          <span className="text-xs text-slate-400">
            (최고: {streak.longestStreak}일)
          </span>
        </div>
      )}

      {/* ── 에러 ─────────────────────────────────────────── */}
      {error && (
        <p className="text-center text-red-500 text-sm py-4">{error}</p>
      )}

      {/* ── 로딩 스켈레톤 ────────────────────────────────── */}
      {loading && sessions.length === 0 && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── 빈 상태 ──────────────────────────────────────── */}
      {!loading && sessions.length === 0 && !error && (
        <NoPracticeState onAction={() => navigate('/practice/new')} />
      )}

      {/* ── 목록 ─────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <div className="flex flex-col gap-3">
          {sessions.map((rec) => (
            <Card
              key={rec.id}
              clickable
              onClick={() => navigate(`/practice/${rec.id}`)}
            >
              {/* 날짜 + 악기 헤더 */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-primary bg-primary-pale px-2 py-0.5 rounded-pill">
                  {formatDisplayDate(rec.practicedAt)}
                </span>
                {rec.instrumentName && (
                  <span className="text-xs text-slate-400">{rec.instrumentName}</span>
                )}
                {rec.bpm && (
                  <>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">BPM {rec.bpm}</span>
                  </>
                )}
              </div>

              {/* 곡명 + 시간 */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-slate-900 truncate flex-1">
                  {rec.songTitle || '자유 연습'}
                </p>
                <span className="text-sm font-bold text-primary shrink-0">
                  {rec.durationMinutes}분
                </span>
              </div>

              {/* 연습 유형 뱃지 */}
              {rec.practiceTypes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {rec.practiceTypes.map((t) => (
                    <PracticeTypeBadge key={t} type={t} />
                  ))}
                </div>
              )}
            </Card>
          ))}

          {/* 더 불러오기 */}
          {hasMore && (
            <button
              onClick={fetchMore}
              disabled={loading}
              className="text-center text-sm text-primary font-medium py-3 disabled:opacity-50"
            >
              {loading ? '불러오는 중...' : '더 보기'}
            </button>
          )}
        </div>
      )}
    </PageLayout>
  );
}
