import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/ui/PageLayout';
import { Card } from '../components/ui/Card';
import { apiFetch } from '../lib/api';

interface JoinRequest {
  requestId: string;
  user: { userId: string; nickname: string; handle: string };
  requestedAt: string;
}

interface RoomInfo {
  id: string;
  name: string;
  description: string | null;
}

export function RoomSettingsPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const nav = useNavigate();

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!roomId) return;
    const [r, reqs] = await Promise.all([
      apiFetch<RoomInfo>(`/rooms/${roomId}`),
      apiFetch<JoinRequest[]>(`/rooms/${roomId}/join-requests`),
    ]);
    setName(r.name);
    setDescription(r.description ?? '');
    setRequests(reqs);
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!roomId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/rooms/${roomId}`, {
        method: 'PATCH',
        body: { name: name.trim(), description: description.trim() || undefined },
      });
      nav(-1);
    } catch (e: any) {
      setError(e.message ?? '수정에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  const handleJoinRequest = async (requestId: string, action: 'accept' | 'reject') => {
    await apiFetch(`/rooms/${roomId}/join-requests/${requestId}`, {
      method: 'PATCH',
      body: { action },
    });
    setRequests(prev => prev.filter(r => r.requestId !== requestId));
  };

  const handleRefreshCode = async () => {
    const res = await apiFetch<{ inviteCode: string }>(`/rooms/${roomId}/invite-code/refresh`, { method: 'POST' });
    alert(`새 초대코드: ${res.inviteCode}`);
  };

  const handleDeleteRoom = async () => {
    if (!confirm('방을 삭제하면 모든 멤버가 퇴장됩니다. 삭제하시겠어요?')) return;
    await apiFetch(`/rooms/${roomId}`, { method: 'DELETE' });
    nav('/community/rooms', { replace: true });
  };

  return (
    <PageLayout title="방 관리" showBack>
      {/* 입장 요청 */}
      {requests.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-2 px-1">입장 요청 {requests.length}건</p>
          <div className="flex flex-col gap-2">
            {requests.map(req => (
              <Card key={req.requestId} padding="sm" className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{req.user.nickname}</p>
                  <p className="text-xs text-slate-400">@{req.user.handle}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleJoinRequest(req.requestId, 'accept')}
                    className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium"
                  >
                    수락
                  </button>
                  <button
                    onClick={() => handleJoinRequest(req.requestId, 'reject')}
                    className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium"
                  >
                    거절
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 방 정보 수정 */}
      <Card className="flex flex-col gap-4 mb-4">
        <p className="text-sm font-semibold text-slate-700">방 정보 수정</p>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">방 이름</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value.slice(0, 20))}
            className="w-full px-4 py-3 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-slate-400 mt-1 text-right">{name.length}/20</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">방 설명 (선택)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, 100))}
            rows={3}
            className="w-full px-4 py-3 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <p className="text-xs text-slate-400 mt-1 text-right">{description.length}/100</p>
        </div>
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </Card>

      {/* 초대코드 재발급 */}
      <Card className="mb-4">
        <button
          onClick={handleRefreshCode}
          className="w-full py-3 text-sm font-medium text-primary text-center"
        >
          초대코드 재발급
        </button>
      </Card>

      {/* 방 삭제 */}
      <Card>
        <button
          onClick={handleDeleteRoom}
          className="w-full py-3 text-sm font-medium text-red-500 text-center"
        >
          방 삭제
        </button>
      </Card>
    </PageLayout>
  );
}
