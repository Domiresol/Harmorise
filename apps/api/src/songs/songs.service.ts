import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SongsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 사용자의 곡 목록 검색 (곡명/아티스트 부분 일치).
   * 연습 기록 작성 화면의 곡 선택 드롭다운에서 사용.
   */
  async search(userId: string, q: string, limit = 20) {
    const songs = await this.prisma.song.findMany({
      where: {
        userId,
        OR: [
          { title:  { contains: q, mode: 'insensitive' } },
          { artist: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id:        true,
        title:     true,
        artist:    true,
        targetBpm: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return songs;
  }

  /**
   * 사용자의 전체 곡 목록 (q 없을 때 — 최근 수정순).
   * 세션 수, 마지막 연습일, 최신 BPM 포함.
   */
  async findAll(userId: string, limit = 100) {
    const songs = await this.prisma.song.findMany({
      where:   { userId },
      orderBy: { updatedAt: 'desc' },
      take:    limit,
      include: {
        _count: { select: { practiceSessions: true } },
        practiceSessions: {
          orderBy: { practicedAt: 'desc' },
          take:    1,
          select:  { practicedAt: true },
        },
        bpmRecords: {
          orderBy: { recordedAt: 'desc' },
          take:    1,
          select:  { bpm: true },
        },
      },
    });

    return songs.map(s => {
      const latestBpm = s.bpmRecords[0]?.bpm ?? null;
      const targetBpm = s.targetBpm ?? null;
      const pct = latestBpm && targetBpm
        ? Math.min(Math.round((latestBpm / targetBpm) * 100), 100)
        : null;

      return {
        id:              s.id,
        title:           s.title,
        artist:          s.artist ?? null,
        targetBpm,
        sessionCount:    s._count.practiceSessions,
        lastPracticedAt: s.practiceSessions[0]?.practicedAt ?? null,
        latestBpm,
        pct,
      };
    });
  }

  /** 단건 조회 */
  async findOne(userId: string, songId: string) {
    const song = await this.prisma.song.findFirst({
      where:  { id: songId, userId },
      select: { id: true, title: true, artist: true, targetBpm: true },
    });
    if (!song) throw new NotFoundException('곡을 찾을 수 없습니다.');
    return song;
  }

  /**
   * 곡 upsert — 연습 기록 저장 시 내부에서도 사용.
   * title 기준 find-or-create, targetBpm 이 있으면 업데이트.
   */
  async upsertByTitle(
    userId:    string,
    title:     string,
    artist?:   string,
    targetBpm?: number,
  ): Promise<string> {
    const existing = await this.prisma.song.findFirst({
      where: { userId, title },
    });

    if (existing) {
      // targetBpm 이 새로 들어오면 업데이트
      if (targetBpm !== undefined && existing.targetBpm !== targetBpm) {
        await this.prisma.song.update({
          where: { id: existing.id },
          data:  { targetBpm },
        });
      }
      return existing.id;
    }

    const created = await this.prisma.song.create({
      data: { userId, title, artist, targetBpm },
    });
    return created.id;
  }

  /**
   * 특정 곡의 연습 기록 목록 — 곡 상세 화면 "연습 추이" 탭
   * BPM 기록과 달리, PracticeSession 단위로 반환한다.
   */
  async getSessionsBySong(userId: string, songId: string) {
    // 곡 소유권 확인
    const song = await this.prisma.song.findFirst({
      where:  { id: songId, userId },
      select: { id: true, title: true, artist: true, targetBpm: true },
    });
    if (!song) throw new NotFoundException('곡을 찾을 수 없습니다.');

    const sessions = await this.prisma.practiceSession.findMany({
      where:   { userId, songId },
      orderBy: { practicedAt: 'desc' },
      include: {
        sessionTypes: { select: { practiceType: true } },
        memos:        { select: { id: true, content: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
        instrument:   { select: { name: true } },
      },
    });

    // 통계 계산
    const totalMinutes   = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const sessionCount   = sessions.length;
    // 최초~최신 BPM (bpm 있는 것만)
    const bpmSessions    = [...sessions].reverse().filter(s => s.bpm !== null);
    const startBpm       = bpmSessions[0]?.bpm ?? null;
    const latestBpm      = bpmSessions[bpmSessions.length - 1]?.bpm ?? null;

    return {
      song,
      stats: { totalMinutes, sessionCount, startBpm, latestBpm },
      sessions: sessions.map(s => ({
        id:              s.id,
        practicedAt:     s.practicedAt,
        durationMinutes: s.durationMinutes,
        bpm:             s.bpm ?? null,
        instrumentName:  s.instrument?.name ?? null,
        practiceTypes:   s.sessionTypes.map(t => t.practiceType),
        memos:           s.memos,
        createdAt:       s.createdAt,
      })),
    };
  }

  /** 목표 BPM 업데이트 */
  async updateTargetBpm(userId: string, songId: string, targetBpm: number) {
    const song = await this.prisma.song.findFirst({ where: { id: songId, userId } });
    if (!song) throw new NotFoundException('곡을 찾을 수 없습니다.');

    return this.prisma.song.update({
      where:  { id: songId },
      data:   { targetBpm },
      select: { id: true, title: true, artist: true, targetBpm: true },
    });
  }
}
