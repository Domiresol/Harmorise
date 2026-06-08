import { useEffect, useState } from 'react';
import { useNavigate }        from 'react-router-dom';
import { PageLayout }         from '../components/ui/PageLayout';
import { Card }               from '../components/ui/Card';
import { NoBpmState }         from '../components/ui/EmptyState';
import { apiFetch }           from '../lib/api';

interface BpmSong {
  songId: string;
  title: string;
  artist: string | null;
  currentBpm: number;
  targetBpm: number;
  pct: number;
  lastRecordedAt: string | null;
}

function formatLastDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.round(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
     Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) / 86_400_000
  );
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function MiniSparkline({ bpms }: { bpms: number[] }) {
  if (bpms.length < 2) return null;
  const w = 64; const h = 24;
  const min = Math.min(...bpms) - 2;
  const max = Math.max(...bpms) + 2;
  const toX = (i: number) => (i / (bpms.length - 1)) * w;
  const toY = (v: number) => h - ((v - min) / (max - min)) * h;
  const pts = bpms.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const rising = bpms[bpms.length - 1] >= bpms[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={rising ? '#0EA5E9' : '#F87171'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BPMListPage() {
  const navigate = useNavigate();
  const [songs, setSongs]   = useState<BpmSong[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<BpmSong[]>('/bpm/songs')
      .then(setSongs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const achievedCount = songs.filter(s => s.pct >= 100).length;

  return (
    <PageLayout
      title="BPM 관리"
      hasTabBar
      rightAction={
        <div className="flex items-center gap-3">
          <button
            className="text-sm text-slate-500 font-medium"
            onClick={() => navigate('/songs')}
          >
            내 곡 목록
          </button>
          <button
            className="text-sm text-primary font-medium"
            onClick={() => navigate('/practice/new')}
          >
            + 기록 추가
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col gap-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <NoBpmState onAction={() => navigate('/practice/new')} />
      ) : (
        <div className="flex flex-col gap-3 pb-4">

          {/* ── 요약 배너 ─────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 mb-1">
            <div className="bg-primary-pale rounded-item p-3 text-center">
              <p className="text-xl font-bold text-primary">{songs.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">연습 중인 곡</p>
            </div>
            <div className="bg-accent-light rounded-item p-3 text-center">
              <p className="text-xl font-bold text-teal-600">{achievedCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">목표 달성</p>
            </div>
          </div>

          {/* ── 곡 목록 ───────────────────────────────────── */}
          {songs.map((item) => (
            <Card
              key={item.songId}
              clickable
              onClick={() => navigate(`/bpm/${item.songId}`)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">

                  {/* 곡 정보 */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-base font-bold text-slate-900 truncate">{item.title}</p>
                    {item.pct >= 100 && (
                      <span className="text-xs bg-accent-light text-teal-600 font-bold px-1.5 py-0.5 rounded-pill flex-shrink-0">
                        ✓ 달성
                      </span>
                    )}
                  </div>
                  {item.artist && (
                    <p className="text-xs text-slate-400 mb-2">{item.artist}</p>
                  )}

                  {/* 프로그레스 바 */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-pill bg-slate-100">
                      <div
                        className={`h-2 rounded-pill transition-all ${item.pct >= 100 ? 'bg-accent' : 'bg-primary'}`}
                        style={{ width: `${Math.min(item.pct, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold flex-shrink-0 ${item.pct >= 100 ? 'text-accent' : 'text-primary'}`}>
                      {item.pct}%
                    </span>
                  </div>

                  {/* BPM 수치 */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <span>현재 <strong className="text-slate-700">{item.currentBpm}</strong> BPM</span>
                    <span>·</span>
                    <span>목표 <strong className="text-slate-700">{item.targetBpm}</strong> BPM</span>
                    {item.lastRecordedAt && (
                      <>
                        <span>·</span>
                        <span>{formatLastDate(item.lastRecordedAt)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 스파크라인 — 현재는 단일 값이라 생략 */}
                <div className="flex-shrink-0 mt-1 opacity-40">
                  <MiniSparkline bpms={[item.currentBpm]} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
