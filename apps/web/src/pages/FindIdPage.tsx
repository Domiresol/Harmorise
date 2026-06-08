import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { usePhoneVerification } from '../hooks/usePhoneVerification';

export function FindIdPage() {
  const navigate = useNavigate();
  const phone = usePhoneVerification(false /* 기존 번호 체크 없음 */);
  const [foundEmail,   setFoundEmail]   = useState('');
  const [submitError,  setSubmitError]  = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  const handleVerify = async () => {
    await phone.verifyCode();
  };

  const handleFindId = async () => {
    if (!phone.verified) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ email: string }>('/auth/find-id', {
        method: 'POST',
        body:   { phone: phone.phone, phoneToken: phone.phoneToken },
      });
      setFoundEmail(res.email);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : '아이디 찾기에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-6">
      <div className="pt-14 pb-8">
        <button onClick={() => navigate(-1)} className="text-slate-400 mb-6 block">← 뒤로</button>
        <h1 className="text-2xl font-bold text-slate-800">아이디 찾기</h1>
        <p className="text-slate-500 text-sm mt-1">가입 시 등록한 전화번호로 확인해요.</p>
      </div>

      {/* 결과 화면 */}
      {foundEmail ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
          <div className="text-5xl">📧</div>
          <div>
            <p className="text-slate-500 text-sm mb-2">가입된 이메일 주소</p>
            <p className="text-xl font-bold text-slate-800">{foundEmail}</p>
          </div>
          <div className="w-full space-y-3 max-w-sm">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-sky-500 text-white rounded-2xl font-semibold"
            >
              로그인하러 가기
            </button>
            <button
              onClick={() => navigate('/reset-password')}
              className="w-full py-4 border border-slate-200 text-slate-700 rounded-2xl font-semibold"
            >
              비밀번호 초기화
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 flex-1">
          {/* 전화번호 입력 */}
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

          {/* 인증번호 입력 */}
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
              <span>✓</span><span>전화번호 인증 완료</span>
            </div>
          )}

          {submitError && (
            <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{submitError}</p>
          )}

          <button
            onClick={handleFindId}
            disabled={!phone.verified || submitting}
            className="w-full py-4 bg-sky-500 text-white rounded-2xl font-semibold text-base disabled:opacity-30 mt-2"
          >
            {submitting ? '조회 중...' : '아이디 찾기'}
          </button>

          <p className="text-center text-sm text-slate-500 pt-2">
            <Link to="/reset-password" className="text-sky-500 font-medium">비밀번호를 잊으셨나요?</Link>
          </p>
        </div>
      )}
    </div>
  );
}
