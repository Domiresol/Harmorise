import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageLayout }        from '../components/ui/PageLayout';
import { Card, CardDivider } from '../components/ui/Card';
import { fetchWeeklyReport, type WeeklyReportDetail } from '../lib/api';

function BarChart({ data }: { data: { day: string; minutes: number }[] }) {
  const maxMin = Math.max(...data.map(d => d.minutes), 1);
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map(({ day, minutes }) => (
        <div key={day} className="flex-1 flex flex-col items-center gap-1">
          {minutes > 0 && (
            <span className="text-[10px] text-primary font-semibold">{minutes}</span>
          )}
          <div className="w-full rounded-t-md bg-primary-pale overflow-hidden flex items-end" style={{ height: 80 }}>
            <div
              className="w-full rounded-t-md bg-primary transition-all"
              style={{ height: `${(minutes / maxMin) * 100}%` }}
            />
          </div>
          <span className={`text-[10px] font-medium ${minutes > 0 ? 'text-slate-600' : 'text-slate-300'}`}>
            {day}
          </span>
        </div>
      ))}
    </div>
  );
}

export function WeeklyReportPage() {
  const { year, week } = useParams<{ year: string; week: string }>();
  const [report, setReport] = useState<WeeklyReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!year || !week) return;
    setLoading(true);
    fetchWeeklyReport(Number(year), Number(week))
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year, week]);

  if (loading) {
    return (
      <PageLayout title="주간 리포트" showBack>
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (error || !report) {
    return (
      <PageLayout title="주간 리포트" showBack>
        <p className="text-center text-slate-400 py-12">{error ?? '리포트를 찾을 수 없어요'}</p>
      </PageLayout>
    );
  }

  const totalH = Math.floor(report.totalMinutes / 60);
  const totalM = report.totalMinutes % 60;

  return (
    <PageLayout title="주간 리포트" showBack>
      <div className="flex flex-col gap-4 pb-6">

        {/* 헤더 요약 */}
        <Card highlighted>
          <p className="text-sm text-slate-400 mb-0.5">{report.label}</p>
          <p className="text-xs text-slate-400 mb-3">{report.dateRange}</p>
          <div className="flex items-end gap-2 mb-2">
            <p className="text-4xl font-black text-primary">
              {totalH > 0 ? `${totalH}h` : ''}{totalM > 0 ? ` ${totalM}m` : totalH === 0 ? '0m' : ''}
            </p>
            {report.prevDiffMinutes !== null && (
              <span className={`text-sm font-bold pb-1 ${report.prevDiffMinutes >= 0 ? 'text-primary' : 'text-red-400'}`}>
                {report.prevDiffMinutes >= 0
                  ? `▲ +${report.prevDiffMinutes}분`
                  : `▼ ${Math.abs(report.prevDiffMinutes)}분`}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-item p-2.5 text-center">
              <p className="text-xl font-bold text-slate-900">{report.practicedDays}</p>
              <p className="text-xs text-slate-400">연습 일수</p>
            </div>
            <div className="bg-white rounded-item p-2.5 text-center">
              <p className="text-xl font-bold text-slate-900">🔥 {report.streak}</p>
              <p className="text-xs text-slate-400">스트리크</p>
            </div>
          </div>
        </Card>

        {/* 요일별 연습 바 차트 */}
        <Card>
          <p className="text-sm font-bold text-slate-800 mb-3">요일별 연습 시간 (분)</p>
          <BarChart data={report.dayData} />
        </Card>

        {/* 가장 많이 연습한 곡 TOP 3 */}
        {report.topSongs.length > 0 && (
          <Card>
            <p className="text-sm font-bold text-slate-800 mb-3">연습 TOP 곡</p>
            {report.topSongs.map((s, i) => {
              const maxMin = report.topSongs[0].minutes;
              return (
                <div key={s.title}>
                  <div className="flex items-center gap-3 py-2">
                    <span className={`text-sm font-black w-5 text-center ${
                      i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : 'text-amber-600'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800 mb-1">{s.title}</p>
                      <div className="h-1.5 rounded-pill bg-primary-pale">
                        <div
                          className="h-1.5 rounded-pill bg-primary"
                          style={{ width: `${(s.minutes / maxMin) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary w-10 text-right">{s.minutes}분</span>
                  </div>
                  {i < report.topSongs.length - 1 && <CardDivider />}
                </div>
              );
            })}
          </Card>
        )}

        {/* BPM 향상 목록 */}
        {report.bpmGains.length > 0 && (
          <Card>
            <p className="text-sm font-bold text-slate-800 mb-3">🎸 BPM 향상 곡</p>
            {report.bpmGains.map((g, i) => (
              <div key={g.title}>
                <div className="flex items-center justify-between py-2">
                  <p className="text-sm text-slate-700">{g.title}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">{g.fromBpm}</span>
                    <span className="text-slate-300">→</span>
                    <span className="font-bold text-primary">{g.toBpm} BPM</span>
                    <span className="text-xs text-primary font-semibold bg-primary-pale px-1.5 py-0.5 rounded-pill">
                      +{g.toBpm - g.fromBpm}
                    </span>
                  </div>
                </div>
                {i < report.bpmGains.length - 1 && <CardDivider />}
              </div>
            ))}
          </Card>
        )}

        {/* 연습 기록 없을 때 */}
        {report.totalMinutes === 0 && (
          <p className="text-center text-slate-400 text-sm py-4">이 주에 연습 기록이 없어요</p>
        )}

      </div>
    </PageLayout>
  );
}
