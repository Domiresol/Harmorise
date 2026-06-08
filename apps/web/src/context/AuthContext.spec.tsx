import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
  apiFetch:  vi.fn(),
  TOKEN_KEY: 'harmorise_token',
}));

const mockApiFetch = vi.mocked(api.apiFetch);

// localStorage 모킹
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

const MOCK_USER = {
  id:           'user-uuid',
  email:        'test@example.com',
  phone:        '01012345678',
  role:         'USER',
  createdAt:    '2025-01-01T00:00:00.000Z',
  profile:      { nickname: '기타리스트', profileImageUrl: null, mainInstrumentId: null, dailyGoalMinutes: 30, weeklyGoalMinutes: 150, mainInstrument: null },
  subscription: { plan: 'FREE' as const, expiresAt: null },
  character:    { level: 1, exp: 0, characterType: 'GUITARIST' },
  streak:       { currentStreak: 3, longestStreak: 10, lastPracticedAt: null },
};

/** 컨텍스트 값을 읽기 위한 헬퍼 컴포넌트 */
function AuthConsumer({ onRender }: { onRender: (auth: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth();
  onRender(auth);
  return null;
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ─── 초기 로딩 ──────────────────────────────────────────────────────────────
  it('localStorage에 토큰이 없으면 isLoggedIn이 false이다', async () => {
    let captured: ReturnType<typeof useAuth> | null = null;

    render(
      <AuthProvider>
        <AuthConsumer onRender={(auth) => { captured = auth; }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(captured?.isLoading).toBe(false));
    expect(captured?.isLoggedIn).toBe(false);
    expect(captured?.user).toBeNull();
  });

  it('localStorage에 토큰이 있으면 사용자 정보를 fetch한다', async () => {
    localStorageMock.setItem('harmorise_token', 'existing-token');
    mockApiFetch.mockResolvedValue(MOCK_USER);

    let captured: ReturnType<typeof useAuth> | null = null;

    render(
      <AuthProvider>
        <AuthConsumer onRender={(auth) => { captured = auth; }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(captured?.isLoading).toBe(false));

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/users/me',
      expect.objectContaining({ token: 'existing-token' }),
    );
    expect(captured?.isLoggedIn).toBe(true);
    expect(captured?.user?.email).toBe('test@example.com');
  });

  it('초기 fetch 실패 시 isLoggedIn이 false이다', async () => {
    localStorageMock.setItem('harmorise_token', 'bad-token');
    mockApiFetch.mockRejectedValue(new Error('Unauthorized'));

    let captured: ReturnType<typeof useAuth> | null = null;

    render(
      <AuthProvider>
        <AuthConsumer onRender={(auth) => { captured = auth; }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(captured?.isLoading).toBe(false));

    expect(captured?.isLoggedIn).toBe(false);
    expect(captured?.user).toBeNull();
  });

  // ─── login ──────────────────────────────────────────────────────────────────
  it('login()은 토큰을 저장하고 사용자 정보를 fetch한다', async () => {
    mockApiFetch.mockResolvedValue(MOCK_USER);

    let captured: ReturnType<typeof useAuth> | null = null;

    render(
      <AuthProvider>
        <AuthConsumer onRender={(auth) => { captured = auth; }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(captured?.isLoading).toBe(false));

    await act(async () => {
      await captured!.login('new-access-token');
    });

    expect(localStorageMock.getItem('harmorise_token')).toBe('new-access-token');
    expect(captured?.isLoggedIn).toBe(true);
    expect(captured?.user?.email).toBe('test@example.com');
  });

  // ─── logout ─────────────────────────────────────────────────────────────────
  it('logout()은 토큰을 제거하고 user를 null로 만든다', async () => {
    localStorageMock.setItem('harmorise_token', 'token');
    mockApiFetch.mockResolvedValue(MOCK_USER);

    let captured: ReturnType<typeof useAuth> | null = null;

    render(
      <AuthProvider>
        <AuthConsumer onRender={(auth) => { captured = auth; }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(captured?.isLoggedIn).toBe(true));

    act(() => { captured!.logout(); });

    expect(localStorageMock.getItem('harmorise_token')).toBeNull();
    expect(captured?.user).toBeNull();
    expect(captured?.isLoggedIn).toBe(false);
  });

  // ─── useAuth outside Provider ──────────────────────────────────────────────
  it('AuthProvider 없이 사용하면 에러를 던진다', () => {
    // 콘솔 에러 억제
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => {
      render(<AuthConsumer onRender={() => undefined} />);
    }).toThrow();

    consoleSpy.mockRestore();
  });
});
