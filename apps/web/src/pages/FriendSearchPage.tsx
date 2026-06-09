import { useState, useRef } from 'react';
import { PageLayout } from '../components/ui/PageLayout';
import { Card } from '../components/ui/Card';
import { apiFetch } from '../lib/api';

interface SearchResult {
  userId: string;
  nickname: string;
  handle: string;
  bio: string | null;
  profileImageUrl: string | null;
  isFriend: boolean;
  requestPending: boolean;
}

export function FriendSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleInput = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 1) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<SearchResult[]>(`/users/search?q=${encodeURIComponent(value)}`);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const sendRequest = async (toUserId: string) => {
    await apiFetch('/friends/requests', {
      method: 'POST',
      body: { toUserId },
    });
    setSentIds(prev => new Set([...prev, toUserId]));
  };

  return (
    <PageLayout title="친구 찾기" showBack>
      {/* 검색창 */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="닉네임 또는 @handle 검색"
          className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>

      {loading && <p className="text-sm text-slate-400 text-center py-6">검색 중…</p>}

      {!loading && query.length > 0 && results.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6">검색 결과가 없어요</p>
      )}

      <div className="flex flex-col gap-2">
        {results.map(u => (
          <Card key={u.userId} padding="sm" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center text-lg flex-shrink-0">
              {u.profileImageUrl ? (
                <img src={u.profileImageUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
              ) : '👤'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{u.nickname}</p>
              <p className="text-xs text-slate-400">@{u.handle}</p>
              {u.bio && <p className="text-xs text-slate-500 mt-0.5 truncate">{u.bio}</p>}
            </div>
            {u.isFriend ? (
              <span className="text-xs text-slate-400 font-medium">친구 ✅</span>
            ) : sentIds.has(u.userId) || u.requestPending ? (
              <span className="text-xs text-slate-400 font-medium">요청 완료</span>
            ) : (
              <button
                onClick={() => sendRequest(u.userId)}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium"
              >
                친구 추가
              </button>
            )}
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
