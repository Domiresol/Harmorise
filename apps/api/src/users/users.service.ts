import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** 내 정보 조회 */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id:            true,
        email:         true,
        phone:         true,
        role:          true,
        createdAt:     true,
        profile: {
          select: {
            nickname:           true,
            handle:             true,
            bio:                true,
            profileImageUrl:    true,
            mainInstrumentId:   true,
            dailyGoalMinutes:   true,
            weeklyGoalMinutes:  true,
            nicknameChangedAt:  true,
            mainInstrument:     { select: { id: true, name: true } },
          },
        },
        subscription: {
          select: { plan: true, expiresAt: true },
        },
        streak: {
          select: { currentStreak: true, longestStreak: true, lastPracticedAt: true },
        },
      },
    });

    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  /** 악기 마스터 목록 조회 */
  getInstruments() {
    return this.prisma.instrument.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true, category: true },
      orderBy: { name: 'asc' },
    });
  }

  /** 프로필 수정 */
  async updateMe(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });

    // 닉네임 월 1회 변경 제한
    if (dto.nickname !== undefined && profile?.nickname !== dto.nickname) {
      if (profile?.nicknameChangedAt) {
        const daysSince = (Date.now() - profile.nicknameChangedAt.getTime()) / 86_400_000;
        if (daysSince < 30) {
          const daysLeft = Math.ceil(30 - daysSince);
          throw new BadRequestException(`닉네임은 30일에 한 번만 변경할 수 있어요. ${daysLeft}일 후 변경 가능합니다.`);
        }
      }
    }

    // handle 중복 확인
    if (dto.handle !== undefined && dto.handle !== profile?.handle) {
      const exists = await this.prisma.userProfile.findUnique({ where: { handle: dto.handle } });
      if (exists) throw new ConflictException('이미 사용 중인 핸들입니다.');
    }

    await this.prisma.userProfile.upsert({
      where:  { userId },
      create: {
        userId,
        nickname:          dto.nickname          ?? '연습생',
        handle:            dto.handle            ?? `user_${userId.slice(0, 6)}`,
        bio:               dto.bio               ?? null,
        mainInstrumentId:  dto.mainInstrumentId  ?? null,
        dailyGoalMinutes:  dto.dailyGoalMinutes  ?? 30,
        weeklyGoalMinutes: dto.weeklyGoalMinutes ?? 150,
      },
      update: {
        ...(dto.nickname !== undefined && {
          nickname: dto.nickname,
          nicknameChangedAt: new Date(),
        }),
        ...(dto.handle            !== undefined && { handle:            dto.handle }),
        ...(dto.bio               !== undefined && { bio:               dto.bio }),
        ...(dto.mainInstrumentId  !== undefined && { mainInstrumentId:  dto.mainInstrumentId }),
        ...(dto.dailyGoalMinutes  !== undefined && { dailyGoalMinutes:  dto.dailyGoalMinutes }),
        ...(dto.weeklyGoalMinutes !== undefined && { weeklyGoalMinutes: dto.weeklyGoalMinutes }),
      },
    });

    return this.getMe(userId);
  }
}
