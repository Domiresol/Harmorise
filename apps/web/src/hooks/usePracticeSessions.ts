import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

// ─── 타입 정의 ────────────────────────────────────────────────

export type PracticeType = 'BASIC' | 'SONG' | 'IMPROVISATION' | 'THEORY';

export interface PracticeSession {
  id: string;
  practicedAt: string;       // ISO 날짜 문자열
  durationMinutes: number;
  bpm: number | null;
  targetBpm: number | null;
  instrumentName: string | null;
  songTitle: string | null;
  artist: string | null;
  practiceTypes: PracticeType[];
  memos: { id: string; content: string; createdAt: string }[];
  createdAt: string;
}

export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastPracticedAt: string | null;
}

export interface CreatePracticeInput {
  practicedAt: string;
  durationMinutes: number;
  instrumentName?: string;
  songTitle?: string;
  artist?: string;
  bpm?: number;
  targetBpm?: number;
  practiceTypes?: PracticeType[];
  memo?: string;
}

export type UpdatePracticeInput = Partial<CreatePracticeInput> & { memo?: string | null };

// ─── 훅 ──────────────────────────────────────────────────────

export function usePracticeSessions() {
  const [sessions, setSessions]     = useState<PracticeSession[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [streak, setStreak]         = useState<Streak | null>(null);

  // ── 목록 fetch (초기 / 새로고침) ─────────────────────────
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: PracticeSession[]; nextCursor: string | null }>(
        '/practice',
      );
      setSessions(data.items);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 더 불러오기 (cursor 기반) ────────────────────────────
  const fetchMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ items: PracticeSession[]; nextCursor: string | null }>(
        `/practice?cursor=${nextCursor}`,
      );
      setSessions((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading]);

  // ── 단건 조회 ─────────────────────────────────────────────
  const getSession = useCallback(async (id: string): Promise<PracticeSession> => {
    return apiFetch<PracticeSession>(`/practice/${id}`);
  }, []);

  // ── 생성 ─────────────────────────────────────────────────
  const createSession = useCallback(
    async (input: CreatePracticeInput): Promise<PracticeSession> => {
      const created = await apiFetch<PracticeSession>('/practice', {
        method: 'POST',
        body: input,
      });
      // 목록 맨 앞에 추가
      setSessions((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  // ── 수정 ─────────────────────────────────────────────────
  const updateSession = useCallback(
    async (id: string, input: UpdatePracticeInput): Promise<PracticeSession> => {
      const updated = await apiFetch<PracticeSession>(`/practice/${id}`, {
        method: 'PATCH',
        body: input,
      });
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return updated;
    },
    [],
  );

  // ── 삭제 ─────────────────────────────────────────────────
  const deleteSession = useCallback(async (id: string) => {
    await apiFetch(`/practice/${id}`, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── 스트릭 fetch ──────────────────────────────────────────
  const fetchStreak = useCallback(async () => {
    try {
      const data = await apiFetch<Streak>('/practice/streak');
      setStreak(data);
    } catch {
      // 스트릭 실패는 조용히 무시
    }
  }, []);

  // ── 초기 로드 ─────────────────────────────────────────────
  useEffect(() => {
    fetchSessions();
    fetchStreak();
  }, [fetchSessions, fetchStreak]);

  return {
    sessions,
    loading,
    error,
    hasMore: !!nextCursor,
    streak,
    fetchSessions,
    fetchMore,
    getSession,
    createSession,
    updateSession,
    deleteSession,
    fetchStreak,
  };
}
