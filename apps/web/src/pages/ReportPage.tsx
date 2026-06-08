import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout }  from '../components/ui/PageLayout';
import { Card }        from '../components/ui/Card';
import { NoReportState } from '../components/ui/EmptyState';

type TabType = 'weekly' | 'monthly';

const MOCK_WEEKLY_REPORTS = [
  { id: 'w1', period: '2026년 5월 4주차', dateRange: '5/18 ~ 5/24', totalMin: 230, prevDiff: +45, practicedays: 5 },
  { id: 'w2', period: '2026년 5월 3주차', dateRange: '5/11 ~ 5/17', totalMin: 185, prevDiff: -20, practicedays: 4 },
  { id: 'w3', period: '2026년 5월 2주차', dateRange: '5/4 ~ 5/10',  totalMin: 205, prevDiff: +60, practicedays: 6 },
  { id: 'w4', period: '2026년 5월 1주차', dateRange: '4/27 ~ 5/3',  totalMin: 145, prevDiff: null, practicedays: 3 },
];

const MOCK_MONTHLY_REPORTS = [
  { id: 'm1', period: '2026년 5월', totalMin: 760, prevDiff: +120, practicedays: 18 },
  { id: 'm2', period: '2026년 4월', totalMin: 640, prevDiff: -80,  practicedays: 15 },
  { id: 'm3', period: '2026년 3월', totalMin: 720, prevDiff: +200, practicedays: 17 },
];

function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ReportPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('weekly');

  return (
    <PageLayout title="리포트" hasTabBar>

      {/* ── 탭 ───────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        {([['weekly', '주간'], ['monthly', '월간']] as [TabType, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === key
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-400',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 주간 리포트 목록 ─────────────────────────────── */}
      {tab === 'weekly' && (
        <div className="flex flex-col gap-3">
          {MOCK_WEEKLY_REPORTS.length === 0 ? (
            <NoReportState />
          ) : (
            MOCK_WEEKLY_REPORTS.map((r) => (
              <Card
                key={r.id}
                clickable
                onClick={() => navigate(`/report/weekly/${r.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-base font-bold text-slate-900">{r.period}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{r.dateRange}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{formatDuration(r.totalMin)}</span> 연습
                      </span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{r.practicedays}</span>일
                      </span>
                      {r.prevDiff !== null && (
                        <>
                          <span className="text-xs text-slate-300">·</span>
                          <span className={`text-xs font-semibold ${r.prevDiff > 0 ? 'text-primary' : 'text-red-400'}`}>
                            {r.prevDiff > 0 ? `▲ +${r.prevDiff}분` : `▼ ${r.prevDiff}분`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 bg-primary-pale rounded-item px-3 py-2 text-center min-w-[56px]">
                    <p className="text-lg font-bold text-primary">{Math.floor(r.totalMin / 60)}</p>
                    <p className="text-xs text-slate-400">시간</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── 월간 리포트 목록 ─────────────────────────────── */}
      {tab === 'monthly' && (
        <div className="flex flex-col gap-3">
          {MOCK_MONTHLY_REPORTS.length === 0 ? (
            <NoReportState />
          ) : (
            MOCK_MONTHLY_REPORTS.map((r) => (
              <Card
                key={r.id}
                clickable
                onClick={() => navigate(`/report/monthly/${r.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-base font-bold text-slate-900">{r.period}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{formatDuration(r.totalMin)}</span> 연습
                      </span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{r.practicedays}</span>일
                      </span>
                      {r.prevDiff !== null && (
                        <>
                          <span className="text-xs text-slate-300">·</span>
                          <span className={`text-xs font-semibold ${r.prevDiff > 0 ? 'text-primary' : 'text-red-400'}`}>
                            {r.prevDiff > 0 ? `▲ +${r.prevDiff}분` : `▼ ${r.prevDiff}분`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 bg-accent-light rounded-item px-3 py-2 text-center min-w-[56px]">
                    <p className="text-lg font-bold text-teal-600">{Math.floor(r.totalMin / 60)}</p>
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
