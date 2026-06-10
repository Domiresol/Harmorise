import { useState, useEffect } from 'react';
import { PageLayout }        from '../components/ui/PageLayout';
import { Card, CardDivider } from '../components/ui/Card';
import { Button }            from '../components/ui/Button';
import { apiFetch }          from '../lib/api';

interface InstrumentOption { id: string; name: string; category: string | null; }

// 표시용 전체 악기 목록 (항상 이 목록을 렌더링, API로 실제 ID 매칭)
const ALL_INSTRUMENT_NAMES: Array<{ name: string; category: string | null }> = [
  { name: '기타',     category: '현악기' },
  { name: '베이스',   category: '현악기' },
  { name: '드럼',     category: '타악기' },
  { name: '피아노',   category: '건반' },
  { name: '키보드',   category: '건반' },
  { name: '보컬',     category: '보컬' },
  { name: '바이올린', category: '현악기' },
  { name: '첼로',     category: '현악기' },
  { name: '우쿨렐레', category: '현악기' },
  { name: '플루트',   category: '관악기' },
  { name: '색소폰',   category: '관악기' },
  { name: '트럼펫',   category: '관악기' },
];

interface ProfileData {
  profile: {
    nickname:          string;
    handle:            string;
    bio:               string | null;
    dailyGoalMinutes:  number;
    weeklyGoalMinutes: number;
    nicknameChangedAt: string | null;
    mainInstrumentId:  string | null;
  } | null;
}

export function ProfileSettingsPage() {
  const [nickname,        setNickname]        = useState('');
  const [handle,          setHandle]          = useState('');
  const [bio,             setBio]             = useState('');
  const [dailyGoal,     setDailyGoal]     = useState(30);
  const [weeklyGoalDays, setWeeklyGoalDays] = useState(5); // 1~7일 — 일일목표와 독립
  // 선택 상태는 이름 기반 — API/DB 연결 여부에 무관하게 항상 토글 가능
  const [selectedName, setSelectedName] = useState<string | null>(null);
  // 저장 시 ID 조회용: name → id 맵 (API 성공 시 채워짐)
  const [idByName, setIdByName] = useState<Map<string, string>>(new Map());
  // 항상 ALL_INSTRUMENT_NAMES 로 초기화 (id는 API 로드 후 채워짐)
  const [instruments] = useState<InstrumentOption[]>(
    ALL_INSTRUMENT_NAMES.map(i => ({ ...i, id: '' })),
  );
  const [loading, setLoading] = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [error,           setError]           = useState('');

  // 닉네임 변경 가능 여부 (30일 제한)
  const [canChangeNickname, setCanChangeNickname] = useState(true);
  const [nicknameDaysLeft,  setNicknameDaysLeft]  = useState(0);

  useEffect(() => {
    // 프로필과 악기 목록을 독립적으로 fetch — 악기 실패가 프로필 폼을 막지 않음
    let profileInstrumentId: string | null = null;

    const loadProfile = apiFetch<ProfileData>('/users/me').then((userData) => {
      const p = userData.profile;
      if (p) {
        setNickname(p.nickname);
        setHandle(p.handle ?? '');
        setBio(p.bio ?? '');
        setDailyGoal(p.dailyGoalMinutes);
        // 주간목표는 일수로 환산 (로드 시 1회만, 이후 두 슬라이더는 독립)
        setWeeklyGoalDays(Math.max(1, Math.min(7, Math.round(p.weeklyGoalMinutes / p.dailyGoalMinutes))));
        profileInstrumentId = p.mainInstrumentId ?? null;
        if (p.nicknameChangedAt) {
          const days = (Date.now() - new Date(p.nicknameChangedAt).getTime()) / 86_400_000;
          if (days < 30) {
            setCanChangeNickname(false);
            setNicknameDaysLeft(Math.ceil(30 - days));
          }
        }
      }
    });

    const loadInstruments = apiFetch<InstrumentOption[]>('/users/instruments')
      .then((apiData) => {
        setIdByName(new Map(apiData.map(i => [i.name, i.id])));
        return apiData;
      })
      .catch(() => [] as InstrumentOption[]);

    // 둘 다 완료된 뒤 선택 악기를 이름으로 역매핑
    Promise.all([loadProfile, loadInstruments]).then(([, apiData]) => {
      if (profileInstrumentId && apiData.length > 0) {
        const matched = apiData.find(i => i.id === profileInstrumentId);
        if (matched) setSelectedName(matched.name);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await apiFetch('/users/me', {
        method: 'PATCH',
        body: {
          nickname:          nickname.trim(),
          handle:            handle.trim(),
          bio:               bio.trim() || null,
          dailyGoalMinutes:  dailyGoal,
          weeklyGoalMinutes: weeklyGoalDays * dailyGoal,
          // 선택된 악기 이름으로 ID 조회 — API 연결 시에만 저장
          ...(selectedName !== null && idByName.has(selectedName)
            ? { mainInstrumentId: idByName.get(selectedName) }
            : selectedName === null
              ? { mainInstrumentId: null }
              : {}),
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="프로필 설정" showBack>
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-40 bg-slate-100 rounded-2xl" />
          <div className="h-32 bg-slate-100 rounded-2xl" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="프로필 설정" showBack>
      <div className="flex flex-col gap-4 pb-24">

        {/* 기본 정보 */}
        <Card>
          <p className="text-sm font-bold text-slate-800 mb-3">기본 정보</p>

          {/* 닉네임 */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-slate-500 font-medium">닉네임</label>
              {!canChangeNickname && (
                <span className="text-xs text-slate-400">{nicknameDaysLeft}일 후 변경 가능</span>
              )}
            </div>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value.slice(0, 30))}
              disabled={!canChangeNickname}
              className="w-full border border-slate-200 rounded-item px-3 py-2.5 text-sm focus:outline-none focus:border-primary disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <CardDivider />

          {/* 핸들 */}
          <div className="py-3 mb-3">
            <label className="text-xs text-slate-500 font-medium block mb-1">@handle</label>
            <div className="flex items-center border border-slate-200 rounded-item px-3 py-2.5 focus-within:border-primary">
              <span className="text-slate-400 text-sm mr-1">@</span>
              <input
                type="text"
                value={handle}
                onChange={e => setHandle(e.target.value.replace(/[^a-z0-9_]/g, '').slice(0, 30))}
                placeholder="handle"
                className="flex-1 text-sm focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">영문 소문자, 숫자, 밑줄(_)만 사용 가능</p>
          </div>

          <CardDivider />

          {/* 자기소개 */}
          <div className="pt-3">
            <label className="text-xs text-slate-500 font-medium block mb-1">자기소개</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, 150))}
              placeholder="간단히 나를 소개해주세요"
              rows={3}
              className="w-full border border-slate-200 rounded-item px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{bio.length}/150</p>
          </div>
        </Card>

        {/* 연습 악기 */}
        <Card>
          <p className="text-sm font-bold text-slate-800 mb-3">연습 악기</p>
          <div className="grid grid-cols-3 gap-2">
            {instruments.map((inst) => {
              const selected = selectedName === inst.name;
              return (
                <button
                  key={inst.name}
                  onClick={() => setSelectedName(prev => prev === inst.name ? null : inst.name)}
                  className={[
                    'py-3 rounded-xl border-2 text-sm font-medium transition-all',
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 text-slate-600 active:bg-slate-50',
                  ].join(' ')}
                >
                  {inst.name}
                </button>
              );
            })}
          </div>
        </Card>

        {/* 연습 목표 */}
        <Card>
          <p className="text-sm font-bold text-slate-800 mb-3">연습 목표</p>

          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>일일 목표</span>
              <span className="font-bold text-primary">{dailyGoal}분</span>
            </div>
            <input
              type="range" min={15} max={240} step={15}
              value={dailyGoal}
              onChange={e => setDailyGoal(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-slate-300 mt-0.5">
              <span>15분</span><span>4시간</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>주간 목표</span>
              <span className="font-bold text-primary">주 {weeklyGoalDays}일</span>
            </div>
            <input
              type="range" min={1} max={7} step={1}
              value={weeklyGoalDays}
              onChange={e => setWeeklyGoalDays(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-slate-300 mt-0.5">
              <span>1일</span><span>7일</span>
            </div>
          </div>
        </Card>

        {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl text-center">{error}</p>}

        {/* 저장 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[767px] mx-auto px-4 pt-3 pb-6 bg-white border-t border-slate-100 z-10">
          <Button variant="primary" fullWidth loading={saving} onClick={handleSave}>
            {saved ? '✓ 저장 완료!' : '변경사항 저장'}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
