import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // 대시보드 핵심 지표
  // ─────────────────────────────────────────────────────────────
  async getOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      dau,
      premiumCount,
      avgResult,
      newUsersThisWeek,
    ] = await Promise.all([
      // 전체 가입자
      this.prisma.user.count(),

      // DAU: 오늘 lastLoginAt 또는 오늘 연습 세션이 있는 유저
      this.prisma.user.count({
        where: { lastLoginAt: { gte: todayStart } },
      }),

      // 프리미엄 구독자 (활성)
      this.prisma.subscription.count({
        where: { plan: 'PREMIUM', isActive: true },
      }),

      // 최근 30일 평균 연습 시간
      this.prisma.practiceSession.aggregate({
        _avg: { durationMinutes: true },
        where: {
          practicedAt: { gte: new Date(Date.now() - 30 * 86400 * 1000) },
        },
      }),

      // 이번 주 신규 가입자
      this.prisma.user.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 86400 * 1000) },
        },
      }),
    ]);

    return {
      totalUsers,
      dau,
      premiumCount,
      premiumRate: totalUsers > 0 ? Math.round((premiumCount / totalUsers) * 1000) / 10 : 0,
      avgPracticeMinutes: Math.round(avgResult._avg.durationMinutes ?? 0),
      newUsersThisWeek,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 활동 통계: 요일별 세션 + 악기 분포
  // ─────────────────────────────────────────────────────────────
  async getActivity() {
    const fourWeeksAgo = new Date(Date.now() - 28 * 86400 * 1000);

    // 요일별 세션 수 (0=일 ~ 6=토, PostgreSQL DOW)
    const weekdayRaw = await this.prisma.$queryRaw<{ dow: number; count: bigint }[]>`
      SELECT EXTRACT(DOW FROM "practiced_at") AS dow, COUNT(*) AS count
      FROM practice_sessions
      WHERE "practiced_at" >= ${fourWeeksAgo}
      GROUP BY dow
      ORDER BY dow
    `;

    const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
    const weekdaySessions = DOW_LABELS.map((label, i) => {
      const found = weekdayRaw.find(r => Number(r.dow) === i);
      return { label, count: found ? Number(found.count) : 0 };
    });

    // 악기 분포 (상위 5개 + 기타)
    const instrumentRaw = await this.prisma.practiceSession.groupBy({
      by: ['instrumentId'],
      _count: { id: true },
      where: {
        instrumentId: { not: null },
        practicedAt: { gte: fourWeeksAgo },
      },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const instrumentIds = instrumentRaw
      .map(r => r.instrumentId)
      .filter((id): id is string => id !== null);

    const instruments = await this.prisma.instrument.findMany({
      where: { id: { in: instrumentIds } },
      select: { id: true, name: true },
    });

    const total = instrumentRaw.reduce((s, r) => s + r._count.id, 0);
    const instrumentDist = instrumentRaw.map(r => {
      const name = instruments.find(i => i.id === r.instrumentId)?.name ?? '기타';
      return {
        name,
        count: r._count.id,
        percentage: total > 0 ? Math.round((r._count.id / total) * 100) : 0,
      };
    });

    return { weekdaySessions, instrumentDist };
  }

  // ─────────────────────────────────────────────────────────────
  // 유저 목록 (cursor 기반 페이지네이션, 이메일 검색)
  // ─────────────────────────────────────────────────────────────
  async getUsers(cursor?: string, limit = 20, search?: string) {
    const where = search
      ? { email: { contains: search, mode: 'insensitive' as const } }
      : {};

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id:          true,
        email:       true,
        role:        true,
        isActive:    true,
        createdAt:   true,
        lastLoginAt: true,
        profile: { select: { nickname: true } },
        subscription: { select: { plan: true, isActive: true } },
        _count: { select: { practiceSessions: true } },
      },
    });

    const hasNext = users.length > limit;
    const items   = hasNext ? users.slice(0, limit) : users;

    return {
      items: items.map(u => ({
        id:            u.id,
        email:         this.maskEmail(u.email),
        nickname:      u.profile?.nickname ?? null,
        role:          u.role,
        isActive:      u.isActive,
        plan:          u.subscription?.plan ?? 'FREE',
        isPremium:     u.subscription?.plan === 'PREMIUM' && u.subscription.isActive,
        sessionCount:  u._count.practiceSessions,
        lastLoginAt:   u.lastLoginAt,
        createdAt:     u.createdAt,
      })),
      nextCursor: hasNext ? items[items.length - 1].id : null,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 유저 활성/정지 토글
  // ─────────────────────────────────────────────────────────────
  async updateUserStatus(targetId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    await this.prisma.user.update({
      where: { id: targetId },
      data:  { isActive },
    });

    return { id: targetId, isActive };
  }

  // ─────────────────────────────────────────────────────────────
  // 헬퍼
  // ─────────────────────────────────────────────────────────────
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const masked =
      local.length <= 2
        ? local[0] + '*'.repeat(local.length - 1)
        : local[0] + '*'.repeat(local.length - 2) + local.slice(-1);
    return `${masked}@${domain}`;
  }
}
