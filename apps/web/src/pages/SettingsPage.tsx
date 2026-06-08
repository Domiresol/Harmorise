import { useNavigate } from 'react-router-dom';
import { PageLayout }  from '../components/ui/PageLayout';
import { Card }        from '../components/ui/Card';
import { Badge }       from '../components/ui/Badge';
import { useAuth }     from '../context/AuthContext';

interface MenuRowProps {
  icon: string;
  label: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

function MenuRow({ icon, label, badge, onClick, danger }: MenuRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3.5 px-1 active:opacity-60 transition-opacity"
    >
      <span className="text-xl w-7 text-center">{icon}</span>
      <span className={`flex-1 text-left text-base font-medium ${danger ? 'text-error' : 'text-slate-800'}`}>
        {label}
      </span>
      {badge}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  );
}

function Divider() {
  return <hr className="border-slate-100" />;
}

export function SettingsPage() {
  const navigate   = useNavigate();
  const { user, logout } = useAuth();

  const nickname = user?.profile?.nickname  ?? '연습생';
  const level    = user?.character?.level   ?? 1;
  const plan     = user?.subscription?.plan ?? 'FREE';

  return (
    <PageLayout title="설정" hasTabBar>

      {/* ── 프로필 카드 ───────────────────────────────────── */}
      <Card
        highlighted
        clickable
        className="mb-5 flex items-center gap-4"
        onClick={() => navigate('/settings/profile')}
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl shadow-sm">
            🎸
          </div>
          <span className="absolute -bottom-1 -right-1 bg-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-pill">
            Lv.{level}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-slate-900">{nickname}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={plan === 'PREMIUM' ? 'premium' : 'default'}>
              {plan === 'PREMIUM' ? '⭐ 프리미엄' : '무료 플랜'}
            </Badge>
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </Card>

      {/* ── 메뉴 ─────────────────────────────────────────── */}
      <Card className="mb-4">
        <MenuRow icon="🎸" label="프로필 설정"  onClick={() => navigate('/settings/profile')} />
        <Divider />
        <MenuRow icon="🔔" label="알림 설정"    onClick={() => navigate('/settings/notifications')} />
        <Divider />
        <MenuRow
          icon="⭐"
          label="구독 관리"
          badge={<Badge variant="premium">PREMIUM</Badge>}
          onClick={() => {}}
        />
      </Card>

      {/* ── 연습 도구 ──────────────────────────────────────── */}
      <Card className="mb-4">
        <MenuRow icon="🥁" label="메트로놈" onClick={() => navigate('/metronome')} />
        <Divider />
        <MenuRow icon="🎙" label="튜너"     onClick={() => navigate('/tuner')} />
      </Card>

      <Card className="mb-4">
        <MenuRow icon="🔐" label="계정 관리"    onClick={() => navigate('/settings/account')} />
        <Divider />
        <MenuRow icon="📄" label="이용약관"     onClick={() => {}} />
        <Divider />
        <MenuRow icon="🔏" label="개인정보처리방침" onClick={() => {}} />
      </Card>

      <Card className="mb-6">
        <MenuRow icon="🚪" label="로그아웃" onClick={() => { logout(); navigate('/'); }} danger />
      </Card>

      <p className="text-center text-xs text-slate-300">Harmorise v0.1.0</p>

    </PageLayout>
  );
}
