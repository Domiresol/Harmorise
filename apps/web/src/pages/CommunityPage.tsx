import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/ui/PageLayout';
import { Card } from '../components/ui/Card';

export function CommunityPage() {
  const nav = useNavigate();

  return (
    <PageLayout title="커뮤니티" hasTabBar>
      <div className="flex flex-col gap-3">

        {/* 친구 섹션 */}
        <button
          onClick={() => nav('/community/friends')}
          className="w-full text-left"
        >
          <Card className="flex items-center gap-4 active:opacity-70 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center text-2xl flex-shrink-0">
              👥
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">내 친구</p>
              <p className="text-xs text-slate-500 mt-0.5">친구의 연습 현황을 확인해요</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-400">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Card>
        </button>

        {/* 연습방 섹션 */}
        <button
          onClick={() => nav('/community/rooms')}
          className="w-full text-left"
        >
          <Card className="flex items-center gap-4 active:opacity-70 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center text-2xl flex-shrink-0">
              🎵
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">연습 방</p>
              <p className="text-xs text-slate-500 mt-0.5">함께 연습하고 서로의 기록을 공유해요</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-400">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Card>
        </button>

      </div>
    </PageLayout>
  );
}
