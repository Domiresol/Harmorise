import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

interface InstrumentOption { id: string; name: string; }

export function OnboardingPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [nickname, setNickname]         = useState('');
  const [instrumentId, setInstrumentId] = useState<string | null>(null);
  const [instruments, setInstruments]   = useState<InstrumentOption[]>([]);
  const [dailyGoal, setDailyGoal]       = useState(30);
  const [bio, setBio]                   = useState('');
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    apiFetch<InstrumentOption[]>('/users/instruments')
      .then(setInstruments)
      .catch(() => {});
  }, []);

  const handleFinish = async () => {
    if (!nickname.trim()) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch('/users/me', {
        method: 'PATCH',
        body: {
          nickname: nickname.trim(),
          ...(bio.trim() && { bio: bio.trim() }),
          dailyGoalMinutes: dailyGoal,
          ...(instrumentId && { mainInstrumentId: instrumentId }),
        },
      });
      nav('/home', { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장에 실패했어요. 다시 시도해주세요.');
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-6">
      {/* 헤더 */}
      <div className="pt-14 pb-6">
        <p className="text-sm text-sky-500 font-semibold mb-1">시작하기</p>
        <h1 className="text-2xl font-bold text-slate-800">
          {step === 1 ? '어떤 악기를 연습하나요?' : '나를 소개해요'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {step === 1 ? '주로 연습하는 악기를 선택해주세요.' : '닉네임과 목표를 설정해주세요.'}
        </p>
        {/* 진행 바 */}
        <div className="flex gap-2 mt-5">
          {[1, 2].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-sky-500' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>

      {/* STEP 1: 악기 선택 */}
      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-3 gap-3 mb-6">
            {instruments.length === 0 && (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="py-4 rounded-2xl bg-slate-100 animate-pulse" />
              ))
            )}
            {instruments.map(ins => (
              <button
                key={ins.id}
                onClick={() => setInstrumentId(prev => prev === ins.id ? null : ins.id)}
                className={[
                  'py-4 rounded-2xl border-2 text-sm font-medium transition-all',
                  instrumentId === ins.id
                    ? 'border-sky-500 bg-sky-50 text-sky-600'
                    : 'border-slate-200 text-slate-600 active:bg-slate-50',
                ].join(' ')}
              >
                {ins.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full py-4 bg-sky-500 text-white rounded-2xl font-semibold text-base disabled:opacity-30 mt-auto mb-8"
          >
            다음
          </button>
        </div>
      )}

      {/* STEP 2: 닉네임 / 목표 / 자기소개 */}
      {step === 2 && (
        <div className="flex-1 flex flex-col gap-5">
          {/* 닉네임 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">닉네임 *</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value.slice(0, 30))}
              placeholder="표시될 이름을 입력해주세요"
              className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{nickname.length}/30</p>
          </div>

          {/* 일일 목표 */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <label className="font-medium text-slate-700">일일 연습 목표</label>
              <span className="font-bold text-sky-500">{dailyGoal}분</span>
            </div>
            <input
              type="range" min={15} max={240} step={15}
              value={dailyGoal}
              onChange={e => setDailyGoal(Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="flex justify-between text-xs text-slate-300 mt-0.5">
              <span>15분</span><span>4시간</span>
            </div>
          </div>

          {/* 자기소개 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">자기소개 <span className="text-slate-400 font-normal">(선택)</span></label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, 150))}
              placeholder="간단히 나를 소개해주세요"
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 resize-none"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{bio.length}/150</p>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

          <button
            onClick={handleFinish}
            disabled={!nickname.trim() || saving}
            className="w-full py-4 bg-sky-500 text-white rounded-2xl font-semibold text-base disabled:opacity-50 mt-auto mb-8"
          >
            {saving ? '저장 중...' : '시작하기 🎵'}
          </button>
        </div>
      )}
    </div>
  );
}
