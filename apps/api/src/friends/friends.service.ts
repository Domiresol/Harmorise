import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendFriendRequestDto, RespondFriendRequestDto } from './dto/friend.dto';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── 유저 검색 (닉네임 or @handle) ───────────────────────────
  async searchUsers(query: string, requesterId: string) {
    if (!query || query.trim().length < 1) return [];

    const q = query.trim();
    const users = await this.prisma.userProfile.findMany({
      where: {
        AND: [
          { userId: { not: requesterId } },
          {
            OR: [
              { nickname: { contains: q, mode: 'insensitive' } },
              { handle: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        userId: true,
        nickname: true,
        handle: true,
        bio: true,
        profileImageUrl: true,
      },
      take: 20,
    });

    // 각 유저와의 친구 관계 상태 병합
    const friendships = await this.prisma.friend.findMany({
      where: { userId: requesterId, friendId: { in: users.map(u => u.userId) } },
      select: { friendId: true },
    });
    const friendSet = new Set(friendships.map(f => f.friendId));

    const pendingRequests = await this.prisma.friendRequest.findMany({
      where: {
        OR: [
          { fromUserId: requesterId, toUserId: { in: users.map(u => u.userId) } },
          { toUserId: requesterId, fromUserId: { in: users.map(u => u.userId) } },
        ],
        status: 'PENDING',
      },
      select: { fromUserId: true, toUserId: true },
    });

    return users.map(u => ({
      userId: u.userId,
      nickname: u.nickname,
      handle: u.handle,
      bio: u.bio,
      profileImageUrl: u.profileImageUrl,
      isFriend: friendSet.has(u.userId),
      requestPending: pendingRequests.some(
        r => r.fromUserId === requesterId && r.toUserId === u.userId,
      ),
    }));
  }

  // ── 친구 요청 발송 ───────────────────────────────────────────
  async sendRequest(fromUserId: string, dto: SendFriendRequestDto) {
    const { toUserId } = dto;

    if (fromUserId === toUserId) {
      throw new BadRequestException('자신에게 친구 요청을 보낼 수 없습니다.');
    }

    // 대상 유저 존재 확인
    const target = await this.prisma.userProfile.findFirst({ where: { userId: toUserId } });
    if (!target) throw new NotFoundException('존재하지 않는 유저입니다.');

    // 이미 친구인지 확인
    const already = await this.prisma.friend.findUnique({
      where: { userId_friendId: { userId: fromUserId, friendId: toUserId } },
    });
    if (already) throw new ConflictException('이미 친구입니다.');

    // 중복 요청 확인 (양방향)
    const existing = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { fromUserId, toUserId, status: 'PENDING' },
          { fromUserId: toUserId, toUserId: fromUserId, status: 'PENDING' },
        ],
      },
    });
    if (existing) throw new ConflictException('이미 친구 요청이 존재합니다.');

    return this.prisma.friendRequest.create({
      data: { fromUserId, toUserId },
      select: { id: true, toUserId: true, status: true, createdAt: true },
    });
  }

  // ── 받은 친구 요청 목록 ──────────────────────────────────────
  async getIncomingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: { toUserId: userId, status: 'PENDING' },
      select: {
        id: true,
        createdAt: true,
        fromUser: {
          select: {
            profile: {
              select: { userId: true, nickname: true, handle: true, profileImageUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── 친구 요청 수락 / 거절 ────────────────────────────────────
  async respondToRequest(userId: string, requestId: string, dto: RespondFriendRequestDto) {
    const req = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('친구 요청을 찾을 수 없습니다.');
    if (req.toUserId !== userId) throw new ForbiddenException();
    if (req.status !== 'PENDING') throw new BadRequestException('이미 처리된 요청입니다.');

    if (dto.action === 'accept') {
      // 트랜잭션: 요청 상태 변경 + 양방향 Friend 행 삽입
      await this.prisma.$transaction([
        this.prisma.friendRequest.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED' },
        }),
        this.prisma.friend.createMany({
          data: [
            { userId: req.fromUserId, friendId: req.toUserId },
            { userId: req.toUserId, friendId: req.fromUserId },
          ],
          skipDuplicates: true,
        }),
      ]);
      return { message: '친구 요청을 수락했습니다.' };
    } else {
      await this.prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });
      return { message: '친구 요청을 거절했습니다.' };
    }
  }

  // ── 친구 목록 ────────────────────────────────────────────────
  async getFriends(userId: string) {
    const friends = await this.prisma.friend.findMany({
      where: { userId },
      select: {
        createdAt: true,
        friend: {
          select: {
            id: true,
            profile: {
              select: {
                nickname: true,
                handle: true,
                bio: true,
                profileImageUrl: true,
              },
            },
            // 오늘 연습 여부
            practiceSessions: {
              where: {
                practicedAt: {
                  gte: new Date(new Date().toISOString().split('T')[0]),
                },
              },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return friends.map(f => ({
      userId: f.friend.id,
      nickname: f.friend.profile?.nickname ?? '',
      handle: f.friend.profile?.handle ?? '',
      bio: f.friend.profile?.bio ?? null,
      profileImageUrl: f.friend.profile?.profileImageUrl ?? null,
      practicedToday: f.friend.practiceSessions.length > 0,
      friendSince: f.createdAt,
    }));
  }

  // ── 친구 삭제 ────────────────────────────────────────────────
  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.prisma.friend.findUnique({
      where: { userId_friendId: { userId, friendId } },
    });
    if (!friendship) throw new NotFoundException('친구 관계를 찾을 수 없습니다.');

    // 양방향 삭제
    await this.prisma.friend.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });
    return { message: '친구를 삭제했습니다.' };
  }

  // ── 친구 프로필 조회 ─────────────────────────────────────────
  async getFriendProfile(userId: string, friendId: string) {
    const isFriend = await this.prisma.friend.findUnique({
      where: { userId_friendId: { userId, friendId } },
    });
    if (!isFriend) throw new ForbiddenException('친구만 프로필을 조회할 수 있습니다.');

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: friendId },
      select: {
        nickname: true,
        handle: true,
        bio: true,
        profileImageUrl: true,
        mainInstrument: { select: { name: true } },
      },
    });
    if (!profile) throw new NotFoundException();

    // 이번 달 통계
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sessions = await this.prisma.practiceSession.findMany({
      where: { userId: friendId, practicedAt: { gte: monthStart } },
      select: { practicedAt: true, durationMinutes: true },
    });

    const streak = await this.prisma.streak.findUnique({ where: { userId: friendId } });

    return {
      userId: friendId,
      nickname: profile.nickname,
      handle: profile.handle,
      bio: profile.bio,
      profileImageUrl: profile.profileImageUrl,
      mainInstrument: profile.mainInstrument?.name ?? null,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      thisMonth: {
        practicedDays: new Set(sessions.map(s => s.practicedAt.toISOString().split('T')[0])).size,
        totalMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
      },
    };
  }
}
