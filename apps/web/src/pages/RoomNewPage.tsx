import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/ui/PageLayout';
import { Card } from '../components/ui/Card';
import { apiFetch } from '../lib/api';

export function RoomNewPage() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const room = await apiFetch<{ id: string }>('/rooms', {
        method: 'POST',
        body: { name: name.trim(), description: description.trim() || undefined },
      });
      nav(`/community/rooms/${room.id}`, { replace: true });
    } catch (e: any) {
      setError(e.message ?? '방 생성에 실패했어요.');
      setLoading(false);
    }
  };

  return (
    <PageLayout title="방 만들기" showBack>
      <Card className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">방 이름 *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value.slice(0, 20))}
            placeholder="예: 기타 스터디"
            className="w-full px-4 py-3 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-slate-400 mt-1 text-right">{name.length}/20</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">방 설명 (선택)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, 100))}
            placeholder="어떤 방인지 간단히 소개해주세요"
            rows={3}
            className="w-full px-4 py-3 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <p className="text-xs text-slate-400 mt-1 text-right">{description.length}/100</p>
        </div>
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || loading}
          className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {loading ? '생성 중…' : '방 만들기'}
        </button>
      </Card>
    </PageLayout>
  );
}
