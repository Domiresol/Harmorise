import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

// ── 타입 ─────────────────────────────────────────────────────
interface Overview {
  totalUsers:         number;
  dau:                number;
  premiumCount:       number;
  premiumRate:        number;
  avgPracticeMinutes: number;
  newUsersThisWeek:   number;
}

interface ActivityData {
  weekdaySessions: { label: string; count: number }[];
  instrumentDist:  { name: string; count: number; percentage: number }[];
}

// ── 통계 카드 ────────────────────────────────────────────────
function StatCard({
  label, value, sub, subColor = 'text-slate-400',
}: { label: string; value: string | number; sub?: string; subColor?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      <p className="text-2xl font-semibold text-slate-800">{value}</p>
      {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
    </div>
  );
}

// ── 바 차트 로우 ─────────────────────────────────────────────
function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-5 text-right">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-600 w-10 text-right">{count.toLocaleString()}</span>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
export function AdminDashboardPage() {
  const [overview,  setOverview]  = useState<Overview | null>(null);
  const [activity,  setActivity]  = useState<ActivityData | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Overview>('/admin/stats/overview'),
      apiFetch<ActivityData>('/admin/stats/activity'),
    ])
      .then(([ov, ac]) => { setOverview(ov); setActivity(ac); })
      .finally(() => setLoading(false));
  }, []);

  const maxSessions = activity
    ? Math.max(...activity.weekdaySessions.map(s => s.count), 1)
    : 1;

  const today = new Date();
  const dateLabel = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <div className="p-7 max-w-5xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">대시보드</h1>
          <p className="text-sm text-slate-400 mt-0.5">{dateLabel}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">데이터 불러오는 중…</p>
      ) : (
        <>
          {/* 핵심 지표 카드 */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <StatCard
              label="전체 가입자"
              value={overview?.totalUsers.toLocaleString() ?? 0}
              sub={`+${overview?.newUsersThisWeek ?? 0}명 이번 주`}
              subColor="text-emerald-600"
            />
            <StatCard
              label="오늘 활성 (DAU)"
              value={overview?.dau.toLocaleString() ?? 0}
            />
            <StatCard
              label="프리미엄 구독"
              value={overview?.premiumCount.toLocaleString() ?? 0}
              sub={`전환율 ${overview?.premiumRate ?? 0}%`}
            />
            <StatCard
              label="평균 연습 시간"
              value={`${overview?.avgPracticeMinutes ?? 0}분`}
              sub="최근 30일 기준"
            />
          </div>

          {/* 차트 영역 */}
          <div className="grid grid-cols-3 gap-4">
            {/* 요일별 세션 */}
            <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">
                요일별 연습 세션 (최근 4주)
              </p>
              <div className="flex flex-col gap-3">
                {activity?.weekdaySessions.map(s => (
                  <BarRow key={s.label} label={s.label} count={s.count} max={maxSessions} />
                ))}
              </div>
            </div>

            {/* 악기 분포 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">
                악기 분포 (최근 4주)
              </p>
              {activity?.instrumentDist.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">데이터 없음</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {activity?.instrumentDist.map((inst, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>{inst.name}</span>
                        <span className="text-slate-400">{inst.percentage}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-400"
                          style={{ width: `${inst.percentage}%`, opacity: 1 - i * 0.15 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
