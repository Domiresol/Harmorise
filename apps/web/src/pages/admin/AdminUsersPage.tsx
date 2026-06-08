import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';

// ── 타입 ─────────────────────────────────────────────────────
interface AdminUser {
  id:           string;
  email:        string;
  nickname:     string | null;
  role:         string;
  isActive:     boolean;
  plan:         string;
  isPremium:    boolean;
  sessionCount: number;
  lastLoginAt:  string | null;
  createdAt:    string;
}

interface UsersResponse {
  items:      AdminUser[];
  nextCursor: string | null;
}

// ── 유저 행 ──────────────────────────────────────────────────
function UserRow({
  user,
  onToggle,
}: {
  user: AdminUser;
  onToggle: (id: string, next: boolean) => void;
}) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(user.id, !user.isActive);
    setToggling(false);
  };

  const joinDate = new Date(user.createdAt).toLocaleDateString('ko-KR', {
    year: '2-digit', month: '2-digit', day: '2-digit',
  });

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-3 pr-4">
        <p className="text-sm text-slate-800">{user.email}</p>
        {user.nickname && (
          <p className="text-xs text-slate-400 mt-0.5">{user.nickname}</p>
        )}
      </td>
      <td className="py-3 pr-4 text-xs text-slate-500">{joinDate}</td>
      <td className="py-3 pr-4">
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          user.isActive
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-slate-100 text-slate-500'
        }`}>
          {user.isActive ? '활성' : '정지'}
        </span>
      </td>
      <td className="py-3 pr-4">
        {user.isPremium ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">프리미엄</span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">무료</span>
        )}
      </td>
      <td className="py-3 pr-4 text-xs text-slate-500 text-right">{user.sessionCount}회</td>
      <td className="py-3 text-right">
        <button
          onClick={handleToggle}
          disabled={toggling || user.role === 'ADMIN'}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            user.role === 'ADMIN'
              ? 'border-slate-100 text-slate-300 cursor-not-allowed'
              : user.isActive
              ? 'border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500'
              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          {user.role === 'ADMIN' ? '관리자' : user.isActive ? '정지' : '활성화'}
        </button>
      </td>
    </tr>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
export function AdminUsersPage() {
  const [users,      setUsers]      = useState<AdminUser[]>([]);
  const [cursor,     setCursor]     = useState<string | null>(null);
  const [hasMore,    setHasMore]    = useState(true);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadUsers = useCallback(async (reset: boolean, q: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '25' });
      if (!reset && cursor) params.set('cursor', cursor);
      if (q) params.set('search', q);

      const res = await apiFetch<UsersResponse>(`/admin/users?${params}`);

      setUsers(prev => reset ? res.items : [...prev, ...res.items]);
      setCursor(res.nextCursor);
      setHasMore(!!res.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  // 초기 로드 + 검색어 변경 시 리셋
  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    loadUsers(true, search);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // 검색 디바운스
  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(v), 400);
  };

  const handleToggle = async (id: string, next: boolean) => {
    await apiFetch(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body:   { isActive: next },
    });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: next } : u));
  };

  return (
    <div className="p-7">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-800">사용자 관리</h1>
        <input
          type="text"
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="이메일 검색…"
          className="text-sm px-3 py-2 border border-slate-200 rounded-lg w-56 focus:outline-none focus:border-violet-400"
        />
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 pr-4 text-xs font-medium text-slate-400">이메일 / 닉네임</th>
              <th className="text-left py-3 pr-4 text-xs font-medium text-slate-400">가입일</th>
              <th className="text-left py-3 pr-4 text-xs font-medium text-slate-400">상태</th>
              <th className="text-left py-3 pr-4 text-xs font-medium text-slate-400">구독</th>
              <th className="text-right py-3 pr-4 text-xs font-medium text-slate-400">연습 횟수</th>
              <th className="text-right py-3 text-xs font-medium text-slate-400">관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <UserRow key={u.id} user={u} onToggle={handleToggle} />
            ))}
          </tbody>
        </table>

        {loading && (
          <p className="text-sm text-slate-400 text-center py-4">불러오는 중…</p>
        )}
        {!loading && users.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">검색 결과가 없어요</p>
        )}
        {hasMore && !loading && (
          <div className="text-center py-3 border-t border-slate-100">
            <button
              onClick={() => loadUsers(false, search)}
              className="text-xs text-violet-600 hover:underline"
            >
              더 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
