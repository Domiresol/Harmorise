import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/admin',       label: '대시보드',   icon: '▦', end: true },
  { to: '/admin/users', label: '사용자 관리', icon: '👤', end: false },
];

export function AdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── 사이드바 ────────────────────────────────────────── */}
      <aside className="w-52 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        {/* 로고 */}
        <div className="px-5 py-5 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-800">Harmorise</p>
          <p className="text-xs text-slate-400 mt-0.5">Admin Console</p>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 py-3 flex flex-col gap-0.5">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-violet-50 text-violet-700 font-medium border-l-2 border-violet-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 하단 유저 정보 + 로그아웃 */}
        <div className="px-5 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            로그아웃 →
          </button>
        </div>
      </aside>

      {/* ── 콘텐츠 영역 ────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
