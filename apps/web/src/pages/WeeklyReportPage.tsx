import { useParams } from 'react-router-dom';
import { PageLayout }       from '../components/ui/PageLayout';
import { Card, CardDivider } from '../components/ui/Card';

const MOCK_WEEKLY: Record<string, {
  period: string; dateRange: string;
  totalMin: number; prevDiff: number | null;
  practicedays: number; streak: number;
  topSongs: { title: string; min: number }[];
  bpmGains: { title: string; from: number; to: number }[];
  dayData: { day: string; min: number }[];
}> = {
  w1: {
    period: '2026년 5월 4주차', dateRange: '5/18 ~ 5/24',
    totalMin: 230, prevDiff: +45, practicedays: 5, streak: 12,
    topSongs: [
      { title: 'Blackbird',       min: 90 },
      { title: '사계 - 봄',        min: 75 },
      { title: 'Hotel California', min: 65 },
    ],
    bpmGains: [
      { title: 'Blackbird',       from: 80, to: 84 },
      { title: 'Comfortably Numb', from: 58, to: 60 },
    ],
    dayData: [
      { day: '월', min: 0  },
      { day: '화', min: 45 },
      { day: '수', min: 60 },
      { day: '목', min: 30 },
      { day: '금', min: 50 },
      { day: '토', min: 45 },
      { day: '일', min: 0  },
    ],
  },
  w2: {
    period: '2026년 5월 3주차', dateRange: '5/11 ~ 5/17',
    totalMin: 185, prevDiff: -20, practicedays: 4, streak: 7,
    topSongs: [
      { title: '사계 - 봄', min: 80 },
      { title: 'Blackbird', min: 70 },
      { title: 'Comfortably Numb', min: 35 },
    ],
    bpmGains: [
      { title: '사계 - 봄', from: 104, to: 108 },
    ],
    dayData: [
      { day: '월', min: 60 },
      { day: '화', min: 0  },
      { day: '수', min: 45 },
      { day: '목', min: 0  },
      { day: '금', min: 50 },
      { day: '토', min: 30 },
      { day: '일', min: 0  },
    ],
  },
};

function BarChart({ data }: { data: { day: string; min: number }[] }) {
  const maxMin = Math.max(...data.map(d => d.min), 1);
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map(({ day, min }) => (
        <div key={day} className="flex-1 flex flex-col items-center gap-1">
          {min > 0 && (
            <span className="text-[10px] text-primary font-semibold">{min}</span>
          )}
          <div className="w-full rounded-t-md bg-primary-pale overflow-hidden flex items-end" style={{ height: 80 }}>
            <div
              className="w-full rounded-t-md bg-primary transition-all"
              style={{ height: `${(min / maxMin) * 100}%` }}
            />
          </div>
          <span className={`text-[10px] font-medium ${min > 0 ? 'text-slate-600' : 'text-slate-300'}`}>
            {day}
          </span>
        </div>
      ))}
    </div>
  );
}

export function WeeklyReportPage() {
  const { id } = useParams<{ id: string }>();
  const report = id ? MOCK_WEEKLY[id] : null;

  if (!report) {
    return (
      <PageLayout title="주간 리포트" showBack>
        <p className="text-center text-slate-400 py-12">리포트를 찾을 수 없어요</p>
      </PageLayout>
    );
  }

  const totalH = Math.floor(report.totalMin / 60);
  const totalM = report.totalMin % 60;

  return (
    <PageLayout title="주간 리포트" showBack>
      <div className="flex flex-col gap-4 pb-6">

        {/* ── 헤더 요약 ─────────────────────────────────────── */}
        <Card highlighted>
          <p className="text-sm text-slate-400 mb-0.5">{report.period}</p>
          <p className="text-xs text-slate-400 mb-3">{report.dateRange}</p>

          <div className="flex items-end gap-2 mb-2">
            <p className="text-4xl font-black text-primary">
              {totalH > 0 ? `${totalH}h` : ''}{totalM > 0 ? ` ${totalM}m` : ''}
            </p>
            {report.prevDiff !== null && (
              <span className={`text-sm font-bold pb-1 ${report.prevDiff > 0 ? 'text-primary' : 'text-red-400'}`}>
                {report.prevDiff > 0 ? `▲ +${report.prevDiff}분` : `▼ ${Math.abs(report.prevDiff)}분`}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-item p-2.5 text-center">
              <p className="text-xl font-bold text-slate-900">{report.practicedays}</p>
              <p className="text-xs text-slate-400">연습 일수</p>
            </div>
            <div className="bg-white rounded-item p-2.5 text-center">
              <p className="text-xl font-bold text-slate-900">🔥 {report.streak}</p>
              <p className="text-xs text-slate-400">스트리크</p>
            </div>
          </div>
        </Card>

        {/* ── 요일별 연습 바 차트 ───────────────────────────── */}
        <Card>
          <p className="text-sm font-bold text-slate-800 mb-3">요일별 연습 시간 (분)</p>
          <BarChart data={report.dayData} />
        </Card>

        {/* ── 가장 많이 연습한 곡 TOP 3 ────────────────────── */}
        <Card>
          <p className="text-sm font-bold text-slate-800 mb-3">연습 TOP 곡</p>
          {report.topSongs.map((s, i) => {
            const maxMin = report.topSongs[0].min;
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
                        style={{ width: `${(s.min / maxMin) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary w-10 text-right">{s.min}분</span>
                </div>
                {i < report.topSongs.length - 1 && <CardDivider />}
              </div>
            );
          })}
        </Card>

        {/* ── BPM 향상 목록 ─────────────────────────────────── */}
        {report.bpmGains.length > 0 && (
          <Card>
            <p className="text-sm font-bold text-slate-800 mb-3">🎸 BPM 향상 곡</p>
            {report.bpmGains.map((g, i) => (
              <div key={g.title}>
                <div className="flex items-center justify-between py-2">
                  <p className="text-sm text-slate-700">{g.title}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">{g.from}</span>
                    <span className="text-slate-300">→</span>
                    <span className="font-bold text-primary">{g.to} BPM</span>
                    <span className="text-xs text-primary font-semibold bg-primary-pale px-1.5 py-0.5 rounded-pill">
                      +{g.to - g.from}
                    </span>
                  </div>
                </div>
                {i < report.bpmGains.length - 1 && <CardDivider />}
              </div>
            ))}
          </Card>
        )}

      </div>
    </PageLayout>
  );
}
