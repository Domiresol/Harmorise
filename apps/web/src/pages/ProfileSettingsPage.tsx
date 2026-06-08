import { useState } from 'react';
import { PageLayout }   from '../components/ui/PageLayout';
import { Card, CardDivider } from '../components/ui/Card';
import { Button }       from '../components/ui/Button';

/* ── 상수 ────────────────────────────────────────────────── */
const CHARACTER_TYPES = ['HUMAN', 'ANIMAL', 'ROBOT'] as const;
type CharacterType = typeof CHARACTER_TYPES[number];

const CHARACTER_EMOJI: Record<CharacterType, string> = {
  HUMAN: '🧑‍🎸', ANIMAL: '🐱', ROBOT: '🤖',
};

const INSTRUMENTS = ['기타','베이스','피아노','드럼','바이올린','보컬'];

const ITEM_CATALOG: {
  slot: 'hair' | 'outfit' | 'accessory' | 'background';
  label: string;
  items: { id: string; name: string; emoji: string; locked: boolean; condition?: string }[];
}[] = [
  {
    slot: 'hair', label: '헤어',
    items: [
      { id: 'h0',  name: '기본',       emoji: '🟤', locked: false },
      { id: 'h1',  name: '단발',       emoji: '💇', locked: false },
      { id: 'h2',  name: '곱슬',       emoji: '🌀', locked: true,  condition: '7일 스트리크 달성' },
      { id: 'h3',  name: '포니테일',   emoji: '🎀', locked: true,  condition: 'Lv.5 달성' },
    ],
  },
  {
    slot: 'outfit', label: '의상',
    items: [
      { id: 'o0',  name: '기본',       emoji: '👕', locked: false },
      { id: 'o1',  name: '재킷',       emoji: '🧥', locked: false },
      { id: 'o2',  name: '밴드티',     emoji: '🎸', locked: true,  condition: '14일 스트리크 달성' },
      { id: 'o3',  name: '정장',       emoji: '🤵', locked: true,  condition: 'Lv.10 달성' },
    ],
  },
  {
    slot: 'accessory', label: '악세서리',
    items: [
      { id: 'a0',  name: '없음',       emoji: '⬜', locked: false },
      { id: 'a1',  name: '안경',       emoji: '🕶️', locked: false },
      { id: 'a2',  name: '헤드폰',     emoji: '🎧', locked: true,  condition: '30일 스트리크 달성' },
    ],
  },
  {
    slot: 'background', label: '배경',
    items: [
      { id: 'b0',  name: '기본',       emoji: '🌫️', locked: false },
      { id: 'b1',  name: '스튜디오',   emoji: '🎙️', locked: false },
      { id: 'b2',  name: '콘서트홀',   emoji: '🎭', locked: true,  condition: 'Lv.8 달성' },
    ],
  },
];

/* ── 캐릭터 미리보기 ─────────────────────────────────────── */
function CharacterPreview({
  type, equipped,
}: {
  type: CharacterType;
  equipped: Record<string, string>;
}) {
  const bgEmoji = ITEM_CATALOG.find(c => c.slot === 'background')
    ?.items.find(i => i.id === equipped.background)?.emoji ?? '🌫️';
  const base = CHARACTER_EMOJI[type];

  return (
    <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-primary-pale flex items-center justify-center bg-sky-50">
      <span className="absolute text-5xl opacity-20 select-none">{bgEmoji}</span>
      <div className="relative text-center">
        <div className="text-6xl">{base}</div>
        {equipped.accessory && equipped.accessory !== 'a0' && (
          <div className="absolute -top-2 -right-2 text-xl">
            {ITEM_CATALOG.find(c => c.slot === 'accessory')
              ?.items.find(i => i.id === equipped.accessory)?.emoji}
          </div>
        )}
      </div>
      <div className="absolute bottom-1 left-0 right-0 text-center">
        <span className="text-xs bg-primary text-white rounded-pill px-2 py-0.5 font-bold">Lv.3</span>
      </div>
    </div>
  );
}

/* ── 아이템 그리드 ───────────────────────────────────────── */
function ItemGrid({
  items, selected, onSelect,
}: {
  items: typeof ITEM_CATALOG[0]['items'];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => !item.locked && onSelect(item.id)}
          className={[
            'flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all',
            item.locked
              ? 'border-slate-100 bg-slate-50 opacity-50 cursor-default'
              : selected === item.id
              ? 'border-primary bg-primary-pale'
              : 'border-slate-100 bg-white active:scale-95',
          ].join(' ')}
        >
          <span className="text-2xl">{item.locked ? '🔒' : item.emoji}</span>
          <span className="text-[10px] text-slate-600 truncate w-full text-center">{item.name}</span>
          {item.locked && item.condition && (
            <span className="text-[9px] text-slate-400 text-center leading-tight">{item.condition}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── 페이지 ──────────────────────────────────────────────── */
export function ProfileSettingsPage() {
  const [nickname, setNickname]     = useState('솔');
  const [instrument, setInstrument] = useState('기타');
  const [dailyGoal, setDailyGoal]   = useState(60);
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [charType, setCharType]     = useState<CharacterType>('HUMAN');
  const [equipped, setEquipped]     = useState<Record<string, string>>({
    hair: 'h0', outfit: 'o0', accessory: 'a0', background: 'b0',
  });
  const [activeSlot, setActiveSlot] = useState<string>('hair');
  const [saved, setSaved]           = useState(false);

  const setItem = (slot: string, id: string) => {
    setEquipped(prev => ({ ...prev, [slot]: id }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const currentSlot = ITEM_CATALOG.find(c => c.slot === activeSlot);

  return (
    <PageLayout title="프로필 설정" showBack>
      <div className="flex flex-col gap-4 pb-24">

        {/* ═══════════════════════════════════════════════════
            프로필 섹션
        ═══════════════════════════════════════════════════ */}
        <Card>
          <p className="text-sm font-bold text-slate-800 mb-3">기본 정보</p>

          {/* 닉네임 */}
          <div className="mb-3">
            <label className="text-xs text-slate-500 font-medium block mb-1">닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={12}
              className="w-full border border-slate-200 rounded-item px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <CardDivider />

          {/* 주 악기 */}
          <div className="pt-3 mb-3">
            <label className="text-xs text-slate-500 font-medium block mb-2">주 악기</label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map(ins => (
                <button
                  key={ins}
                  onClick={() => setInstrument(ins)}
                  className={[
                    'px-3 py-1.5 rounded-pill text-xs font-medium border transition-all',
                    instrument === ins
                      ? 'border-primary bg-primary-pale text-primary'
                      : 'border-slate-200 text-slate-500',
                  ].join(' ')}
                >
                  {ins}
                </button>
              ))}
            </div>
          </div>

          <CardDivider />

          {/* 연습 목표 */}
          <div className="pt-3">
            <label className="text-xs text-slate-500 font-medium block mb-3">연습 목표</label>
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
                <span className="font-bold text-primary">주 {weeklyGoal}일</span>
              </div>
              <input
                type="range" min={1} max={7} step={1}
                value={weeklyGoal}
                onChange={e => setWeeklyGoal(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-slate-300 mt-0.5">
                <span>1일</span><span>7일</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════
            캐릭터 커스터마이징 섹션
        ═══════════════════════════════════════════════════ */}
        <Card>
          <p className="text-sm font-bold text-slate-800 mb-4">캐릭터 꾸미기</p>

          {/* 캐릭터 미리보기 */}
          <CharacterPreview type={charType} equipped={equipped} />

          {/* 캐릭터 타입 선택 */}
          <div className="flex gap-2 justify-center mt-4 mb-4">
            {CHARACTER_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setCharType(t)}
                className={[
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-xl border-2 transition-all',
                  charType === t
                    ? 'border-primary bg-primary-pale'
                    : 'border-slate-100 bg-white',
                ].join(' ')}
              >
                <span className="text-2xl">{CHARACTER_EMOJI[t]}</span>
                <span className="text-[10px] text-slate-600">{t}</span>
              </button>
            ))}
          </div>

          <CardDivider />

          {/* 슬롯 탭 */}
          <div className="flex gap-1 mt-4 mb-3">
            {ITEM_CATALOG.map(cat => (
              <button
                key={cat.slot}
                onClick={() => setActiveSlot(cat.slot)}
                className={[
                  'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  activeSlot === cat.slot
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-500',
                ].join(' ')}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 아이템 그리드 */}
          {currentSlot && (
            <ItemGrid
              items={currentSlot.items}
              selected={equipped[currentSlot.slot]}
              onSelect={id => setItem(currentSlot.slot, id)}
            />
          )}

          <p className="text-xs text-slate-400 text-center mt-3">
            🔒 잠긴 아이템은 조건 달성 시 자동 해금됩니다
          </p>
        </Card>

        {/* ── 저장 버튼 (sticky) ───────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[767px] mx-auto px-4 pb-safe pt-3 bg-white border-t border-slate-100 z-10">
          <Button
            variant="primary"
            fullWidth
            onClick={handleSave}
          >
            {saved ? '✓ 저장 완료!' : '변경사항 저장'}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
