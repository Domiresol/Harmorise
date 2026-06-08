import { Injectable, NotFoundException } from '@nestjs/common';
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
            nickname:          true,
            profileImageUrl:   true,
            mainInstrumentId:  true,
            dailyGoalMinutes:  true,
            weeklyGoalMinutes: true,
            mainInstrument:    { select: { id: true, name: true } },
          },
        },
        subscription: {
          select: { plan: true, expiresAt: true },
        },
        character: {
          select: { level: true, exp: true, characterType: true },
        },
        streak: {
          select: { currentStreak: true, longestStreak: true, lastPracticedAt: true },
        },
      },
    });

    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  /** 프로필 수정 */
  async updateMe(userId: string, dto: UpdateProfileDto) {
    // profile 행이 없으면 생성
    await this.prisma.userProfile.upsert({
      where:  { userId },
      create: {
        userId,
        nickname:          dto.nickname          ?? '연습생',
        mainInstrumentId:  dto.mainInstrumentId  ?? null,
        dailyGoalMinutes:  dto.dailyGoalMinutes  ?? 30,
        weeklyGoalMinutes: dto.weeklyGoalMinutes ?? 150,
      },
      update: {
        ...(dto.nickname          !== undefined && { nickname:          dto.nickname }),
        ...(dto.mainInstrumentId  !== undefined && { mainInstrumentId:  dto.mainInstrumentId }),
        ...(dto.dailyGoalMinutes  !== undefined && { dailyGoalMinutes:  dto.dailyGoalMinutes }),
        ...(dto.weeklyGoalMinutes !== undefined && { weeklyGoalMinutes: dto.weeklyGoalMinutes }),
      },
    });

    return this.getMe(userId);
  }
}
