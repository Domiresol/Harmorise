import { useEffect, useState } from 'react';
import { useNavigate }        from 'react-router-dom';
import { PageLayout }         from '../components/ui/PageLayout';
import { Card }               from '../components/ui/Card';
import { apiFetch }           from '../lib/api';

interface SongItem {
  id:              string;
  title:           string;
  artist:          string | null;
  targetBpm:       number | null;
  sessionCount:    number;
  lastPracticedAt: string | null;
  latestBpm:       number | null;
  pct:             number | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '기록 없음';
  const d   = new Date(iso);
  const now = new Date();
  const diff = Math.round(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
     Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) / 86_400_000,
  );
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff < 7)  return `${diff}일 전`;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export function SongListPage() {
  const navigate = useNavigate();
  const [songs, setSongs]     = useState<SongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'all' | 'bpm'>('all');

  useEffect(() => {
    apiFetch<SongItem[]>('/songs')
      .then(setSongs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayed = filter === 'bpm'
    ? songs.filter(s => s.latestBpm !== null)
    : songs;

  const bpmCount = songs.filter(s => s.latestBpm !== null).length;

  return (
    <PageLayout title="내 연습곡" showBack>
      <div className="flex flex-col gap-4 pb-6">

        {/* ── 요약 배너 ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary-pale rounded-item p-3 text-center">
            <p className="text-xl font-bold text-primary">{songs.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">전체 곡</p>
          </div>
          <div className="bg-accent-light rounded-item p-3 text-center">
            <p className="text-xl font-bold text-teal-600">{bpmCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">BPM 기록 중</p>
          </div>
        </div>

        {/* ── 필터 탭 ────────────────────────────────────────── */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {([['all', '전체 곡'], ['bpm', 'BPM 기록 있는 곡']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={[
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                filter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── 목록 ───────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎵</p>
            <p className="text-slate-500 font-medium">
              {filter === 'bpm' ? 'BPM 기록이 있는 곡이 없어요' : '아직 등록된 곡이 없어요'}
            </p>
            <p className="text-sm text-slate-400 mt-1">연습 기록을 추가하면 여기에 나타납니다</p>
            <button
              onClick={() => navigate('/practice/new')}
              className="mt-4 px-5 py-2.5 bg-primary text-white rounded-pill text-sm font-semibold"
            >
              + 연습 기록 추가
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map(song => (
              <Card
                key={song.id}
                clickable
                onClick={() => navigate(`/bpm/${song.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">

                    {/* 곡명 + 아티스트 */}
                    <p className="text-base font-bold text-slate-900 truncate">{song.title}</p>
                    {song.artist && (
                      <p className="text-xs text-slate-400 mb-2">{song.artist}</p>
                    )}

                    {/* BPM 프로그레스 (BPM 있는 곡만) */}
                    {song.latestBpm !== null && song.pct !== null && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 rounded-pill bg-slate-100">
                          <div
                            className={`h-1.5 rounded-pill transition-all ${song.pct >= 100 ? 'bg-accent' : 'bg-primary'}`}
                            style={{ width: `${Math.min(song.pct, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold flex-shrink-0 ${song.pct >= 100 ? 'text-accent' : 'text-primary'}`}>
                          {song.pct}%
                        </span>
                      </div>
                    )}

                    {/* 메타 정보 */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                      <span>연습 <strong className="text-slate-600">{song.sessionCount}</strong>회</span>
                      {song.latestBpm !== null && (
                        <>
                          <span>·</span>
                          <span>
                            BPM <strong className="text-slate-600">{song.latestBpm}</strong>
                            {song.targetBpm && (
                              <span className="text-slate-400"> / {song.targetBpm}</span>
                            )}
                          </span>
                        </>
                      )}
                      {song.lastPracticedAt && (
                        <>
                          <span>·</span>
                          <span>{formatDate(song.lastPracticedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽 화살표 */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-1">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
