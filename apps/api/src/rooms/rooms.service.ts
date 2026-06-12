import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto, JoinRoomDto, RespondJoinRequestDto } from './dto/room.dto';

// 6자리 대문자+숫자 코드 생성
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── 방 생성 ──────────────────────────────────────────────────
  async createRoom(hostId: string, dto: CreateRoomDto) {
    // 참여 방 개수 제한 확인 (최대 10개)
    const count = await this.prisma.roomMember.count({ where: { userId: hostId } });
    if (count >= 10) throw new BadRequestException('최대 10개의 방에만 참여할 수 있습니다.');

    // 중복 없는 초대코드 생성
    let inviteCode: string;
    do {
      inviteCode = generateInviteCode();
    } while (await this.prisma.room.findUnique({ where: { inviteCode } }));

    const room = await this.prisma.$transaction(async tx => {
      const created = await tx.room.create({
        data: { hostId, name: dto.name, description: dto.description, inviteCode },
      });
      // 방장을 HOST로 멤버에 추가
      await tx.roomMember.create({
        data: { roomId: created.id, userId: hostId, role: 'HOST' },
      });
      return created;
    });

    return this.getRoomDetail(room.id, hostId);
  }

  // ── 내 방 목록 ───────────────────────────────────────────────
  async getMyRooms(userId: string) {
    const memberships = await this.prisma.roomMember.findMany({
      where: { userId },
      select: {
        role: true,
        joinedAt: true,
        room: {
          select: {
            id: true,
            name: true,
            description: true,
            inviteCode: true,
            hostId: true,
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map(m => ({
      id:          m.room.id,
      name:        m.room.name,
      description: m.room.description,
      inviteCode:  m.role === 'HOST' ? m.room.inviteCode : null,
      memberCount: m.room._count.members,
      myRole:      m.role,
      joinedAt:    m.joinedAt,
    }));
  }

  // ── 방 상세 ──────────────────────────────────────────────────
  async getRoomDetail(roomId: string, userId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        description: true,
        inviteCode: true,
        hostId: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

    const membership = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!membership) throw new ForbiddenException('방 멤버만 조회할 수 있습니다.');

    const pendingJoinCount = membership.role === 'HOST'
      ? await this.prisma.roomJoinRequest.count({ where: { roomId, status: 'PENDING' } })
      : 0;

    return {
      id:               room.id,
      name:             room.name,
      description:      room.description,
      hostId:           room.hostId,
      createdAt:        room.createdAt,
      memberCount:      room._count.members,
      myRole:           membership.role,
      pendingJoinCount,
      // 방장이 아니면 초대코드 숨김
      inviteCode:       membership.role === 'HOST' ? room.inviteCode : null,
    };
  }

  // ── 초대코드로 입장 요청 ─────────────────────────────────────
  async requestJoin(userId: string, dto: JoinRoomDto) {
    const room = await this.prisma.room.findUnique({ where: { inviteCode: dto.inviteCode } });
    if (!room) throw new NotFoundException('유효하지 않은 초대코드입니다.');

    // 이미 멤버인지 확인
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
    });
    if (member) throw new ConflictException('이미 참여 중인 방입니다.');

    // 대기 중인 요청 있는지 확인
    const pending = await this.prisma.roomJoinRequest.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
    });
    if (pending && pending.status === 'PENDING') {
      throw new ConflictException('이미 입장 요청이 대기 중입니다.');
    }

    // 최대 인원 확인
    const memberCount = await this.prisma.roomMember.count({ where: { roomId: room.id } });
    if (memberCount >= room.maxMembers) throw new BadRequestException('방이 꽉 찼습니다.');

    // 참여 방 개수 확인
    const myRoomCount = await this.prisma.roomMember.count({ where: { userId } });
    if (myRoomCount >= 10) throw new BadRequestException('최대 10개의 방에만 참여할 수 있습니다.');

    const request = await this.prisma.roomJoinRequest.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      create: { roomId: room.id, userId, status: 'PENDING' },
      update: { status: 'PENDING', updatedAt: new Date() },
    });

    return {
      message: '입장 요청을 보냈습니다. 방장의 수락을 기다려주세요.',
      requestId: request.id,
      roomName: room.name,
    };
  }

  // ── 입장 요청 목록 조회 (방장 전용) ─────────────────────────
  async getJoinRequests(roomId: string, userId: string) {
    await this.ensureHost(roomId, userId);

    const rows = await this.prisma.roomJoinRequest.findMany({
      where: { roomId, status: 'PENDING' },
      select: {
        id: true,
        createdAt: true,
        user: {
          select: {
            profile: {
              select: { userId: true, nickname: true, handle: true, profileImageUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 프론트엔드 JoinRequest 인터페이스에 맞게 flatten
    return rows.map(r => ({
      requestId:   r.id,
      requestedAt: r.createdAt,
      user: {
        userId:         r.user.profile?.userId        ?? '',
        nickname:       r.user.profile?.nickname      ?? '',
        handle:         r.user.profile?.handle        ?? '',
        profileImageUrl: r.user.profile?.profileImageUrl ?? null,
      },
    }));
  }

  // ── 입장 요청 수락 / 거절 (방장 전용) ───────────────────────
  async respondJoinRequest(
    roomId: string,
    requestId: string,
    hostId: string,
    dto: RespondJoinRequestDto,
  ) {
    await this.ensureHost(roomId, hostId);

    const req = await this.prisma.roomJoinRequest.findUnique({ where: { id: requestId } });
    if (!req || req.roomId !== roomId) throw new NotFoundException('요청을 찾을 수 없습니다.');
    if (req.status !== 'PENDING') throw new BadRequestException('이미 처리된 요청입니다.');

    if (dto.action === 'accept') {
      await this.prisma.$transaction([
        this.prisma.roomJoinRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED' } }),
        this.prisma.roomMember.create({ data: { roomId, userId: req.userId, role: 'MEMBER' } }),
      ]);
      return { message: '입장을 수락했습니다.' };
    } else {
      await this.prisma.roomJoinRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
      return { message: '입장을 거절했습니다.' };
    }
  }

  // ── 방 피드 — 멤버 연습 기록 ─────────────────────────────────
  async getRoomFeed(roomId: string, userId: string, cursor?: string, limit = 20) {
    await this.ensureMember(roomId, userId);

    const members = await this.prisma.roomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    const memberIds = members.map(m => m.userId);

    const sessions = await this.prisma.practiceSession.findMany({
      where: {
        userId: { in: memberIds },
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      select: {
        id: true,
        practicedAt: true,
        durationMinutes: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            profile: { select: { nickname: true, handle: true, profileImageUrl: true } },
          },
        },
        instrument: { select: { name: true } },
        song: { select: { title: true } },
        bpmRecords: { select: { bpm: true }, orderBy: { recordedAt: 'desc' }, take: 1 },
        // 메모는 의도적으로 제외 (프라이버시)
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasNext = sessions.length > limit;
    const items = sessions.slice(0, limit).map(s => ({
      id: s.id,
      user: {
        userId: s.user.id,
        nickname: s.user.profile?.nickname ?? '',
        handle: s.user.profile?.handle ?? '',
        profileImageUrl: s.user.profile?.profileImageUrl ?? null,
      },
      practicedAt: s.practicedAt,
      durationMinutes: s.durationMinutes,
      instrumentName: s.instrument?.name ?? null,
      songTitle: s.song?.title ?? null,
      bpm: s.bpmRecords[0]?.bpm ?? null,
      createdAt: s.createdAt,
    }));

    return {
      items,
      nextCursor: hasNext ? items[items.length - 1].id : null,
    };
  }

  // ── 멤버 목록 + 이번 주 통계 ─────────────────────────────────
  async getRoomMembers(roomId: string, userId: string) {
    await this.ensureMember(roomId, userId);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const members = await this.prisma.roomMember.findMany({
      where: { roomId },
      select: {
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            profile: { select: { nickname: true, handle: true, profileImageUrl: true } },
            practiceSessions: {
              where: { practicedAt: { gte: weekStart } },
              select: { practicedAt: true },
              distinct: ['practicedAt'],
            },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return members.map(m => ({
      userId: m.user.id,
      nickname: m.user.profile?.nickname ?? '',
      handle: m.user.profile?.handle ?? '',
      profileImageUrl: m.user.profile?.profileImageUrl ?? null,
      role: m.role,
      joinedAt: m.joinedAt,
      weekPracticedDays: m.user.practiceSessions.length,
    }));
  }

  // ── 방 정보 수정 (방장 전용) ─────────────────────────────────
  async updateRoom(roomId: string, userId: string, dto: UpdateRoomDto) {
    await this.ensureHost(roomId, userId);
    return this.prisma.room.update({
      where: { id: roomId },
      data: { name: dto.name, description: dto.description },
      select: { id: true, name: true, description: true, updatedAt: true },
    });
  }

  // ── 초대코드 재발급 (방장 전용) ──────────────────────────────
  async refreshInviteCode(roomId: string, userId: string) {
    await this.ensureHost(roomId, userId);

    let newCode: string;
    do {
      newCode = generateInviteCode();
    } while (await this.prisma.room.findUnique({ where: { inviteCode: newCode } }));

    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: { inviteCode: newCode },
      select: { inviteCode: true },
    });
    return { inviteCode: updated.inviteCode };
  }

  // ── 멤버 강퇴 (방장 전용) ────────────────────────────────────
  async kickMember(roomId: string, hostId: string, targetUserId: string) {
    await this.ensureHost(roomId, hostId);
    if (hostId === targetUserId) throw new BadRequestException('방장은 강퇴할 수 없습니다.');

    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });
    if (!member) throw new NotFoundException('해당 멤버를 찾을 수 없습니다.');

    await this.prisma.roomMember.delete({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });
    return { message: '멤버를 강퇴했습니다.' };
  }

  // ── 방 나가기 ────────────────────────────────────────────────
  async leaveRoom(roomId: string, userId: string) {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) throw new NotFoundException('방 멤버가 아닙니다.');
    if (member.role === 'HOST') throw new BadRequestException('방장은 방을 나갈 수 없습니다. 방장을 위임하거나 방을 삭제하세요.');

    await this.prisma.roomMember.delete({
      where: { roomId_userId: { roomId, userId } },
    });
    return { message: '방을 나갔습니다.' };
  }

  // ── 방장 위임 ────────────────────────────────────────────────
  async transferHost(roomId: string, currentHostId: string, newHostId: string) {
    await this.ensureHost(roomId, currentHostId);
    const newHost = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: newHostId } },
    });
    if (!newHost) throw new NotFoundException('해당 멤버를 찾을 수 없습니다.');

    await this.prisma.$transaction([
      this.prisma.roomMember.update({
        where: { roomId_userId: { roomId, userId: currentHostId } },
        data: { role: 'MEMBER' },
      }),
      this.prisma.roomMember.update({
        where: { roomId_userId: { roomId, userId: newHostId } },
        data: { role: 'HOST' },
      }),
      this.prisma.room.update({ where: { id: roomId }, data: { hostId: newHostId } }),
    ]);
    return { message: '방장을 위임했습니다.' };
  }

  // ── 방 삭제 (방장 전용) ──────────────────────────────────────
  async deleteRoom(roomId: string, userId: string) {
    await this.ensureHost(roomId, userId);
    await this.prisma.room.delete({ where: { id: roomId } });
    return { message: '방을 삭제했습니다.' };
  }

  // ── 내부 헬퍼 ────────────────────────────────────────────────
  private async ensureHost(roomId: string, userId: string) {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) throw new ForbiddenException('방 멤버가 아닙니다.');
    if (member.role !== 'HOST') throw new ForbiddenException('방장만 수행할 수 있는 작업입니다.');
  }

  private async ensureMember(roomId: string, userId: string) {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) throw new ForbiddenException('방 멤버만 접근할 수 있습니다.');
  }
}
