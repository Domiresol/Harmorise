import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const MOCK_USER = {
  id:        'user-uuid',
  email:     'test@example.com',
  phone:     '01012345678',
  role:      'USER',
  createdAt: new Date('2025-01-01'),
  profile: {
    nickname:          '기타리스트',
    profileImageUrl:   null,
    mainInstrumentId:  null,
    dailyGoalMinutes:  30,
    weeklyGoalMinutes: 150,
    mainInstrument:    null,
  },
  subscription: { plan: 'FREE', expiresAt: null },
  character:    { level: 1, exp: 0, characterType: 'GUITARIST' },
  streak:       { currentStreak: 5, longestStreak: 10, lastPracticedAt: new Date() },
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  userProfile: {
    upsert: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getMe ─────────────────────────────────────────────────────────────────
  describe('getMe', () => {
    it('userId로 사용자 정보를 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      const result = await service.getMe('user-uuid');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-uuid' } }),
      );
      expect(result).toMatchObject({
        id:    'user-uuid',
        email: 'test@example.com',
      });
    });

    it('사용자가 없으면 NotFoundException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateMe ──────────────────────────────────────────────────────────────
  describe('updateMe', () => {
    it('프로필 upsert 후 최신 사용자 데이터를 반환한다', async () => {
      mockPrisma.userProfile.upsert.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        ...MOCK_USER,
        profile: { ...MOCK_USER.profile, nickname: '새닉네임' },
      });

      const result = await service.updateMe('user-uuid', { nickname: '새닉네임' });

      expect(mockPrisma.userProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where:  { userId: 'user-uuid' },
          update: expect.objectContaining({ nickname: '새닉네임' }),
        }),
      );
      expect(result.profile?.nickname).toBe('새닉네임');
    });

    it('빈 dto를 전달해도 upsert가 호출된다', async () => {
      mockPrisma.userProfile.upsert.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      await service.updateMe('user-uuid', {});

      expect(mockPrisma.userProfile.upsert).toHaveBeenCalledTimes(1);
    });
  });
});
