import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout }  from '../components/ui/PageLayout';
import { Card }        from '../components/ui/Card';
import { NoReportState } from '../components/ui/EmptyState';
import {
  fetchWeeklyReportList,
  fetchMonthlyReportList,
  type WeeklyReportItem,
  type MonthlyReportItem,
} from '../lib/api';

type TabType = 'weekly' | 'monthly';

function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ReportPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('weekly');

  const [weeklyList, setWeeklyList] = useState<WeeklyReportItem[]>([]);
  const [monthlyList, setMonthlyList] = useState<MonthlyReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fn = tab === 'weekly' ? fetchWeeklyReportList : fetchMonthlyReportList;
    fn()
      .then((data) => {
        if (tab === 'weekly') setWeeklyList(data as WeeklyReportItem[]);
        else setMonthlyList(data as MonthlyReportItem[]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <PageLayout title="리포트" hasTabBar>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        {([['weekly', '주간'], ['monthly', '월간']] as [TabType, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === key ? 'bg-white text-primary shadow-sm' : 'text-slate-400',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-center text-red-400 text-sm py-8">{error}</p>
      )}

      {/* 주간 리포트 목록 */}
      {!loading && !error && tab === 'weekly' && (
        <div className="flex flex-col gap-3">
          {weeklyList.length === 0 ? (
            <NoReportState />
          ) : (
            weeklyList.map((r) => (
              <Card
                key={`${r.year}-${r.week}`}
                clickable
                onClick={() => navigate(`/report/weekly/${r.year}/${r.week}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-base font-bold text-slate-900">{r.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{r.dateRange}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{formatDuration(r.totalMinutes)}</span> 연습
                      </span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{r.practicedDays}</span>일
                      </span>
                      {r.prevDiffMinutes !== null && (
                        <>
                          <span className="text-xs text-slate-300">·</span>
                          <span className={`text-xs font-semibold ${r.prevDiffMinutes >= 0 ? 'text-primary' : 'text-red-400'}`}>
                            {r.prevDiffMinutes >= 0 ? `▲ +${r.prevDiffMinutes}분` : `▼ ${r.prevDiffMinutes}분`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 bg-primary-pale rounded-item px-3 py-2 text-center min-w-[56px]">
                    <p className="text-lg font-bold text-primary">{Math.floor(r.totalMinutes / 60)}</p>
                    <p className="text-xs text-slate-400">시간</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* 월간 리포트 목록 */}
      {!loading && !error && tab === 'monthly' && (
        <div className="flex flex-col gap-3">
          {monthlyList.length === 0 ? (
            <NoReportState />
          ) : (
            monthlyList.map((r) => (
              <Card
                key={`${r.year}-${r.month}`}
                clickable
                onClick={() => navigate(`/report/monthly/${r.year}/${r.month}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-base font-bold text-slate-900">{r.label}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{formatDuration(r.totalMinutes)}</span> 연습
                      </span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{r.practicedDays}</span>일
                      </span>
                      {r.prevDiffMinutes !== null && (
                        <>
                          <span className="text-xs text-slate-300">·</span>
                          <span className={`text-xs font-semibold ${r.prevDiffMinutes >= 0 ? 'text-primary' : 'text-red-400'}`}>
                            {r.prevDiffMinutes >= 0 ? `▲ +${r.prevDiffMinutes}분` : `▼ ${r.prevDiffMinutes}분`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 bg-accent-light rounded-item px-3 py-2 text-center min-w-[56px]">
                    <p className="text-lg font-bold text-teal-600">{Math.floor(r.totalMinutes / 60)}</p>
                    <p className="text-xs text-slate-400">시간</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

    </PageLayout>
  );
}
