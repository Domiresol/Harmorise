import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/ui/PageLayout';
import { Card } from '../components/ui/Card';
import { apiFetch } from '../lib/api';

interface FriendItem {
  userId: string;
  nickname: string;
  handle: string;
  bio: string | null;
  profileImageUrl: string | null;
  practicedToday: boolean;
  friendSince: string;
}

interface IncomingRequest {
  id: string;
  createdAt: string;
  fromUser: {
    profile: {
      userId: string;
      nickname: string;
      handle: string;
      profileImageUrl: string | null;
    };
  };
}

type Tab = 'friends' | 'requests';

export function FriendsPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<FriendItem[]>('/friends'),
      apiFetch<IncomingRequest[]>('/friends/requests'),
    ]).then(([f, r]) => {
      setFriends(f);
      setRequests(r);
    }).finally(() => setLoading(false));
  }, []);

  const handleRespond = async (requestId: string, action: 'accept' | 'reject') => {
    await apiFetch(`/friends/requests/${requestId}`, {
      method: 'PATCH',
      body: { action },
    });
    setRequests(prev => prev.filter(r => r.id !== requestId));
    if (action === 'accept') {
      // 친구 목록 새로고침
      const updated = await apiFetch<FriendItem[]>('/friends');
      setFriends(updated);
    }
  };

  return (
    <PageLayout
      title="친구"
      showBack
      rightAction={
        <button
          onClick={() => nav('/community/friends/search')}
          className="text-primary font-medium text-sm"
        >
          친구 찾기
        </button>
      }
    >
      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        {(['friends', 'requests'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'bg-white text-primary shadow-sm' : 'text-slate-500',
            ].join(' ')}
          >
            {t === 'friends' ? `친구 ${friends.length}` : `요청 ${requests.length}`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-10">불러오는 중…</p>
      ) : tab === 'friends' ? (
        /* ── 친구 목록 ── */
        friends.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm text-slate-500">아직 친구가 없어요</p>
            <button
              onClick={() => nav('/community/friends/search')}
              className="mt-4 px-5 py-2 bg-primary text-white rounded-full text-sm font-medium"
            >
              친구 찾기
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map(f => (
              <button
                key={f.userId}
                onClick={() => nav(`/community/friends/${f.userId}`)}
                className="w-full text-left"
              >
                <Card padding="sm" className="flex items-center gap-3 active:opacity-70">
                  <div className="relative flex-shrink-0">
                    {f.profileImageUrl ? (
                      <img src={f.profileImageUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center text-lg">👤</div>
                    )}
                    {f.practicedToday && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{f.nickname}</p>
                    <p className="text-xs text-slate-400">@{f.handle}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    f.practicedToday ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {f.practicedToday ? '오늘 연습 ✅' : '미연습'}
                  </span>
                </Card>
              </button>
            ))}
          </div>
        )
      ) : (
        /* ── 친구 요청 ── */
        requests.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-16">받은 친구 요청이 없어요</p>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map(r => (
              <Card key={r.id} padding="sm" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center text-lg flex-shrink-0">
                  {r.fromUser.profile.profileImageUrl ? (
                    <img src={r.fromUser.profile.profileImageUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                  ) : '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{r.fromUser.profile.nickname}</p>
                  <p className="text-xs text-slate-400">@{r.fromUser.profile.handle}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(r.id, 'reject')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500"
                  >
                    거절
                  </button>
                  <button
                    onClick={() => handleRespond(r.id, 'accept')}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium"
                  >
                    수락
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </PageLayout>
  );
}
