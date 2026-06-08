import { useState, useRef }        from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageLayout }              from '../components/ui/PageLayout';
import { Button }                  from '../components/ui/Button';
import { TextField, TextArea }     from '../components/ui/Input';
import { Card }                    from '../components/ui/Card';
import { SongSelector, type SongOption } from '../components/ui/SongSelector';
import { usePracticeSessions, type PracticeType } from '../hooks/usePracticeSessions';

const INSTRUMENTS = ['기타', '베이스', '피아노', '드럼', '바이올린', '보컬', '기타(직접입력)'];
const PRACTICE_TYPES: { key: PracticeType; label: string }[] = [
  { key: 'BASIC',         label: '기초 연습' },
  { key: 'SONG',          label: '곡 연습' },
  { key: 'IMPROVISATION', label: '즉흥 연주' },
  { key: 'THEORY',        label: '이론 학습' },
];

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function PracticeNewPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { createSession } = usePracticeSessions();

  // 메트로놈에서 넘어온 BPM 자동 주입
  const initBpm = (location.state as { bpm?: number } | null)?.bpm;

  const [date, setDate]             = useState(formatDate(new Date()));
  const [duration, setDuration]     = useState(30);
  const [instrument, setInstrument] = useState('기타');
  const [song, setSong]             = useState('');
  const [artist, setArtist]         = useState('');
  const [bpm, setBpm]               = useState(initBpm ? String(initBpm) : '');
  const [targetBpm, setTargetBpm]   = useState('');
  const [types, setTypes]           = useState<PracticeType[]>([]);
  const [memo, setMemo]             = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  // ── 탭 템포 ──────────────────────────────────────────────────
  const tapTimesRef    = useRef<number[]>([]);
  const [tapCount, setTapCount] = useState(0);

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
    if (!date || duration < 5) return;
    setSaving(true);
    setSaveError(null);
    try {
      await createSession({
        practicedAt:     date,
        durationMinutes: duration,
        instrumentName:  instrument || undefined,
        songTitle:       song || undefined,
        artist:          artist || undefined,
        bpm:             bpm ? Number(bpm) : undefined,
        targetBpm:       targetBpm ? Number(targetBpm) : undefined,
        practiceTypes:   types.length > 0 ? types : undefined,
        memo:            memo || undefined,
      });
      navigate('/practice');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장에 실패했습니다.');
      setSaving(false);
    }
  };

  return (
    <PageLayout title="연습 기록" showBack hasTabBar={false}>
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
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">BPM (선택)</label>
            <button
              type="button"
              onClick={() => navigate('/metronome')}
              className="text-xs text-primary font-medium active:opacity-60"
            >
              🎵 메트로놈 열기
            </button>
          </div>
          {/* 달성 BPM + 탭 템포 */}
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
          {/* 목표 BPM */}
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
          <p className="text-xs text-slate-400">
            {initBpm ? `메트로놈에서 ${initBpm} BPM 불러옴 · ` : ''}
            달성 BPM은 오늘 연주한 템포, 목표 BPM은 이 곡의 최종 목표예요
          </p>
        </div>

        {/* ── 연습 유형 멀티셀렉트 ─────────────────────────── */}
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

        {/* ── 저장 에러 ─────────────────────────────────────── */}
        {saveError && (
          <p className="text-sm text-red-500 text-center">{saveError}</p>
        )}

        {/* ── 저장 버튼 ─────────────────────────────────────── */}
        <Card padding="none" className="sticky bottom-4">
          <Button
            variant="primary"
            fullWidth
            size="lg"
            loading={saving}
            onClick={handleSave}
            disabled={duration < 1}
          >
            연습 기록 저장
          </Button>
        </Card>

      </div>
    </PageLayout>
  );
}
