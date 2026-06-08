const BASE = 'http://localhost:3000/api';
const TOKEN_KEY = 'harmorise_token';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function apiFetch<T>(
  path: string,
  options: { method?: Method; body?: unknown; token?: string } = {},
): Promise<T> {
  const { method = 'GET', body } = options;

  // 명시적으로 토큰 전달하면 그걸 쓰고, 없으면 localStorage에서 자동으로
  const token = options.token ?? localStorage.getItem(TOKEN_KEY) ?? undefined;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    // 401이면 토큰 만료 → 스토리지 정리
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    throw new Error(
      Array.isArray(data?.message) ? data.message[0] : (data?.message ?? '서버 오류가 발생했습니다.')
    );
  }

  return data as T;
}

export { TOKEN_KEY };
