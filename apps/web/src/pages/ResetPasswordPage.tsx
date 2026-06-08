import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { usePhoneVerification } from '../hooks/usePhoneVerification';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const phone = usePhoneVerification(false);

  const [step,         setStep]         = useState<1 | 2>(1); // 1: 전화인증, 2: 새 비번
  const [newPassword,  setNewPassword]  = useState('');
  const [pwConfirm,    setPwConfirm]    = useState('');
  const [submitError,  setSubmitError]  = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [done,         setDone]         = useState(false);

  const handleVerify = async () => {
    const ok = await phone.verifyCode();
    if (ok) setStep(2);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== pwConfirm) {
      setSubmitError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body:   { phone: phone.phone, phoneToken: phone.phoneToken, newPassword },
      });
      setDone(true);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-6">
      <div className="pt-14 pb-8">
        <button onClick={() => navigate(-1)} className="text-slate-400 mb-6 block">← 뒤로</button>
        <h1 className="text-2xl font-bold text-slate-800">비밀번호 초기화</h1>
        <p className="text-slate-500 text-sm mt-1">
          {step === 1 ? '본인 확인을 위해 전화번호를 인증해주세요.' : '새 비밀번호를 설정해주세요.'}
        </p>

        {/* 진행 단계 */}
        <div className="flex gap-2 mt-5">
          {[1, 2].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-sky-500' : 'bg-slate-100'}`}
            />
          ))}
        </div>
      </div>

      {/* 완료 화면 */}
      {done ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
          <div className="text-6xl">🔐</div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">비밀번호 변경 완료!</h2>
            <p className="text-slate-500 text-sm mt-2">새 비밀번호로 로그인해주세요.</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full max-w-sm py-4 bg-sky-500 text-white rounded-2xl font-semibold"
          >
            로그인하러 가기
          </button>
        </div>
      ) : (
        <>
          {/* STEP 1: 전화번호 인증 */}
          {step === 1 && (
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">휴대폰 번호</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone.phone}
                    onChange={e => phone.setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="01012345678"
                    maxLength={11}
                    disabled={phone.verified}
                    className="flex-1 px-4 py-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 disabled:bg-slate-50"
                  />
                  <button
                    onClick={phone.sendCode}
                    disabled={phone.loading || phone.verified}
                    className="px-4 py-3.5 bg-sky-500 text-white rounded-xl text-sm font-medium whitespace-nowrap disabled:opacity-50"
                  >
                    {phone.codeSent ? '재발송' : '인증 요청'}
                  </button>
                </div>
                {phone.phoneError && <p className="text-red-500 text-xs mt-1.5">{phone.phoneError}</p>}
              </div>

              {phone.codeSent && !phone.verified && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    인증번호
                    <span className={`ml-2 font-mono text-xs ${phone.countdown <= 30 ? 'text-red-500' : 'text-sky-500'}`}>
                      {phone.formatTimer()}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={phone.code}
                      onChange={e => phone.setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6자리 인증번호"
                      maxLength={6}
                      className="flex-1 px-4 py-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 tracking-widest"
                    />
                    <button
                      onClick={handleVerify}
                      disabled={phone.loading}
                      className="px-4 py-3.5 bg-slate-800 text-white rounded-xl text-sm font-medium whitespace-nowrap disabled:opacity-50"
                    >
                      확인
                    </button>
                  </div>
                  {phone.codeError && <p className="text-red-500 text-xs mt-1.5">{phone.codeError}</p>}
                </div>
              )}

              {phone.verified && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-sm">
                  <span>✓</span><span>본인 인증 완료</span>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!phone.verified}
                className="w-full py-4 bg-sky-500 text-white rounded-2xl font-semibold disabled:opacity-30 mt-2"
              >
                다음
              </button>
            </div>
          )}

          {/* STEP 2: 새 비밀번호 설정 */}
          {step === 2 && (
            <form onSubmit={handleReset} className="space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">새 비밀번호</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="영문+숫자 8자 이상"
                  required
                  className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">새 비밀번호 확인</label>
                <input
                  type="password"
                  value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력해주세요"
                  required
                  className={`w-full px-4 py-3.5 border rounded-xl text-sm focus:outline-none ${
                    pwConfirm && newPassword !== pwConfirm
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-slate-200 focus:border-sky-400'
                  }`}
                />
                {pwConfirm && newPassword !== pwConfirm && (
                  <p className="text-red-500 text-xs mt-1.5">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>

              {submitError && (
                <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-sky-500 text-white rounded-2xl font-semibold disabled:opacity-50"
              >
                {submitting ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
