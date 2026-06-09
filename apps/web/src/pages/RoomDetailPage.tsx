import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/ui/PageLayout';
import { Card } from '../components/ui/Card';
import { apiFetch } from '../lib/api';

interface RoomDetail {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string | null;
  memberCount: number;
  myRole: 'HOST' | 'MEMBER';
}

interface FeedItem {
  id: string;
  user: { userId: string; nickname: string; handle: string; profileImageUrl: string | null };
  practicedAt: string;
  durationMinutes: number;
  instrumentName: string | null;
  songTitle: string | null;
  bpm: number | null;
  createdAt: string;
}

interface Member {
  userId: string;
  nickname: string;
  handle: string;
  profileImageUrl: string | null;
  role: 'HOST' | 'MEMBER';
  weekPracticedDays: number;
}

type Tab = 'feed' | 'members';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}시간 ${m > 0 ? `${m}분` : ''}`.trim() : `${m}분`;
}

export function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('feed');
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const [r, f, m] = await Promise.all([
        apiFetch<RoomDetail>(`/rooms/${roomId}`),
        apiFetch<{ items: FeedItem[] }>(`/rooms/${roomId}/feed`),
        apiFetch<Member[]>(`/rooms/${roomId}/members`),
      ]);
      setRoom(r);
      setFeed(f.items);
      setMembers(m);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  return (
    <PageLayout
      title={room?.name ?? '연습 방'}
      showBack
      rightAction={
        room?.myRole === 'HOST' ? (
          <button onClick={() => nav(`/community/rooms/${roomId}/settings`)} className="text-slate-500 text-sm">
            관리
          </button>
        ) : undefined
      }
    >
      {/* 초대코드 (방장만) */}
      {room?.inviteCode && (
        <Card className="mb-4 flex items-center justify-between bg-primary-pale border-0">
          <div>
            <p className="text-xs text-slate-500">초대코드</p>
            <p className="text-xl font-mono font-bold text-primary tracking-widest mt-0.5">{room.inviteCode}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(room.inviteCode!)}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium"
          >
            복사
          </button>
        </Card>
      )}

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        {(['feed', 'members'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'bg-white text-primary shadow-sm' : 'text-slate-500',
            ].join(' ')}
          >
            {t === 'feed' ? '피드' : `멤버 ${room?.memberCount ?? ''}`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-10">불러오는 중…</p>
      ) : tab === 'feed' ? (
        /* ── 피드 ── */
        feed.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">아직 연습 기록이 없어요</p>
        ) : (
          <div className="flex flex-col gap-2">
            {feed.map(item => (
              <Card key={item.id} padding="sm" className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center text-base flex-shrink-0">
                  {item.user.profileImageUrl ? (
                    <img src={item.user.profileImageUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                  ) : '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{item.user.nickname}</p>
                    <p className="text-xs text-slate-400">{timeAgo(item.createdAt)}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatMinutes(item.durationMinutes)} 연습
                    {item.instrumentName && ` · ${item.instrumentName}`}
                    {item.songTitle && ` · ${item.songTitle}`}
                    {item.bpm && ` · ${item.bpm} BPM`}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* ── 멤버 ── */
        <div className="flex flex-col gap-2">
          {members.map(m => (
            <Card key={m.userId} padding="sm" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center text-base flex-shrink-0">
                {m.profileImageUrl ? (
                  <img src={m.profileImageUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                ) : '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{m.nickname}</p>
                  {m.role === 'HOST' && (
                    <span className="text-xs px-1.5 py-0.5 bg-primary-pale text-primary rounded font-medium">방장</span>
                  )}
                </div>
                <p className="text-xs text-slate-400">@{m.handle}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{m.weekPracticedDays}일</p>
                <p className="text-xs text-slate-400">이번 주</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
