import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout }        from '../components/ui/PageLayout';
import { Card, CardDivider } from '../components/ui/Card';
import { Button }            from '../components/ui/Button';

const SOCIAL_ACCOUNTS = [
  { provider: '카카오', icon: '💬', connected: true  },
  { provider: '구글',   icon: '🔵', connected: false },
  { provider: '애플',   icon: '🍎', connected: false },
];

export function AccountPage() {
  const navigate = useNavigate();
  const [showPwForm, setShowPwForm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pw, setPw]     = useState({ current: '', next: '', confirm: '' });
  const [pwSaved, setPwSaved] = useState(false);

  const handlePwSave = () => {
    setPwSaved(true);
    setShowPwForm(false);
    setPw({ current: '', next: '', confirm: '' });
    setTimeout(() => setPwSaved(false), 2000);
  };

  return (
    <PageLayout title="계정 관리" showBack>
      <div className="flex flex-col gap-4 pb-8">

        {/* ── 계정 정보 ─────────────────────────────────────── */}
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center text-2xl">
              🧑‍🎸
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">솔</p>
              <p className="text-xs text-slate-400">dosol524@gmail.com</p>
            </div>
            <span className="ml-auto text-xs bg-accent-light text-teal-600 font-bold px-2 py-1 rounded-pill">
              FREE
            </span>
          </div>
        </Card>

        {/* ── 비밀번호 변경 ─────────────────────────────────── */}
        <Card>
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowPwForm(!showPwForm)}
          >
            <div>
              <p className="text-sm font-semibold text-slate-800">비밀번호 변경</p>
              {pwSaved && <p className="text-xs text-primary mt-0.5">✓ 변경되었습니다</p>}
            </div>
            <span className="text-slate-300 text-lg">{showPwForm ? '∧' : '∨'}</span>
          </div>

          {showPwForm && (
            <div className="mt-4 flex flex-col gap-3">
              <CardDivider />
              {[
                { key: 'current', label: '현재 비밀번호', placeholder: '현재 비밀번호 입력' },
                { key: 'next',    label: '새 비밀번호',   placeholder: '8자 이상, 영문+숫자+특수문자' },
                { key: 'confirm', label: '새 비밀번호 확인', placeholder: '새 비밀번호 재입력' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-slate-500 font-medium block mb-1">{label}</label>
                  <input
                    type="password"
                    value={pw[key as keyof typeof pw]}
                    onChange={e => setPw(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-slate-200 rounded-item px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              ))}
              <div className="flex gap-2 mt-1">
                <Button variant="secondary" fullWidth onClick={() => setShowPwForm(false)}>취소</Button>
                <Button variant="primary"   fullWidth onClick={handlePwSave}>변경</Button>
              </div>
            </div>
          )}
        </Card>

        {/* ── 소셜 계정 연동 ────────────────────────────────── */}
        <Card>
          <p className="text-sm font-bold text-slate-800 mb-3">소셜 계정 연동</p>
          {SOCIAL_ACCOUNTS.map((acc, i) => (
            <div key={acc.provider}>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{acc.icon}</span>
                  <span className="text-sm text-slate-700">{acc.provider}</span>
                </div>
                {acc.connected ? (
                  <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-pill">연동됨</span>
                ) : (
                  <button className="text-xs text-primary font-semibold bg-primary-pale px-2.5 py-1 rounded-pill">
                    연동하기
                  </button>
                )}
              </div>
              {i < SOCIAL_ACCOUNTS.length - 1 && <CardDivider />}
            </div>
          ))}
        </Card>

        {/* ── 로그아웃 / 탈퇴 ──────────────────────────────── */}
        <Card>
          <button
            className="w-full text-left py-2.5 text-sm font-semibold text-slate-700"
            onClick={() => setShowLogoutConfirm(true)}
          >
            로그아웃
          </button>
          <CardDivider />
          <button
            className="w-full text-left py-2.5 text-sm font-semibold text-red-400"
            onClick={() => setShowDeleteConfirm(true)}
          >
            회원 탈퇴
          </button>
        </Card>

      </div>

      {/* ── 로그아웃 확인 ────────────────────────────────────── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full max-w-[767px] mx-auto bg-white rounded-t-3xl p-6">
            <p className="text-lg font-bold text-slate-900 mb-2">로그아웃 할까요?</p>
            <p className="text-sm text-slate-500 mb-6">연습 데이터는 그대로 유지됩니다.</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setShowLogoutConfirm(false)}>
                취소
              </Button>
              <Button variant="primary" fullWidth onClick={() => navigate('/login')}>
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 탈퇴 확인 ────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full max-w-[767px] mx-auto bg-white rounded-t-3xl p-6">
            <p className="text-lg font-bold text-slate-900 mb-2">정말 탈퇴할까요?</p>
            <p className="text-sm text-slate-500 mb-2">
              탈퇴 신청 후 <strong>30일 이내</strong>에는 취소할 수 있어요.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              30일 후 모든 연습 데이터가 <strong className="text-red-500">영구 삭제</strong>됩니다.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setShowDeleteConfirm(false)}>
                취소
              </Button>
              <Button variant="danger" fullWidth onClick={() => setShowDeleteConfirm(false)}>
                탈퇴 신청
              </Button>
            </div>
          </div>
        </div>
      )}

    </PageLayout>
  );
}
