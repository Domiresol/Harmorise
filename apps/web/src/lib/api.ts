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

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.');
  }

  const data = await res.json().catch(() => ({}));

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

// ──────────────────────────────────────────────────────────
// 리포트 타입 정의
// ──────────────────────────────────────────────────────────

export interface WeeklyReportItem {
  year: number;
  week: number;
  label: string;
  dateRange: string;
  totalMinutes: number;
  practicedDays: number;
  prevDiffMinutes: number | null;
}

export interface MonthlyReportItem {
  year: number;
  month: number;
  label: string;
  totalMinutes: number;
  practicedDays: number;
  prevDiffMinutes: number | null;
}

export interface WeeklyReportDetail {
  year: number;
  week: number;
  label: string;
  dateRange: string;
  totalMinutes: number;
  practicedDays: number;
  prevDiffMinutes: number | null;
  streak: number;
  dayData: { day: string; date: string; minutes: number }[];
  topSongs: { title: string; minutes: number }[];
  bpmGains: { title: string; fromBpm: number; toBpm: number }[];
}

export interface MonthlyReportDetail {
  year: number;
  month: number;
  label: string;
  totalMinutes: number;
  practicedDays: number;
  prevDiffMinutes: number | null;
  bestStreak: number;
  instruments: { name: string; minutes: number; color: string }[];
  topBpmSong: { title: string; fromBpm: number; toBpm: number } | null;
  dayHeatmap: number[];
  hourHeatmap: number[];
}

// ──────────────────────────────────────────────────────────
// 리포트 API 함수
// ──────────────────────────────────────────────────────────

export function fetchWeeklyReportList(limit = 10) {
  return apiFetch<WeeklyReportItem[]>(`/practice/stats/report-list?type=weekly&limit=${limit}`);
}

export function fetchMonthlyReportList(limit = 10) {
  return apiFetch<MonthlyReportItem[]>(`/practice/stats/report-list?type=monthly&limit=${limit}`);
}

export function fetchWeeklyReport(year: number, week: number) {
  return apiFetch<WeeklyReportDetail>(`/practice/stats/weekly?year=${year}&week=${week}`);
}

export function fetchMonthlyReport(year: number, month: number) {
  return apiFetch<MonthlyReportDetail>(`/practice/stats/monthly-detail?year=${year}&month=${month}`);
}
