import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SongsService }  from '../songs/songs.service';

@Injectable()
export class BpmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly songs:  SongsService,
  ) {}

  /**
   * 사용자가 BPM 기록이 있는 곡 목록.
   * 각 곡의 최근 BPM, 목표 BPM, 달성률 반환.
   */
  async getSongs(userId: string) {
    const songs = await this.prisma.song.findMany({
      where: {
        userId,
        bpmRecords: { some: {} },
      },
      include: {
        bpmRecords: {
          orderBy: { recordedAt: 'desc' },
          take:    1,
          select:  { bpm: true, recordedAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return songs.map(song => {
      const latestBpm = song.bpmRecords[0]?.bpm ?? 0;
      const targetBpm = song.targetBpm ?? latestBpm;
      const pct       = targetBpm > 0
        ? Math.min(Math.round((latestBpm / targetBpm) * 100), 100)
        : 100;

      return {
        songId:         song.id,
        title:          song.title,
        artist:         song.artist ?? null,
        currentBpm:     latestBpm,
        targetBpm,
        pct,
        lastRecordedAt: song.bpmRecords[0]?.recordedAt ?? null,
      };
    });
  }

  /** 특정 곡의 BPM 성장 이력 (차트용) */
  async getSongHistory(userId: string, songId: string) {
    const song = await this.prisma.song.findFirst({
      where:  { id: songId, userId },
      select: { id: true, title: true, artist: true, targetBpm: true },
    });
    if (!song) return null;

    const records = await this.prisma.bpmRecord.findMany({
      where:   { userId, songId },
      orderBy: { recordedAt: 'asc' },
      select:  { bpm: true, recordedAt: true },
    });

    return {
      song,
      records: records.map(r => ({ bpm: r.bpm, recordedAt: r.recordedAt })),
    };
  }

  /** 목표 BPM 수정 — SongsService에 위임 */
  updateTargetBpm(userId: string, songId: string, targetBpm: number) {
    return this.songs.updateTargetBpm(userId, songId, targetBpm);
  }
}
