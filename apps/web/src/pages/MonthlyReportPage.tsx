import { useEffect, useState } from 'react';
import { useParams }           from 'react-router-dom';
import { PageLayout }          from '../components/ui/PageLayout';
import { Card, CardDivider }   from '../components/ui/Card';
import { fetchMonthlyReport, type MonthlyReportDetail } from '../lib/api';

/* ── 도넛 차트 (SVG) ────────────────────────────────────── */
function DonutChart({ data }: { data: { name: string; minutes: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.minutes, 0);
  if (total === 0) return null;
  const cx = 60; const cy = 60; const r = 44; const innerR = 28;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.map(d => {
    const pct  = d.minutes / total;
    const dash = pct * circumference;
    const slice = { ...d, pct, dash, offset };
    offset += dash;
    return slice;
  });
  return (
    <div className="flex items-center gap-4">
      <svg width={120} height={120} viewBox="0 0 120 120" className="flex-shrink-0">
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth={r - innerR}
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={-s.offset + circumference * 0.25}
          />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1E293B">
          {total}분
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94A3B8">총 연습</text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {slices.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-slate-600">{s.name}</span>
            <span className="text-xs font-bold text-slate-800">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 요일 히트맵 ────────────────────────────────────────── */
function DayHeatmap({ data }: { data: number[] }) {
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const max = Math.max(...data, 1);
  const levels = ['#E0F2FE', '#BAE6FD', '#38BDF8', '#0EA5E9'];
  return (
    <div className="flex gap-2">
      {data.map((min, i) => {
        const ratio = min / max;
        const levelIdx = ratio === 0 ? 0 : ratio < 0.33 ? 1 : ratio < 0.66 ? 2 : 3;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full aspect-square rounded-md" style={{ backgroundColor: levels[levelIdx] }} />
            <span className="text-[10px] text-slate-400">{days[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── 시간대 히트맵 ──────────────────────────────────────── */
function HourHeatmap({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const levels = ['#F8FAFC', '#E0F2FE', '#7DD3FC', '#0EA5E9'];
  return (
    <div>
      <div className="flex gap-0.5 flex-wrap">
        {data.map((cnt, h) => {
          const ratio = cnt / max;
          const levelIdx = ratio === 0 ? 0 : ratio < 0.3 ? 1 : ratio < 0.6 ? 2 : 3;
          return (
            <div key={h} title={`${h}시`}
              className="w-[11px] h-[11px] rounded-sm"
              style={{ backgroundColor: levels[levelIdx] }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-slate-300">
        <span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span>
      </div>
    </div>
  );
}

export function MonthlyReportPage() {
  const { year, month } = useParams<{ year: string; month: string }>();
  const [report, setReport] = useState<MonthlyReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!year || !month) return;
    setLoading(true);
    fetchMonthlyReport(Number(year), Number(month))
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year, month]);

  if (loading) {
    return (
      <PageLayout title="월간 리포트" showBack>
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (error || !report) {
    return (
      <PageLayout title="월간 리포트" showBack>
        <p className="text-center text-slate-400 py-12">{error ?? '리포트를 찾을 수 없어요'}</p>
      </PageLayout>
    );
  }

  const totalH = Math.floor(report.totalMinutes / 60);
  const totalM = report.totalMinutes % 60;

  return (
    <PageLayout title="월간 리포트" showBack>
      <div className="flex flex-col gap-4 pb-6">

        {/* 헤더 요약 */}
        <Card highlighted>
          <p className="text-lg font-bold text-slate-900 mb-3">{report.label}</p>
          <div className="flex items-end gap-2 mb-3">
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
              <p className="text-xl font-bold text-slate-900">🔥 {report.bestStreak}</p>
              <p className="text-xs text-slate-400">최장 스트리크</p>
            </div>
          </div>
        </Card>

        {/* 악기별 비율 도넛 차트 */}
        {report.instruments.length > 0 && (
          <Card>
            <p className="text-sm font-bold text-slate-800 mb-3">악기별 연습 비율</p>
            <DonutChart data={report.instruments} />
          </Card>
        )}

        {/* 가장 성장한 곡 */}
        {report.topBpmSong && (
          <Card>
            <p className="text-sm font-bold text-slate-800 mb-3">🏆 이달의 성장 곡</p>
            <div className="flex items-center justify-between py-1">
              <p className="text-base font-bold text-slate-900">{report.topBpmSong.title}</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">{report.topBpmSong.fromBpm} BPM</span>
                <span className="text-slate-300">→</span>
                <span className="font-bold text-primary">{report.topBpmSong.toBpm} BPM</span>
                <span className="bg-primary-pale text-primary text-xs font-bold px-2 py-0.5 rounded-pill">
                  +{report.topBpmSong.toBpm - report.topBpmSong.fromBpm}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* 연습 패턴 히트맵 */}
        <Card>
          <p className="text-sm font-bold text-slate-800 mb-4">연습 패턴</p>
          <p className="text-xs text-slate-500 mb-2 font-medium">요일별</p>
          <DayHeatmap data={report.dayHeatmap} />
          <CardDivider className="my-4" />
          <p className="text-xs text-slate-500 mb-2 font-medium">시간대별</p>
          <HourHeatmap data={report.hourHeatmap} />
          <div className="flex items-center gap-1 mt-3 justify-end">
            <span className="text-[10px] text-slate-400 mr-1">적음</span>
            {['#E0F2FE', '#BAE6FD', '#38BDF8', '#0EA5E9'].map((c) => (
              <span key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
            ))}
            <span className="text-[10px] text-slate-400 ml-1">많음</span>
          </div>
        </Card>

        {report.totalMinutes === 0 && (
          <p className="text-center text-slate-400 text-sm py-4">이달 연습 기록이 없어요</p>
        )}

      </div>
    </PageLayout>
  );
}
