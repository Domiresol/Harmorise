import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PracticeService } from './practice.service';
import { PrismaService }   from '../prisma/prisma.service';

// ─── Prisma 모킹 헬퍼 ──────────────────────────────────────────
const mockPrisma = {
  instrument: {
    upsert: jest.fn(),
  },
  song: {
    findFirst: jest.fn(),
    create:    jest.fn(),
  },
  practiceSession: {
    create:     jest.fn(),
    findMany:   jest.fn(),
    findUnique: jest.fn(),
    delete:     jest.fn(),
  },
  bpmRecord: {
    create: jest.fn(),
  },
  streak: {
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
  },
  $transaction: jest.fn(),
};

// ─── 공통 픽스처 ──────────────────────────────────────────────
const USER_ID    = 'user-uuid-001';
const SESSION_ID = 'session-uuid-001';
const SONG_ID    = 'song-uuid-001';
const INST_ID    = 'inst-uuid-001';

const baseSession = {
  id:              SESSION_ID,
  userId:          USER_ID,
  practicedAt:     new Date('2026-05-27'),
  durationMinutes: 45,
  bpm:             120,
  instrumentId:    INST_ID,
  songId:          SONG_ID,
  createdAt:       new Date(),
  updatedAt:       new Date(),
  sessionTypes:    [{ practiceType: 'SONG' }, { practiceType: 'BASIC' }],
  memos:           [{ id: 'memo-1', content: '잘됐음', createdAt: new Date() }],
  instrument:      { name: '기타' },
  song:            { title: 'Blackbird', artist: 'Beatles' },
};

// ─── 테스트 스위트 ─────────────────────────────────────────────
describe('PracticeService', () => {
  let service: PracticeService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PracticeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PracticeService>(PracticeService);
  });

  // ─── create ─────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      practicedAt:     '2026-05-27',
      durationMinutes: 45,
      instrumentName:  '기타',
      songTitle:       'Blackbird',
      bpm:             120,
      practiceTypes:   ['SONG' as const, 'BASIC' as const],
      memo:            '잘됐음',
    };

    beforeEach(() => {
      mockPrisma.instrument.upsert.mockResolvedValue({ id: INST_ID, name: '기타' });
      mockPrisma.song.findFirst.mockResolvedValue({ id: SONG_ID, title: 'Blackbird' });
      // $transaction은 콜백을 받아 실행
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) =>
        cb(mockPrisma),
      );
      mockPrisma.practiceSession.create.mockResolvedValue(baseSession);
      mockPrisma.bpmRecord.create.mockResolvedValue({});
      mockPrisma.streak.findUnique.mockResolvedValue(null); // 첫 연습
      mockPrisma.streak.create.mockResolvedValue({});
    });

    it('새 연습 세션을 생성하고 포맷된 결과를 반환한다', async () => {
      const result = await service.create(USER_ID, dto);

      expect(mockPrisma.instrument.upsert).toHaveBeenCalledWith({
        where:  { name: '기타' },
        create: { name: '기타' },
        update: {},
      });
      expect(mockPrisma.song.findFirst).toHaveBeenCalledWith({
        where: { userId: USER_ID, title: 'Blackbird' },
      });
      expect(mockPrisma.practiceSession.create).toHaveBeenCalled();
      expect(result.id).toBe(SESSION_ID);
      expect(result.songTitle).toBe('Blackbird');
      expect(result.practiceTypes).toContain('SONG');
    });

    it('기존 곡이 있으면 새로 생성하지 않는다', async () => {
      mockPrisma.song.findFirst.mockResolvedValue({ id: SONG_ID, title: 'Blackbird' });

      await service.create(USER_ID, dto);

      expect(mockPrisma.song.create).not.toHaveBeenCalled();
    });

    it('기존 곡이 없으면 새 Song을 생성한다', async () => {
      mockPrisma.song.findFirst.mockResolvedValue(null);
      mockPrisma.song.create.mockResolvedValue({ id: 'new-song', title: 'Blackbird' });

      await service.create(USER_ID, dto);

      expect(mockPrisma.song.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, title: 'Blackbird', artist: undefined },
      });
    });

    it('songId와 bpm이 있으면 BpmRecord도 생성한다', async () => {
      await service.create(USER_ID, dto);

      expect(mockPrisma.bpmRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: USER_ID, bpm: 120 }),
      });
    });

    it('첫 연습이면 streak를 1로 초기화한다', async () => {
      mockPrisma.streak.findUnique.mockResolvedValue(null);

      await service.create(USER_ID, dto);

      expect(mockPrisma.streak.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId:        USER_ID,
          currentStreak: 1,
          longestStreak: 1,
        }),
      });
    });

    it('연속 연습이면 streak를 증가시킨다', async () => {
      const yesterday = new Date('2026-05-26');
      mockPrisma.streak.findUnique.mockResolvedValue({
        userId:          USER_ID,
        currentStreak:   3,
        longestStreak:   5,
        lastPracticedAt: yesterday,
      });

      await service.create(USER_ID, dto);

      expect(mockPrisma.streak.update).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data:  expect.objectContaining({ currentStreak: 4 }),
      });
    });

    it('2일 이상 공백이면 streak를 1로 초기화한다', async () => {
      const threeDaysAgo = new Date('2026-05-24');
      mockPrisma.streak.findUnique.mockResolvedValue({
        userId:          USER_ID,
        currentStreak:   5,
        longestStreak:   7,
        lastPracticedAt: threeDaysAgo,
      });

      await service.create(USER_ID, dto);

      expect(mockPrisma.streak.update).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data:  expect.objectContaining({ currentStreak: 1 }),
      });
    });

    it('오늘 이미 연습했으면 streak를 변경하지 않는다', async () => {
      const today = new Date('2026-05-27');
      mockPrisma.streak.findUnique.mockResolvedValue({
        userId:          USER_ID,
        currentStreak:   2,
        longestStreak:   5,
        lastPracticedAt: today,
      });

      await service.create(USER_ID, dto);

      expect(mockPrisma.streak.update).not.toHaveBeenCalled();
    });
  });

  // ─── findAll ─────────────────────────────────────────────────
  describe('findAll', () => {
    it('세션 목록과 nextCursor를 반환한다', async () => {
      mockPrisma.practiceSession.findMany.mockResolvedValue([baseSession]);

      const result = await service.findAll(USER_ID);

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull(); // limit+1보다 적으므로
      expect(result.items[0].id).toBe(SESSION_ID);
    });

    it('limit+1개가 오면 hasNext=true이고 nextCursor를 반환한다', async () => {
      const sessions = Array.from({ length: 21 }, (_, i) => ({
        ...baseSession,
        id: `session-${i}`,
      }));
      mockPrisma.practiceSession.findMany.mockResolvedValue(sessions);

      const result = await service.findAll(USER_ID, undefined, 20);

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe('session-19');
    });
  });

  // ─── findOne ─────────────────────────────────────────────────
  describe('findOne', () => {
    it('본인 세션을 정상적으로 조회한다', async () => {
      mockPrisma.practiceSession.findUnique.mockResolvedValue(baseSession);

      const result = await service.findOne(USER_ID, SESSION_ID);

      expect(result.id).toBe(SESSION_ID);
    });

    it('존재하지 않으면 NotFoundException을 던진다', async () => {
      mockPrisma.practiceSession.findUnique.mockResolvedValue(null);

      await expect(service.findOne(USER_ID, SESSION_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('다른 사용자의 세션이면 ForbiddenException을 던진다', async () => {
      mockPrisma.practiceSession.findUnique.mockResolvedValue({
        ...baseSession,
        userId: 'other-user',
      });

      await expect(service.findOne(USER_ID, SESSION_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── remove ──────────────────────────────────────────────────
  describe('remove', () => {
    it('본인 세션을 삭제한다', async () => {
      mockPrisma.practiceSession.findUnique.mockResolvedValue({
        userId: USER_ID,
      });
      mockPrisma.practiceSession.delete.mockResolvedValue({});

      const result = await service.remove(USER_ID, SESSION_ID);

      expect(mockPrisma.practiceSession.delete).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
      });
      expect(result.message).toContain('삭제');
    });

    it('존재하지 않으면 NotFoundException을 던진다', async () => {
      mockPrisma.practiceSession.findUnique.mockResolvedValue(null);

      await expect(service.remove(USER_ID, SESSION_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('다른 사용자의 세션이면 ForbiddenException을 던진다', async () => {
      mockPrisma.practiceSession.findUnique.mockResolvedValue({
        userId: 'other-user',
      });

      await expect(service.remove(USER_ID, SESSION_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── getStreak ───────────────────────────────────────────────
  describe('getStreak', () => {
    it('streak 데이터를 반환한다', async () => {
      mockPrisma.streak.findUnique.mockResolvedValue({
        userId:          USER_ID,
        currentStreak:   3,
        longestStreak:   7,
        lastPracticedAt: new Date('2026-05-26'),
      });

      const result = await service.getStreak(USER_ID);

      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(7);
    });

    it('streak가 없으면 기본값(0)을 반환한다', async () => {
      mockPrisma.streak.findUnique.mockResolvedValue(null);

      const result = await service.getStreak(USER_ID);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
    });
  });
});
