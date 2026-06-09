import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageLayout } from '../components/ui/PageLayout';
import { Card } from '../components/ui/Card';
import { apiFetch } from '../lib/api';

interface FriendProfile {
  userId: string;
  nickname: string;
  handle: string;
  bio: string | null;
  profileImageUrl: string | null;
  mainInstrument: string | null;
  currentStreak: number;
  longestStreak: number;
  thisMonth: { practicedDays: number; totalMinutes: number };
}

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}시간 ${m > 0 ? `${m}분` : ''}`.trim() : `${m}분`;
}

export function FriendProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    apiFetch<FriendProfile>(`/friends/${userId}/profile`)
      .then(setProfile)
      .catch(() => setError('프로필을 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <PageLayout title="친구 프로필" showBack>
      {loading && (
        <p className="text-sm text-slate-400 text-center py-10">불러오는 중…</p>
      )}
      {error && (
        <p className="text-sm text-red-400 text-center py-10">{error}</p>
      )}

      {profile && (
        <div className="flex flex-col gap-4">
          {/* 프로필 헤더 */}
          <Card className="flex flex-col items-center text-center py-6">
            <div className="w-20 h-20 rounded-full bg-primary-pale flex items-center justify-center text-4xl mb-3">
              {profile.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  className="w-20 h-20 rounded-full object-cover"
                  alt=""
                />
              ) : (
                '👤'
              )}
            </div>
            <p className="text-lg font-bold text-slate-800">
              {profile.nickname}
            </p>
            <p className="text-sm text-slate-400 mt-0.5">@{profile.handle}</p>
            {profile.mainInstrument && (
              <p className="text-xs text-primary mt-1 font-medium">
                🎸 {profile.mainInstrument}
              </p>
            )}
            {profile.bio && (
              <p className="text-sm text-slate-500 mt-3 px-4">{profile.bio}</p>
            )}
          </Card>

          {/* 스트리크 */}
          <Card className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-primary">
                🔥 {profile.currentStreak}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">연속 연습일자</p>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-slate-700">
                🏆 {profile.longestStreak}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">최장 기록</p>
            </div>
          </Card>

          {/* 이번 달 통계 */}
          <Card>
            <p className="text-sm font-bold text-slate-700 mb-3">
              이번 달 연습
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary-pale rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {profile.thisMonth.practicedDays}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">연습 일수</p>
              </div>
              <div className="bg-accent-light rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-teal-600">
                  {formatMinutes(profile.thisMonth.totalMinutes)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">총 연습 시간</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}
