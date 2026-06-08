import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // 이전 페이지에서 리다이렉트됐다면 그리로 돌아가기 (단, admin 분기 우선)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/home';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ accessToken: string; user: { role: string } }>('/auth/login', {
        method: 'POST',
        body:   { email, password },
      });
      await login(res.accessToken);
      // ADMIN이면 관리자 대시보드로, 그 외엔 이전 페이지 또는 홈으로
      navigate(res.user?.role === 'ADMIN' ? '/admin' : from, { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-6">
      {/* 헤더 */}
      <div className="pt-14 pb-8">
        <button onClick={() => navigate(-1)} className="text-slate-400 mb-6 block">
          ← 뒤로
        </button>
        <h1 className="text-2xl font-bold text-slate-800">로그인</h1>
        <p className="text-slate-500 text-sm mt-1">계정 정보를 입력해주세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">이메일</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호를 입력해주세요"
            required
            className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-sky-500 text-white rounded-2xl font-semibold text-base disabled:opacity-50 mt-2"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {/* 하단 링크 */}
      <div className="pb-12 pt-6">
        <div className="flex justify-center gap-6 text-sm text-slate-500 mb-4">
          <Link to="/find-id" className="underline-offset-2 underline">아이디 찾기</Link>
          <span className="text-slate-200">|</span>
          <Link to="/reset-password" className="underline-offset-2 underline">비밀번호 초기화</Link>
        </div>
        <p className="text-center text-sm text-slate-500">
          아직 계정이 없으신가요?{' '}
          <Link to="/signup" className="text-sky-500 font-semibold">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
