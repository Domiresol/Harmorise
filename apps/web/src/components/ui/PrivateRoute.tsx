import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * 로그인한 유저만 접근 가능한 라우트 래퍼
 * 비로그인 → /login 으로 리다이렉트, 현재 경로를 state로 전달
 */
export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();
  const location = useLocation();

  // 초기 토큰 검증 중엔 빈 화면
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-3xl animate-pulse">🎵</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
