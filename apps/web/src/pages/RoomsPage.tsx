import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/ui/PageLayout';
import { Card } from '../components/ui/Card';
import { apiFetch } from '../lib/api';

interface RoomItem {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  myRole: 'HOST' | 'MEMBER';
}

export function RoomsPage() {
  const nav = useNavigate();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<RoomItem[]>('/rooms')
      .then(setRooms)
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async () => {
    if (joinCode.length !== 6) return;
    setJoinLoading(true);
    setJoinError(null);
    try {
      const res = await apiFetch<{ requestId: string; roomName: string }>('/rooms/join', {
        method: 'POST',
        body: { inviteCode: joinCode.toUpperCase() },
      });
      alert(`'${res.roomName}' 방에 입장 요청을 보냈어요. 방장의 수락을 기다려주세요.`);
      setShowJoin(false);
      setJoinCode('');
    } catch (e: any) {
      setJoinError(e.message ?? '요청에 실패했어요.');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <PageLayout
      title="연습 방"
      showBack
      rightAction={
        <button
          onClick={() => nav('/community/rooms/new')}
          className="text-primary font-medium text-sm"
        >
          방 만들기
        </button>
      }
    >
      {/* 초대코드 입장 */}
      <button
        onClick={() => setShowJoin(!showJoin)}
        className="w-full mb-4 py-3 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500 font-medium active:opacity-70"
      >
        초대코드로 입장하기
      </button>

      {showJoin && (
        <Card className="mb-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">초대코드 입력</p>
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="6자리 코드 입력"
            maxLength={6}
            className="w-full px-4 py-3 bg-slate-100 rounded-xl text-sm font-mono tracking-widest text-center outline-none focus:ring-2 focus:ring-primary mb-3"
          />
          {joinError && <p className="text-xs text-red-400 mb-2 text-center">{joinError}</p>}
          <button
            onClick={handleJoin}
            disabled={joinCode.length !== 6 || joinLoading}
            className="w-full py-3 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {joinLoading ? '요청 중…' : '입장 요청'}
          </button>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-10">불러오는 중…</p>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎵</p>
          <p className="text-sm text-slate-500">참여 중인 방이 없어요</p>
          <button
            onClick={() => nav('/community/rooms/new')}
            className="mt-4 px-5 py-2 bg-primary text-white rounded-full text-sm font-medium"
          >
            방 만들기
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rooms.map(r => (
            <button
              key={r.id}
              onClick={() => nav(`/community/rooms/${r.id}`)}
              className="w-full text-left"
            >
              <Card padding="sm" className="flex items-center gap-3 active:opacity-70">
                <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center text-xl flex-shrink-0">
                  🎵
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                    {r.myRole === 'HOST' && (
                      <span className="text-xs px-1.5 py-0.5 bg-primary-pale text-primary rounded font-medium">방장</span>
                    )}
                  </div>
                  {r.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{r.description}</p>}
                  <p className="text-xs text-slate-400 mt-0.5">멤버 {r.memberCount}명</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-400">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Card>
            </button>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
