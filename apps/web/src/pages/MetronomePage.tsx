import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/ui/PageLayout';

const MIN_BPM = 40;
const MAX_BPM = 220;

type TimeSig = 2 | 3 | 4;

/** subdivision 값 → 박자 안에 클릭 수
 *  1 = 4분음표, 2 = 8분음표, 3 = 셋잇단음표, 4 = 16분음표 */
type Subdivision = 1 | 2 | 3 | 4;

const SUBDIVISION_LABELS: { value: Subdivision; label: string; desc: string }[] = [
  { value: 1, label: '♩',   desc: '4분' },
  { value: 2, label: '♪♪',  desc: '8분' },
  { value: 3, label: '♪♪♪', desc: '셋잇단' },
  { value: 4, label: '𝅘𝅥𝅯𝅘𝅥𝅯𝅘𝅥𝅯𝅘𝅥𝅯', desc: '16분' },
];

/** Web Audio API 기반 메트로놈 */
export function MetronomePage() {
  const navigate = useNavigate();

  const [bpm,         setBpm]         = useState(120);
  const [timeSig,     setTimeSig]     = useState<TimeSig>(4);
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [playing,     setPlaying]     = useState(false);

  // 시각 피드백용 — 현재 박자 / 세부박자
  const [beat,    setBeat]    = useState(-1); // 0 ~ timeSig-1, -1 = 정지
  const [subBeat, setSubBeat] = useState(-1); // 0 ~ subdivision-1

  // 스케줄러 내부에서 참조할 최신 값
  const bpmRef         = useRef(bpm);
  const timeSigRef     = useRef(timeSig);
  const subdivisionRef = useRef(subdivision);
  const beatIdxRef     = useRef(0);
  const subIdxRef      = useRef(0);
  const nextTimeRef    = useRef(0);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctxRef         = useRef<AudioContext | null>(null);

  useEffect(() => { bpmRef.current = bpm; },             [bpm]);
  useEffect(() => { timeSigRef.current = timeSig; },     [timeSig]);
  useEffect(() => { subdivisionRef.current = subdivision; }, [subdivision]);

  // ── 단일 클릭음 스케줄 ─────────────────────────────────────
  const scheduleClick = useCallback(
    (beatIdx: number, subIdx: number, time: number) => {
      const ctx  = ctxRef.current!;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';

      // 소리 계층: 강박(beat1) > 약박 > 세부박자
      if (subIdx === 0) {
        osc.frequency.value = beatIdx === 0 ? 1050 : 820;
        gain.gain.setValueAtTime(beatIdx === 0 ? 0.9 : 0.55, time);
      } else {
        osc.frequency.value = 600;
        gain.gain.setValueAtTime(0.28, time);
      }

      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
      osc.start(time);
      osc.stop(time + 0.055);

      // 시각 업데이트 — 오디오 시각에 동기
      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
      setTimeout(() => {
        setBeat(beatIdx);
        setSubBeat(subIdx);
      }, delayMs);
    },
    [],
  );

  // ── lookahead 스케줄러 (25ms poll, 100ms 선점) ─────────────
  const scheduler = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const LOOKAHEAD = 0.1;
    const subDiv  = subdivisionRef.current;
    const interval = 60 / bpmRef.current / subDiv; // 세부박자 간격(초)

    while (nextTimeRef.current < ctx.currentTime + LOOKAHEAD) {
      scheduleClick(beatIdxRef.current, subIdxRef.current, nextTimeRef.current);
      nextTimeRef.current += interval;
      subIdxRef.current    = (subIdxRef.current + 1) % subDiv;
      if (subIdxRef.current === 0) {
        beatIdxRef.current = (beatIdxRef.current + 1) % timeSigRef.current;
      }
    }
  }, [scheduleClick]);

  // ── 시작 / 정지 ────────────────────────────────────────────
  const start = useCallback(() => {
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === 'suspended') ctx.resume();

    beatIdxRef.current  = 0;
    subIdxRef.current   = 0;
    nextTimeRef.current = ctx.currentTime + 0.05;
    timerRef.current    = setInterval(scheduler, 25);
    setPlaying(true);
  }, [scheduler]);

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setPlaying(false);
    setBeat(-1);
    setSubBeat(-1);
  }, []);

  const handleTimeSig = (s: TimeSig) => { stop(); setTimeSig(s); };
  const handleSubdivision = (s: Subdivision) => { stop(); setSubdivision(s); };

  useEffect(() => () => { stop(); ctxRef.current?.close(); }, [stop]);

  const changeBpm = (d: number) =>
    setBpm(p => Math.min(MAX_BPM, Math.max(MIN_BPM, p + d)));

  // ── 탭 템포 ─────────────────────────────────────────────────
  const tapTimesRef = useRef<number[]>([]);
  const handleTap = () => {
    const now    = Date.now();
    const recent = tapTimesRef.current.filter(t => now - t < 2500);
    recent.push(now);
    tapTimesRef.current = recent.slice(-8);
    if (recent.length >= 2) {
      let sum = 0;
      for (let i = 1; i < recent.length; i++) sum += recent[i] - recent[i - 1];
      setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(60000 / (sum / (recent.length - 1))))));
    }
  };

  return (
    <PageLayout title="메트로놈" showBack hasTabBar={false}>
      <div className="flex flex-col items-center gap-6 pt-4 pb-10">

        {/* ── 박자 도트 (메인 비트) ─────────────────────────── */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-3 h-6 items-center">
            {Array.from({ length: timeSig }, (_, i) => (
              <div
                key={i}
                className={[
                  'rounded-full transition-all duration-75',
                  beat === i && playing
                    ? i === 0
                      ? 'w-5 h-5 bg-accent shadow-lg shadow-accent/40'
                      : 'w-4 h-4 bg-primary shadow-md shadow-primary/30'
                    : 'w-3 h-3 bg-slate-200',
                ].join(' ')}
              />
            ))}
          </div>

          {/* 세부박자 도트 (subdivision > 1 일 때만) */}
          {subdivision > 1 && (
            <div className="flex gap-1.5 h-3 items-center">
              {Array.from({ length: subdivision }, (_, i) => (
                <div
                  key={i}
                  className={[
                    'rounded-full transition-all duration-75',
                    subBeat === i && playing
                      ? 'w-2.5 h-2.5 bg-slate-500'
                      : 'w-1.5 h-1.5 bg-slate-200',
                  ].join(' ')}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── BPM 숫자 ──────────────────────────────────────── */}
        <div className="text-center select-none">
          <p className="text-8xl font-bold text-slate-900 tabular-nums leading-none">{bpm}</p>
          <p className="text-slate-400 mt-2 text-base">BPM</p>
        </div>

        {/* ── BPM 조절 ──────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {[-10, -1, +1, +10].map(d => (
            <button
              key={d}
              onClick={() => changeBpm(d)}
              className="w-[52px] h-[52px] rounded-full bg-slate-100 text-slate-600 font-semibold text-sm active:bg-slate-200 transition-colors"
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>

        {/* ── 슬라이더 ──────────────────────────────────────── */}
        <div className="w-full px-2">
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={e => setBpm(Number(e.target.value))}
            className="w-full accent-primary h-2 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{MIN_BPM}</span><span>{MAX_BPM}</span>
          </div>
        </div>

        {/* ── 박자 선택 ─────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2 w-full">
          <span className="text-sm font-medium text-slate-600">박자</span>
          <div className="flex gap-2">
            {([2, 3, 4] as TimeSig[]).map(s => (
              <button
                key={s}
                onClick={() => handleTimeSig(s)}
                className={[
                  'px-6 py-2 rounded-full text-sm font-semibold transition-all',
                  timeSig === s
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 active:bg-slate-200',
                ].join(' ')}
              >
                {s}/4
              </button>
            ))}
          </div>
        </div>

        {/* ── 세부박자 선택 ─────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2 w-full">
          <span className="text-sm font-medium text-slate-600">세부박자</span>
          <div className="flex gap-2 flex-wrap justify-center">
            {SUBDIVISION_LABELS.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => handleSubdivision(value)}
                className={[
                  'flex flex-col items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all min-w-[68px]',
                  subdivision === value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 active:bg-slate-200',
                ].join(' ')}
              >
                <span className="text-base leading-tight">{label}</span>
                <span className="text-xs mt-0.5 font-medium opacity-80">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 탭 템포 ───────────────────────────────────────── */}
        <button
          onPointerDown={handleTap}
          className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold text-base active:bg-slate-200 transition-colors select-none"
        >
          👆 탭 템포
        </button>

        {/* ── 시작 / 정지 ───────────────────────────────────── */}
        <button
          onClick={playing ? stop : start}
          className={[
            'w-24 h-24 rounded-full text-white text-4xl shadow-xl transition-all active:scale-95',
            playing ? 'bg-red-500 shadow-red-200' : 'bg-primary shadow-primary/30',
          ].join(' ')}
        >
          {playing ? '⏹' : '▶'}
        </button>

        {/* ── 연습 기록 연동 ────────────────────────────────── */}
        <button
          onClick={() => navigate('/practice/new', { state: { bpm } })}
          className="text-sm text-primary font-semibold underline underline-offset-2 active:opacity-60"
        >
          이 BPM으로 연습 기록하기 →
        </button>

      </div>
    </PageLayout>
  );
}
