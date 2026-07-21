import { useState, useRef, useEffect, useCallback } from 'react';
import { PageLayout } from '../components/ui/PageLayout';

// ── 음악 상수 ─────────────────────────────────────────────────
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const INSTRUMENTS = {
  기타:    ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  베이스:  ['E1', 'A1', 'D2', 'G2'],
  우쿨렐레: ['G4', 'C4', 'E4', 'A4'],
} as const;

type Instrument = keyof typeof INSTRUMENTS;

interface DetectedNote {
  note:   string;
  octave: number;
  cents:  number;   // -50 ~ +50
  freq:   number;
}

// ── 피치 감지 (자기상관법) ────────────────────────────────────
function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const n = buffer.length;

  // RMS — 너무 조용하면 감지 안 함
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buffer[i] * buffer[i];
  if (Math.sqrt(rms / n) < 0.008) return -1;

  // 무음 구간 잘라내기
  let lo = 0, hi = n - 1;
  for (let i = 0; i < n / 2; i++) { if (Math.abs(buffer[i]) > 0.15) { lo = i; break; } }
  for (let i = 1; i < n / 2; i++) { if (Math.abs(buffer[n - i]) > 0.15) { hi = n - i; break; } }

  const buf = buffer.slice(lo, hi + 1);
  const len = buf.length;

  // 자기상관 계산
  const c = new Float32Array(len);
  for (let lag = 0; lag < len; lag++) {
    for (let j = 0; j < len - lag; j++) c[lag] += buf[j] * buf[j + lag];
  }

  // 첫 번째 하강 이후 최대 피크 탐색
  let d = 0;
  while (d < len - 1 && c[d] >= c[d + 1]) d++;
  let maxVal = -1, maxPos = -1;
  for (let i = d; i < len; i++) {
    if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
  }
  if (maxPos < 1 || maxPos >= len - 1) return -1;

  // 포물선 보간 (서브샘플 정확도)
  const prev = c[maxPos - 1], cur = c[maxPos], next = c[maxPos + 1];
  const a2 = (prev + next - 2 * cur) / 2;
  const b2 = (next - prev) / 2;
  const peak = a2 !== 0 ? maxPos - b2 / (2 * a2) : maxPos;

  return sampleRate / peak;
}

// ── 주파수 → 음명 변환 ────────────────────────────────────────
function freqToNote(freq: number): DetectedNote {
  // MIDI 노트 번호: A4(440Hz) = 69
  const noteNum = 12 * Math.log2(freq / 440) + 69;
  const midi    = Math.round(noteNum);
  const cents   = Math.round((noteNum - midi) * 100);

  const noteIndex = ((midi % 12) + 12) % 12;
  const octave    = Math.floor(midi / 12) - 1;

  return { note: NOTE_NAMES[noteIndex], octave, cents, freq };
}

// ── 컴포넌트 ──────────────────────────────────────────────────
export function TunerPage() {
  const [instrument, setInstrument] = useState<Instrument>('기타');
  const [detected,   setDetected]   = useState<DetectedNote | null>(null);
  const [listening,  setListening]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const ctxRef       = useRef<AudioContext | null>(null);
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const rafRef       = useRef<number | null>(null);
  const lastTickRef  = useRef<number>(0);

  // ── 분석 루프 (0.3초 간격 throttle) ──────────────────────
  const analyse = useCallback(() => {
    if (!analyserRef.current || !ctxRef.current) return;

    const now = performance.now();
    if (now - lastTickRef.current >= 100) {
      lastTickRef.current = now;

      const buf = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(buf);

      const freq = autoCorrelate(buf, ctxRef.current.sampleRate);
      if (freq > 30 && freq < 2100) {
        setDetected(freqToNote(freq));
      }
    }

    rafRef.current = requestAnimationFrame(analyse);
  }, []);

  // ── 마이크 시작 ───────────────────────────────────────────
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const ctx     = new AudioContext();
      ctxRef.current = ctx;

      const analyser  = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      ctx.createMediaStreamSource(stream).connect(analyser);

      setListening(true);
      setError(null);
      rafRef.current = requestAnimationFrame(analyse);
    } catch {
      setError('마이크 접근 권한이 필요합니다. 브라우저 설정에서 허용해주세요.');
    }
  };

  // ── 마이크 정지 ───────────────────────────────────────────
  const stop = useCallback(() => {
    if (rafRef.current)  cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    ctxRef.current?.close();
    ctxRef.current    = null;
    analyserRef.current = null;
    streamRef.current = null;
    setListening(false);
    setDetected(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  // ── 튜닝 상태 ─────────────────────────────────────────────
  const absCents = detected ? Math.abs(detected.cents) : 99;
  const tuneStatus =
    !listening           ? '마이크를 켜서 튜닝을 시작하세요' :
    !detected            ? '소리를 감지하는 중...' :
    absCents <= 3        ? '✓ 완벽해요!' :
    absCents <= 10
      ? (detected.cents > 0 ? '♯ 조금 높아요' : '♭ 조금 낮아요')
      : (detected.cents > 0 ? '♯ 많이 높아요' : '♭ 많이 낮아요');

  const noteColor =
    !detected        ? 'text-slate-200' :
    absCents <= 3    ? 'text-green-500' :
    absCents <= 10   ? 'text-yellow-500' :
    'text-red-500';

  const needleColor =
    !detected        ? 'bg-slate-300' :
    absCents <= 3    ? 'bg-green-500' :
    absCents <= 10   ? 'bg-yellow-400' :
    'bg-red-500';

  // 바늘 위치: cents -50 → 0%, 0 → 50%, +50 → 100%
  const needleLeft = detected
    ? Math.max(2, Math.min(98, 50 + (detected.cents / 50) * 48))
    : 50;

  return (
    <PageLayout title="튜너" showBack hasTabBar={false}>
      <div className="flex flex-col items-center gap-6 pt-4 pb-10">

        {/* ── 악기 선택 ──────────────────────────────────────── */}
        <div className="flex gap-2">
          {(Object.keys(INSTRUMENTS) as Instrument[]).map(inst => (
            <button
              key={inst}
              onClick={() => setInstrument(inst)}
              className={[
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                instrument === inst
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 active:bg-slate-200',
              ].join(' ')}
            >
              {inst}
            </button>
          ))}
        </div>

        {/* ── 개방현 안내 ────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap justify-center">
          {INSTRUMENTS[instrument].map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center bg-white border border-slate-200 rounded-xl px-3 py-2 min-w-[46px] shadow-sm"
            >
              <span className="text-xs text-slate-400">{i + 1}번</span>
              <span className="text-base font-bold text-slate-800">{s.replace(/\d+/, '')}</span>
              <span className="text-xs text-slate-400">{s.match(/\d+/)?.[0]}</span>
            </div>
          ))}
        </div>

        {/* ── 메인 음명 표시 ─────────────────────────────────── */}
        <div className="flex flex-col items-center my-4 gap-1">
          <div className={`text-[96px] font-bold leading-none transition-colors duration-100 ${noteColor}`}>
            {detected?.note ?? '–'}
          </div>
          <div className="text-slate-400 text-lg h-7">
            {detected ? `${detected.octave}옥타브` : ''}
          </div>
          <div className="text-slate-400 text-sm h-5">
            {detected ? `${detected.freq.toFixed(1)} Hz` : ''}
          </div>
        </div>

        {/* ── 센트 게이지 ────────────────────────────────────── */}
        <div className="w-full px-4">
          <div className="relative h-6 flex items-center">
            {/* 트랙 */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full relative">
              {/* 중앙 마크 */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-0.5 h-4 bg-slate-400 rounded-full" />
              {/* 바늘 */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow transition-all duration-75 ${needleColor}`}
                style={{ left: `calc(${needleLeft}% - 8px)` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2 px-0.5">
            <span>-50¢</span>
            <span className={`font-bold tabular-nums ${noteColor}`}>
              {detected
                ? `${detected.cents >= 0 ? '+' : ''}${detected.cents}¢`
                : '0¢'}
            </span>
            <span>+50¢</span>
          </div>
        </div>

        {/* ── 상태 메시지 ────────────────────────────────────── */}
        <p className="text-sm text-slate-400 text-center h-5">{tuneStatus}</p>

        {/* ── 에러 ───────────────────────────────────────────── */}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl text-center w-full">
            {error}
          </p>
        )}

        {/* ── 마이크 시작/정지 ───────────────────────────────── */}
        <button
          onClick={listening ? stop : start}
          className={[
            'w-24 h-24 rounded-full text-white text-4xl shadow-xl transition-all active:scale-95',
            listening
              ? 'bg-red-500 shadow-red-200'
              : 'bg-primary shadow-primary/30',
          ].join(' ')}
        >
          {listening ? '⏹' : '🎙'}
        </button>

        <p className="text-xs text-slate-300 text-center">
          {listening ? '정지하려면 버튼을 누르세요' : '버튼을 눌러 마이크를 활성화하세요'}
        </p>

      </div>
    </PageLayout>
  );
}
