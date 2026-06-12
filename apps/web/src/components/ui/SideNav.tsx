import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
  icon: (active: boolean) => React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: '홈',
    path: '/home',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#0EA5E9' : 'none'} stroke={active ? '#0EA5E9' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    label: '연습',
    path: '/practice',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#0EA5E9' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
  {
    label: '캘린더',
    path: '/calendar',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#0EA5E9' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    label: '리포트',
    path: '/report',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#0EA5E9' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
    ),
  },
  {
    label: '커뮤니티',
    path: '/community',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#0EA5E9' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    label: '설정',
    path: '/settings',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#0EA5E9' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

/** 태블릿+(≥ 768px) 전용 왼쪽 사이드 네비게이션 */
export function SideNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    path !== '' && location.pathname.startsWith(path);

  return (
    <aside className="hidden md:flex flex-col w-[220px] min-h-screen shrink-0 bg-white border-r border-slate-200">
      {/* 로고 */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <span className="text-xl font-bold text-primary tracking-tight">Harmorise</span>
      </div>

      {/* 연습 기록 CTA */}
      <div className="px-4 pt-5 pb-3">
        <button
          onClick={() => navigate('/practice/new')}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-btn bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:opacity-80 transition-colors shadow-fab"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          연습 기록하기
        </button>
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={[
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-item text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-pale text-primary'
                  : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              {item.icon(active)}
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* 하단 여백 (safe area 대응) */}
      <div className="h-6" />
    </aside>
  );
}
