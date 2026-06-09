import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout }             from '../components/ui/PageLayout';
import { Card, CardDivider }      from '../components/ui/Card';
import { Button }                 from '../components/ui/Button';
import { PracticeTypeBadge }      from '../components/ui/Badge';
import { apiFetch }               from '../lib/api';

// ── 타입 ─────────────────────────────────────────────────────
interface SongDetail {
  id: string;
  title: string;
  artist: string | null;
  targetBpm: number | null;
}

interface BpmRecord {
  bpm: number;
  recordedAt: string;
}

interface PracticeSession {
  id: string;
  practicedAt: string;
  durationMinutes: number;
  bpm: number | null;
  instrumentName: string | null;
  practiceTypes: string[];
  memos: { id: string; content: string; createdAt: string }[];
}

interface SongHistoryResponse {
  song: SongDetail;
  records: BpmRecord[];
}

interface SongSessionsResponse {
  song: SongDetail;
  stats: {
    totalMinutes: number;
    sessionCount: number;
    startBpm: number | null;
    latestBpm: number | null;
  };
  sessions: PracticeSession[];
}

type Tab    = 'bpm' | 'sessions';
type Period = '1m' | '3m' | 'all';

// ── 날짜 포맷 ─────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}
function fmtFull(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

// ── BPM 라인 차트 ─────────────────────────────────────────────
function BpmChart({ data, targetBpm }: {
  data: { label: string; bpm: number }[];
  targetBpm: number;
}) {
  const W = 320; const H = 160;
  const pL = 32; const pR = 20; const pT = 12; const pB = 28;
  const cW = W - pL - pR; const cH = H - pT - pB;

  const bpms   = data.map(d => d.bpm);
  const allV   = [...bpms, targetBpm];
  const minV   = Math.min(...allV) - 6;
  const maxV   = Math.max(...allV) + 6;
  const toX    = (i: number) => pL + (i / Math.max(data.length - 1, 1)) * cW;
  const toY    = (v: number) => pT + ((maxV - v) / (maxV - minV)) * cH;

  const pts     = data.map((d, i) => `${toX(i)},${toY(d.bpm)}`).join(' ');
  const fill    = `${toX(0)},${pT + cH} ${pts} ${toX(data.length - 1)},${pT + cH}`;
  const tY      = toY(targetBpm);
  const yTicks  = [Math.round(minV), Math.round((minV + maxV) / 2), Math.round(maxV)];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      <defs>
        <linearGradient id="bpmGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={pL} y1={toY(v)} x2={W - pR} y2={toY(v)} stroke="#E2E8F0" strokeWidth="1" />
          <text x={pL - 4} y={toY(v) + 4} textAnchor="end" fontSize="9" fill="#94A3B8">{v}</text>
        </g>
      ))}
      <line x1={pL} y1={tY} x2={W - pR} y2={tY} stroke="#2DD4BF" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x={W - pR + 2} y={tY + 4} fontSize="8" fill="#2DD4BF" textAnchor="start">목표</text>
      <polygon points={fill} fill="url(#bpmGrad2)" />
      <polyline points={pts} fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.bpm)} r="3.5" fill="#0EA5E9" />
          {(i === 0 || i === data.length - 1 || (data.length > 4 && i === Math.floor(data.length / 2))) && (
            <text x={toX(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#94A3B8">{d.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ── 연습 시간 미니 바 차트 ────────────────────────────────────
function DurationBarChart({ sessions }: { sessions: PracticeSession[] }) {
  if (sessions.length === 0) return null;
  // 날짜 오름차순 (왼쪽=오래된것, 오른쪽=최신), 전체 표시
  const ordered   = [...sessions].reverse();
  const maxMin    = Math.max(...ordered.map(s => s.durationMinutes));
  const BAR_W     = 14; // px — 고정 폭
  const GAP       = 3;  // px
  const MAX_BAR_H = 48; // px

  return (
    <div className="overflow-x-auto">
      <div
        className="flex items-end justify-center gap-[3px]"
        style={{ height: 64, minWidth: ordered.length * (BAR_W + GAP) }}
      >
        {ordered.map((s, i) => {
          const barH = maxMin > 0 ? Math.max((s.durationMinutes / maxMin) * MAX_BAR_H, 2) : 2;
          return (
            <div
              key={i}
              className="flex-shrink-0 flex flex-col items-center justify-end gap-0.5"
              style={{ width: BAR_W }}
            >
              <div className="w-full rounded-sm bg-primary" style={{ height: barH }} />
              <span className="text-[8px] text-slate-300 leading-none">
                {fmtDate(s.practicedAt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export function BPMDetailPage() {
  const { songId }  = useParams<{ songId: string }>();
  const navigate    = useNavigate();

  const [tab, setTab]                     = useState<Tab>('bpm');
  const [period, setPeriod]               = useState<Period>('1m');
  const [showTargetEdit, setShowTargetEdit] = useState(false);
  const [targetInput, setTargetInput]     = useState('');
  const [savingTarget, setSavingTarget]   = useState(false);

  // BPM 이력 데이터
  const [bpmData, setBpmData]     = useState<SongHistoryResponse | null>(null);
  const [bpmLoading, setBpmLoading] = useState(true);

  // 연습 기록 데이터
  const [sessData, setSessData]   = useState<SongSessionsResponse | null>(null);
  const [sessLoading, setSessLoading] = useState(false);
  const [sessLoaded, setSessLoaded]   = useState(false);

  const [error, setError] = useState<string | null>(null);

  // BPM 탭: 초기 로드
  useEffect(() => {
    if (!songId) return;
    apiFetch<SongHistoryResponse>(`/bpm/songs/${songId}`)
      .then(setBpmData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setBpmLoading(false));
  }, [songId]);

  // 연습 탭: 탭 전환 시 한 번만 로드
  useEffect(() => {
    if (tab !== 'sessions' || sessLoaded || !songId) return;
    setSessLoading(true);
    apiFetch<SongSessionsResponse>(`/songs/${songId}/sessions`)
      .then(data => { setSessData(data); setSessLoaded(true); })
      .catch(() => {})
      .finally(() => setSessLoading(false));
  }, [tab, sessLoaded, songId]);

  // ── 로딩 / 에러 ───────────────────────────────────────────
  if (bpmLoading) {
    return (
      <PageLayout title="곡 상세" showBack>
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-40 bg-slate-100 rounded-2xl" />
          <div className="h-48 bg-slate-100 rounded-2xl" />
        </div>
      </PageLayout>
    );
  }
  if (error || !bpmData) {
    return (
      <PageLayout title="곡 상세" showBack>
        <p className="text-center text-slate-400 py-12">{error ?? '곡을 찾을 수 없어요'}</p>
      </PageLayout>
    );
  }

  const { song, records } = bpmData;
  const targetBpm  = song.targetBpm ?? (records.length > 0 ? records[records.length - 1].bpm : 0);
  const currentBpm = records.length > 0 ? records[records.length - 1].bpm : 0;
  const startBpm   = records.length > 0 ? records[0].bpm : 0;
  const pct        = targetBpm > 0 ? Math.min(Math.round((currentBpm / targetBpm) * 100), 100) : 100;
  const gain       = currentBpm - startBpm;

  // 기간 필터
  const now      = new Date();
  const filtered = records.filter(r => {
    const diffDays = (now.getTime() - new Date(r.recordedAt).getTime()) / 86_400_000;
    if (period === '1m') return diffDays <= 30;
    if (period === '3m') return diffDays <= 90;
    return true;
  });
  const chartData = filtered.map(r => ({ label: fmtDate(r.recordedAt), bpm: r.bpm }));

  const PERIOD_TABS: { key: Period; label: string }[] = [
    { key: '1m', label: '1개월' }, { key: '3m', label: '3개월' }, { key: 'all', label: '전체' },
  ];

  const handleSaveTarget = async () => {
    const val = Number(targetInput);
    if (!songId || isNaN(val) || val < 20 || val > 300) return;
    setSavingTarget(true);
    try {
      const updated = await apiFetch<SongDetail>(`/bpm/songs/${songId}`, {
        method: 'PATCH',
        body: { targetBpm: val },
      });
      setBpmData(prev => prev ? { ...prev, song: updated } : prev);
      // sessData의 song도 업데이트
      setSessData(prev => prev ? { ...prev, song: updated } : prev);
      setShowTargetEdit(false);
    } catch { /* 무시 */ }
    finally { setSavingTarget(false); }
  };

  return (
    <PageLayout title="곡 상세" showBack>
      <div className="flex flex-col gap-4 pb-6">

        {/* ── 곡 헤더 ──────────────────────────────────────── */}
        <Card highlighted>
          <p className="text-xl font-bold text-slate-900">{song.title}</p>
          {song.artist && <p className="text-sm text-slate-400 mb-3">{song.artist}</p>}

          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-3 rounded-pill bg-primary-pale">
              <div
                className={`h-3 rounded-pill transition-all ${pct >= 100 ? 'bg-accent' : 'bg-primary'}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${pct >= 100 ? 'text-accent' : 'text-primary'}`}>
              {pct}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: '시작', value: startBpm },
              { label: '현재', value: currentBpm },
              { label: '목표', value: targetBpm },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-item p-2.5 text-center">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-400">BPM</p>
              </div>
            ))}
          </div>
          {gain > 0 && (
            <p className="text-xs text-center text-primary mt-2 font-medium">
              🎉 시작부터 +{gain} BPM 성장!
            </p>
          )}
        </Card>

        {/* ── 탭 전환 ──────────────────────────────────────── */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {([['bpm', '📈 BPM 성장'], ['sessions', '📋 연습 기록']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════
            BPM 성장 탭
        ════════════════════════════════════════════════════ */}
        {tab === 'bpm' && (
          <>
            {/* BPM 차트 */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-slate-800">BPM 성장 그래프</p>
                <div className="flex gap-1">
                  {PERIOD_TABS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setPeriod(key)}
                      className={[
                        'px-2.5 py-1 rounded-pill text-xs font-medium transition-all',
                        period === key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {chartData.length >= 2 ? (
                <>
                  <BpmChart data={chartData} targetBpm={targetBpm} />
                  <div className="flex items-center gap-3 mt-2 justify-end">
                    <div className="flex items-center gap-1">
                      <span className="w-4 h-0.5 bg-primary inline-block" />
                      <span className="text-xs text-slate-400">실제 BPM</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-4 h-0.5 border-t-2 border-dashed border-accent inline-block" />
                      <span className="text-xs text-slate-400">목표 BPM</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">
                  기록이 2개 이상 쌓이면 그래프가 표시됩니다
                </p>
              )}
            </Card>

            {/* BPM 이력 */}
            {records.length > 0 && (
              <Card>
                <p className="text-sm font-bold text-slate-800 mb-3">BPM 기록 이력</p>
                <div className="flex flex-col">
                  {[...records].reverse().map((r, i, arr) => (
                    <div key={i}>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-sm text-slate-500">{fmtDate(r.recordedAt)}</span>
                        <div className="flex items-center gap-2">
                          {i < arr.length - 1 && (
                            <span className={`text-xs font-medium ${
                              r.bpm > arr[i + 1].bpm ? 'text-primary' :
                              r.bpm < arr[i + 1].bpm ? 'text-red-400' : 'text-slate-400'
                            }`}>
                              {r.bpm > arr[i + 1].bpm ? `▲ +${r.bpm - arr[i + 1].bpm}` :
                               r.bpm < arr[i + 1].bpm ? `▼ ${r.bpm - arr[i + 1].bpm}` : ''}
                            </span>
                          )}
                          <span className="text-base font-bold text-slate-900">{r.bpm} BPM</span>
                        </div>
                      </div>
                      {i < arr.length - 1 && <CardDivider />}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 목표 BPM 수정 */}
            {showTargetEdit ? (
              <Card>
                <p className="text-sm font-bold text-slate-800 mb-3">목표 BPM 변경</p>
                <input
                  type="number"
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  placeholder={`현재 목표: ${targetBpm} BPM`}
                  className="w-full border border-slate-200 rounded-item px-3 py-2.5 text-sm focus:outline-none focus:border-primary mb-3"
                />
                <div className="flex gap-2">
                  <Button variant="secondary" fullWidth onClick={() => setShowTargetEdit(false)} disabled={savingTarget}>취소</Button>
                  <Button variant="primary" fullWidth loading={savingTarget} onClick={handleSaveTarget}>저장</Button>
                </div>
              </Card>
            ) : (
              <Button variant="secondary" fullWidth onClick={() => { setTargetInput(String(targetBpm)); setShowTargetEdit(true); }}>
                목표 BPM 수정
              </Button>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════
            연습 기록 탭
        ════════════════════════════════════════════════════ */}
        {tab === 'sessions' && (
          <>
            {sessLoading ? (
              <div className="flex flex-col gap-3 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
              </div>
            ) : sessData ? (
              <>
                {/* 총 통계 */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '총 연습 횟수', value: `${sessData.stats.sessionCount}회` },
                    { label: '총 연습 시간', value: `${sessData.stats.totalMinutes}분` },
                    {
                      label: 'BPM 변화',
                      value: sessData.stats.startBpm && sessData.stats.latestBpm
                        ? `+${sessData.stats.latestBpm - sessData.stats.startBpm}`
                        : '-',
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-primary-pale rounded-item p-3 text-center">
                      <p className="text-lg font-bold text-primary">{value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* 연습 시간 바 차트 */}
                {sessData.sessions.length > 1 && (
                  <Card>
                    <p className="text-sm font-bold text-slate-800 mb-3">연습 시간 추이</p>
                    <DurationBarChart sessions={sessData.sessions} />
                    <p className="text-xs text-slate-400 mt-2 text-right">총 {sessData.sessions.length}회</p>
                  </Card>
                )}

                {/* 세션 목록 */}
                {sessData.sessions.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">아직 연습 기록이 없어요</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {sessData.sessions.map((s) => (
                      <Card
                        key={s.id}
                        clickable
                        onClick={() => navigate(`/practice/${s.id}`)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400 mb-1">{fmtFull(s.practicedAt)}</p>
                            {s.practiceTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {s.practiceTypes.map(t => (
                                  <PracticeTypeBadge key={t} type={t} />
                                ))}
                              </div>
                            )}
                            {s.bpm && (
                              <p className="text-xs text-slate-500">
                                달성 BPM <strong className="text-slate-800">{s.bpm}</strong>
                                {song.targetBpm && (
                                  <span className="text-primary ml-1">
                                    ({Math.min(Math.round((s.bpm / song.targetBpm) * 100), 100)}%)
                                  </span>
                                )}
                              </p>
                            )}
                            {s.memos.length > 0 && (
                              <p className="text-xs text-slate-400 mt-1 truncate">
                                💬 {s.memos[0].content}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xl font-bold text-primary">{s.durationMinutes}</p>
                            <p className="text-xs text-slate-400">분</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">불러오는 중 오류가 발생했어요</p>
            )}
          </>
        )}

      </div>
    </PageLayout>
  );
}
