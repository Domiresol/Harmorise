import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api';

const CODE_TTL = 180; // 3분

export function usePhoneVerification(signup: boolean) {
  const [phone,       setPhone]       = useState('');
  const [code,        setCode]        = useState('');
  const [codeSent,    setCodeSent]    = useState(false);
  const [verified,    setVerified]    = useState(false);
  const [phoneToken,  setPhoneToken]  = useState('');
  const [countdown,   setCountdown]   = useState(0);
  const [phoneError,  setPhoneError]  = useState('');
  const [codeError,   setCodeError]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 카운트다운 타이머
  useEffect(() => {
    if (!codeSent || countdown <= 0) return;
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [codeSent, countdown]);

  const formatTimer = () => {
    const m = Math.floor(countdown / 60).toString().padStart(2, '0');
    const s = (countdown % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const sendCode = async () => {
    setPhoneError('');
    if (!/^01[016789]\d{7,8}$/.test(phone)) {
      setPhoneError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/auth/phone/send-code?signup=${signup}`, {
        method: 'POST',
        body:   { phone },
      });
      setCodeSent(true);
      setCountdown(CODE_TTL);
      setCode('');
      setCodeError('');
    } catch (e: unknown) {
      setPhoneError(e instanceof Error ? e.message : '인증번호 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (): Promise<boolean> => {
    setCodeError('');
    if (code.length !== 6) { setCodeError('6자리 인증번호를 입력해주세요.'); return false; }
    if (countdown <= 0)    { setCodeError('인증 시간이 만료됐습니다. 재발송해주세요.'); return false; }
    setLoading(true);
    try {
      const res = await apiFetch<{ phoneToken: string }>('/auth/phone/verify', {
        method: 'POST',
        body:   { phone, code },
      });
      setPhoneToken(res.phoneToken);
      setVerified(true);
      clearInterval(timerRef.current!);
      return true;
    } catch (e: unknown) {
      setCodeError(e instanceof Error ? e.message : '인증에 실패했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    phone, setPhone,
    code,  setCode,
    codeSent, verified, phoneToken,
    countdown, formatTimer,
    phoneError, codeError,
    loading,
    sendCode, verifyCode,
  };
}
