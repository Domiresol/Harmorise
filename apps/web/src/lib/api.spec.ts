import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, TOKEN_KEY } from './api';

// fetch 글로벌 모킹
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

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

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    ok:     status >= 200 && status < 300,
    status,
    json:   () => Promise.resolve(body),
  } as unknown as Response;
}

describe('apiFetch', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('GET 요청을 올바른 URL로 보낸다', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ data: 'ok' }));

    await apiFetch('/users/me');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users/me',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('POST 요청에 body를 JSON 직렬화하여 보낸다', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ accessToken: 'token' }));

    await apiFetch('/auth/login', { method: 'POST', body: { email: 'a@b.com' } });

    const call = mockFetch.mock.calls[0][1];
    expect(JSON.parse(call.body)).toEqual({ email: 'a@b.com' });
  });

  it('localStorage에 토큰이 있으면 Authorization 헤더를 자동으로 추가한다', async () => {
    localStorageMock.setItem(TOKEN_KEY, 'stored-token');
    mockFetch.mockResolvedValue(createJsonResponse({ ok: true }));

    await apiFetch('/users/me');

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer stored-token');
  });

  it('명시적으로 전달한 토큰이 localStorage보다 우선한다', async () => {
    localStorageMock.setItem(TOKEN_KEY, 'stored-token');
    mockFetch.mockResolvedValue(createJsonResponse({ ok: true }));

    await apiFetch('/users/me', { token: 'explicit-token' });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer explicit-token');
  });

  it('응답이 ok면 데이터를 반환한다', async () => {
    const responseData = { id: '123', email: 'test@example.com' };
    mockFetch.mockResolvedValue(createJsonResponse(responseData));

    const result = await apiFetch('/users/me');

    expect(result).toEqual(responseData);
  });

  it('401 응답이 오면 localStorage에서 토큰을 제거한다', async () => {
    localStorageMock.setItem(TOKEN_KEY, 'expired-token');
    mockFetch.mockResolvedValue(createJsonResponse({ message: 'Unauthorized' }, 401));

    await expect(apiFetch('/users/me')).rejects.toThrow();
    expect(localStorageMock.getItem(TOKEN_KEY)).toBeNull();
  });

  it('에러 응답의 message가 배열이면 첫 번째 항목으로 에러를 던진다', async () => {
    mockFetch.mockResolvedValue(
      createJsonResponse({ message: ['이메일 형식이 올바르지 않습니다.', '두 번째 오류'] }, 400),
    );

    await expect(apiFetch('/auth/signup', { method: 'POST', body: {} }))
      .rejects.toThrow('이메일 형식이 올바르지 않습니다.');
  });

  it('에러 응답의 message가 문자열이면 그대로 에러를 던진다', async () => {
    mockFetch.mockResolvedValue(
      createJsonResponse({ message: '이미 사용 중인 이메일입니다.' }, 409),
    );

    await expect(apiFetch('/auth/signup', { method: 'POST', body: {} }))
      .rejects.toThrow('이미 사용 중인 이메일입니다.');
  });
});
