import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePhoneVerification } from './usePhoneVerification';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
  TOKEN_KEY: 'harmorise_token',
}));

const mockApiFetch = vi.mocked(api.apiFetch);

describe('usePhoneVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 실제 타이머 사용 - 짧은 테스트 시간 동안 setInterval이 실제로 돌지 않음
  });

  it('초기 상태가 올바르다', () => {
    const { result } = renderHook(() => usePhoneVerification(true));

    expect(result.current.phone).toBe('');
    expect(result.current.codeSent).toBe(false);
    expect(result.current.verified).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.phoneError).toBe('');
  });

  // ─── sendCode ──────────────────────────────────────────────────────────────
  describe('sendCode', () => {
    it('올바른 번호면 API를 호출하고 codeSent를 true로 설정한다', async () => {
      mockApiFetch.mockResolvedValue(undefined);
      const { result } = renderHook(() => usePhoneVerification(true));

      await act(async () => {
        result.current.setPhone('01012345678');
      });
      await act(async () => {
        await result.current.sendCode();
      });

      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/phone/send-code'),
        expect.objectContaining({ method: 'POST', body: { phone: '01012345678' } }),
      );
      expect(result.current.codeSent).toBe(true);
      expect(result.current.countdown).toBe(180);
    });

    it('잘못된 번호 형식이면 API를 호출하지 않고 phoneError를 설정한다', async () => {
      const { result } = renderHook(() => usePhoneVerification(true));

      await act(async () => {
        result.current.setPhone('01234');
      });
      await act(async () => {
        await result.current.sendCode();
      });

      expect(mockApiFetch).not.toHaveBeenCalled();
      expect(result.current.phoneError).toBeTruthy();
    });

    it('API 오류 시 phoneError를 설정한다', async () => {
      mockApiFetch.mockRejectedValue(new Error('이미 가입된 전화번호입니다.'));
      const { result } = renderHook(() => usePhoneVerification(true));

      await act(async () => {
        result.current.setPhone('01012345678');
      });
      await act(async () => {
        await result.current.sendCode();
      });

      expect(result.current.phoneError).toBe('이미 가입된 전화번호입니다.');
      expect(result.current.codeSent).toBe(false);
    });
  });

  // ─── verifyCode ────────────────────────────────────────────────────────────
  describe('verifyCode', () => {
    it('6자리 코드와 남은 시간이 있으면 API를 호출하고 verified를 true로 설정한다', async () => {
      mockApiFetch
        .mockResolvedValueOnce(undefined)               // sendCode
        .mockResolvedValueOnce({ phoneToken: 'tok' });  // verifyCode

      const { result } = renderHook(() => usePhoneVerification(true));

      // 인증번호 발송
      await act(async () => { result.current.setPhone('01012345678'); });
      await act(async () => { await result.current.sendCode(); });

      // setCode는 별도 act (상태 반영 후 verifyCode 호출)
      await act(async () => { result.current.setCode('123456'); });

      let verified: boolean;
      await act(async () => { verified = await result.current.verifyCode(); });

      expect(verified!).toBe(true);
      expect(result.current.verified).toBe(true);
      expect(result.current.phoneToken).toBe('tok');
    });

    it('6자리 미만이면 codeError를 설정하고 false를 반환한다', async () => {
      mockApiFetch.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => usePhoneVerification(false));

      await act(async () => { result.current.setPhone('01012345678'); });
      await act(async () => { await result.current.sendCode(); });
      await act(async () => { result.current.setCode('123'); }); // 3자리

      let verified: boolean;
      await act(async () => { verified = await result.current.verifyCode(); });

      expect(verified!).toBe(false);
      expect(result.current.codeError).toBeTruthy();
    });

    it('countdown이 0이면 만료 에러를 설정한다', async () => {
      // sendCode 없이 초기 countdown=0 상태에서 바로 verifyCode 호출
      const { result } = renderHook(() => usePhoneVerification(false));

      await act(async () => { result.current.setCode('123456'); });

      let verified: boolean;
      await act(async () => { verified = await result.current.verifyCode(); });

      expect(verified!).toBe(false);
      expect(result.current.codeError).toContain('만료');
    });
  });

  // ─── formatTimer ───────────────────────────────────────────────────────────
  describe('formatTimer', () => {
    it('180초는 03:00으로 포맷된다', async () => {
      mockApiFetch.mockResolvedValue(undefined);
      const { result } = renderHook(() => usePhoneVerification(true));

      await act(async () => { result.current.setPhone('01012345678'); });
      await act(async () => { await result.current.sendCode(); });

      // sendCode 직후 countdown=180, 실제 타이머이므로 아직 0이 아님
      expect(result.current.countdown).toBe(180);
      expect(result.current.formatTimer()).toBe('03:00');
    });

    it('0초는 00:00으로 포맷된다', () => {
      const { result } = renderHook(() => usePhoneVerification(true));
      // 초기 countdown=0
      expect(result.current.formatTimer()).toBe('00:00');
    });
  });
});
