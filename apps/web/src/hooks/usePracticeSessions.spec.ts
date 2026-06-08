import { renderHook, act, waitFor } from '@testing-library/react';
import { usePracticeSessions }       from './usePracticeSessions';
import * as apiModule                from '../lib/api';

// ─── apiFetch 모킹 ────────────────────────────────────────────
vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiModule.apiFetch);

// ─── 공통 픽스처 ──────────────────────────────────────────────
const makeSession = (id: string) => ({
  id,
  practicedAt:     '2026-05-27',
  durationMinutes: 45,
  bpm:             120,
  instrumentName:  '기타',
  songTitle:       'Blackbird',
  artist:          'Beatles',
  practiceTypes:   ['SONG', 'BASIC'],
  memos:           [],
  createdAt:       '2026-05-27T10:00:00Z',
});

const mockListResponse = (items: ReturnType<typeof makeSession>[], nextCursor: string | null = null) => ({
  items,
  nextCursor,
});

const mockStreak = {
  currentStreak:   3,
  longestStreak:   5,
  lastPracticedAt: '2026-05-26',
};

// ─── 테스트 스위트 ─────────────────────────────────────────────
describe('usePracticeSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 초기 로드 ────────────────────────────────────────────
  describe('초기 로드', () => {
    it('마운트 시 목록과 스트릭을 fetch한다', async () => {
      mockApiFetch
        .mockResolvedValueOnce(mockListResponse([makeSession('s1'), makeSession('s2')]))
        .mockResolvedValueOnce(mockStreak);

      const { result } = renderHook(() => usePracticeSessions());

      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.sessions[0].id).toBe('s1');
      expect(result.current.streak?.currentStreak).toBe(3);
    });

    it('fetch 실패 시 error 메시지를 설정한다', async () => {
      mockApiFetch
        .mockRejectedValueOnce(new Error('네트워크 오류'))
        .mockResolvedValueOnce(mockStreak);

      const { result } = renderHook(() => usePracticeSessions());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('네트워크 오류');
      expect(result.current.sessions).toHaveLength(0);
    });

    it('nextCursor가 있으면 hasMore가 true다', async () => {
      mockApiFetch
        .mockResolvedValueOnce(mockListResponse([makeSession('s1')], 's1'))
        .mockResolvedValueOnce(mockStreak);

      const { result } = renderHook(() => usePracticeSessions());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasMore).toBe(true);
    });
  });

  // ─── fetchMore ────────────────────────────────────────────
  describe('fetchMore', () => {
    it('cursor를 포함해 추가 목록을 불러오고 기존 목록에 추가한다', async () => {
      mockApiFetch
        .mockResolvedValueOnce(mockListResponse([makeSession('s1')], 's1'))
        .mockResolvedValueOnce(mockStreak)
        .mockResolvedValueOnce(mockListResponse([makeSession('s2')], null));

      const { result } = renderHook(() => usePracticeSessions());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.fetchMore();
      });

      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.sessions[1].id).toBe('s2');
      expect(result.current.hasMore).toBe(false);
      expect(mockApiFetch).toHaveBeenCalledWith('/practice?cursor=s1');
    });
  });

  // ─── createSession ────────────────────────────────────────
  describe('createSession', () => {
    it('세션을 생성하고 목록 맨 앞에 추가한다', async () => {
      const newSession = makeSession('new-id');

      mockApiFetch
        .mockResolvedValueOnce(mockListResponse([makeSession('s1')]))
        .mockResolvedValueOnce(mockStreak)
        .mockResolvedValueOnce(newSession); // POST 응답

      const { result } = renderHook(() => usePracticeSessions());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let created: Awaited<ReturnType<typeof result.current.createSession>>;
      await act(async () => {
        created = await result.current.createSession({
          practicedAt:     '2026-05-27',
          durationMinutes: 45,
        });
      });

      expect(created!.id).toBe('new-id');
      expect(result.current.sessions[0].id).toBe('new-id');
      expect(result.current.sessions).toHaveLength(2);
      expect(mockApiFetch).toHaveBeenCalledWith('/practice', expect.objectContaining({
        method: 'POST',
      }));
    });

    it('생성 실패 시 에러를 던진다', async () => {
      mockApiFetch
        .mockResolvedValueOnce(mockListResponse([]))
        .mockResolvedValueOnce(mockStreak)
        .mockRejectedValueOnce(new Error('서버 오류'));

      const { result } = renderHook(() => usePracticeSessions());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.createSession({
            practicedAt:     '2026-05-27',
            durationMinutes: 30,
          });
        }),
      ).rejects.toThrow('서버 오류');
    });
  });

  // ─── deleteSession ────────────────────────────────────────
  describe('deleteSession', () => {
    it('세션을 삭제하고 목록에서 제거한다', async () => {
      mockApiFetch
        .mockResolvedValueOnce(mockListResponse([makeSession('s1'), makeSession('s2')]))
        .mockResolvedValueOnce(mockStreak)
        .mockResolvedValueOnce({ message: '삭제되었습니다.' }); // DELETE 응답

      const { result } = renderHook(() => usePracticeSessions());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deleteSession('s1');
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].id).toBe('s2');
      expect(mockApiFetch).toHaveBeenCalledWith('/practice/s1', { method: 'DELETE' });
    });
  });

  // ─── getSession ───────────────────────────────────────────
  describe('getSession', () => {
    it('단건 세션을 조회한다', async () => {
      const session = makeSession('s1');

      mockApiFetch
        .mockResolvedValueOnce(mockListResponse([]))
        .mockResolvedValueOnce(mockStreak)
        .mockResolvedValueOnce(session);

      const { result } = renderHook(() => usePracticeSessions());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let fetched: Awaited<ReturnType<typeof result.current.getSession>>;
      await act(async () => {
        fetched = await result.current.getSession('s1');
      });

      expect(fetched!.id).toBe('s1');
      expect(mockApiFetch).toHaveBeenCalledWith('/practice/s1');
    });
  });
});
