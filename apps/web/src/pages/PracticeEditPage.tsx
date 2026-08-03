import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams }      from 'react-router-dom';
import { PageLayout }                  from '../components/ui/PageLayout';
import { Button }                      from '../components/ui/Button';
import { TextField, TextArea }         from '../components/ui/Input';
import { Card }                        from '../components/ui/Card';
import { SongSelector, type SongOption } from '../components/ui/SongSelector';
import { usePracticeSessions, type PracticeType } from '../hooks/usePracticeSessions';

const INSTRUMENTS = ['기타', '베이스', '피아노', '드럼', '바이올린', '보컬', '기타(직접입력)'];
const PRACTICE_TYPES: { key: PracticeType; label: string }[] = [
  { key: 'BASIC',         label: '기초 연습' },
  { key: 'SONG',          label: '곡 연습' },
  { key: 'IMPROVISATION', label: '즉흥 연주' },
  { key: 'THEORY',        label: '이론 학습' },
];

function toDateStr(isoString: string) {
  const d = new Date(isoString);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function PracticeEditPage() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { getSession, updateSession } = usePracticeSessions();

  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState<string | null>(null);

  // 폼 상태
  const [date, setDate]             = useState('');
  const [duration, setDuration]     = useState(30);
  const [instrument, setInstrument] = useState('기타');
  const [song, setSong]             = useState('');
  const [artist, setArtist]         = useState('');
  const [bpm, setBpm]               = useState('');
  const [targetBpm, setTargetBpm]   = useState('');
  const [types, setTypes]           = useState<PracticeType[]>([]);
  const [memo, setMemo]             = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  // 탭 템포
  const tapTimesRef    = useRef<number[]>([]);
  const [tapCount, setTapCount] = useState(0);

  // 기존 데이터 로드
  useEffect(() => {
    if (!id) return;
    getSession(id)
      .then((rec) => {
        setDate(toDateStr(rec.practicedAt));
        setDuration(rec.durationMinutes);
        setInstrument(rec.instrumentName ?? '기타');
        setSong(rec.songTitle ?? '');
        setArtist(rec.artist ?? '');
        setBpm(rec.bpm ? String(rec.bpm) : '');
        setTargetBpm(rec.targetBpm ? String(rec.targetBpm) : '');
        setTypes(rec.practiceTypes);
        setMemo(rec.memos[0]?.content ?? '');
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [id, getSession]);

  const handleTap = () => {
    const now    = Date.now();
    const recent = tapTimesRef.current.filter(t => now - t < 2500);
    recent.push(now);
    tapTimesRef.current = recent.slice(-8);
    setTapCount(recent.length);
    if (recent.length >= 2) {
      let sum = 0;
      for (let i = 1; i < recent.length; i++) sum += recent[i] - recent[i - 1];
      const avg = sum / (recent.length - 1);
      setBpm(String(Math.min(220, Math.max(40, Math.round(60000 / avg)))));
    }
  };

  const toggleType = (key: PracticeType) => {
    setTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
    );
  };

  const handleSave = async () => {
    if (!id || !date || duration < 5) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateSession(id, {
        practicedAt:     date,
        durationMinutes: duration,
        instrumentName:  instrument || undefined,
        songTitle:       song || undefined,
        artist:          artist || undefined,
        bpm:             bpm ? Number(bpm) : undefined,
        targetBpm:       targetBpm ? Number(targetBpm) : undefined,
        practiceTypes:   types,
        memo:            memo || undefined,
      });
      navigate(`/practice/${id}`, { replace: true });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장에 실패했습니다.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="연습 기록 수정" showBack hasTabBar={false}>
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-12 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-12 bg-slate-100 rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (loadError) {
    return (
      <PageLayout title="연습 기록 수정" showBack hasTabBar={false}>
        <p className="text-center text-slate-400 py-12">{loadError}</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="연습 기록 수정" showBack hasTabBar={false}>
      <div className="flex flex-col gap-5 pb-6">

        {/* ── 날짜 ─────────────────────────────────────────── */}
        <TextField
          label="연습 날짜"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {/* ── 연습 시간 슬라이더 ─────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">연습 시간</label>
            <span className="text-md font-bold text-primary">{duration}분</span>
          </div>
          <input
            type="range"
            min={5}
            max={360}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-primary h-2 rounded-pill cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>5분</span><span>1시간</span><span>2시간</span><span>6시간</span>
          </div>
        </div>

        {/* ── 악기 선택 ────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">악기</label>
          <div className="flex flex-wrap gap-2">
            {INSTRUMENTS.map((inst) => (
              <button
                key={inst}
                onClick={() => setInstrument(inst)}
                className={[
                  'px-3 py-1.5 rounded-pill text-sm font-medium transition-all',
                  instrument === inst
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-600 active:bg-slate-200',
                ].join(' ')}
              >
                {inst}
              </button>
            ))}
          </div>
        </div>

        {/* ── 연습 곡 ──────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">연습 곡 (선택)</label>
          <SongSelector
            value={song}
            onChange={setSong}
            onSelect={(s: SongOption) => {
              setSong(s.title);
              setArtist(s.artist ?? '');
              if (s.targetBpm) setTargetBpm(String(s.targetBpm));
            }}
          />
          {song && (
            <TextField
              label=""
              placeholder="아티스트 (선택)"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
            />
          )}
        </div>

        {/* ── BPM ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">BPM (선택)</label>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">달성 BPM</span>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="오늘 연주한 템포 (예: 84)"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                className="flex-1 px-4 py-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onPointerDown={handleTap}
                className="px-4 py-3.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium whitespace-nowrap active:bg-primary active:text-white transition-colors select-none"
              >
                👆 {tapCount >= 2 ? `${bpm} BPM` : '탭 템포'}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">목표 BPM</span>
            <input
              type="number"
              placeholder="이 곡의 최종 목표 템포 (예: 120)"
              value={targetBpm}
              onChange={(e) => setTargetBpm(e.target.value)}
              className="px-4 py-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* ── 연습 유형 ─────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">연습 유형 (선택, 복수 가능)</label>
          <div className="grid grid-cols-2 gap-2">
            {PRACTICE_TYPES.map(({ key, label }) => {
              const selected = types.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleType(key)}
                  className={[
                    'py-2.5 rounded-item text-sm font-medium transition-all text-center',
                    selected
                      ? 'bg-primary-pale text-primary border border-primary/30'
                      : 'bg-slate-100 text-slate-600 border border-transparent',
                  ].join(' ')}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 메모 ─────────────────────────────────────────── */}
        <TextArea
          label="메모 (선택)"
          placeholder="오늘 연습에서 느낀 점, 개선할 부분 등을 기록해보세요"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={1000}
          showCount
        />

        {saveError && (
          <p className="text-sm text-red-500 text-center">{saveError}</p>
        )}

        <Card padding="none" className="sticky bottom-4">
          <Button
            variant="primary"
            fullWidth
            size="lg"
            loading={saving}
            onClick={handleSave}
            disabled={duration < 5}
          >
            수정 내용 저장
          </Button>
        </Card>
      </div>
    </PageLayout>
  );
}
