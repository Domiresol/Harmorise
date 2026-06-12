import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SongsService } from '../songs/songs.service';
import { CreatePracticeDto } from './dto/create-practice.dto';

@Injectable()
export class PracticeService {
  constructor(
    private readonly prisma:    PrismaService,
    private readonly auditLog:  AuditLogService,
    private readonly songs:     SongsService,
  ) {}

  // ─────────────────────────────────────────────────────
  // 연습 세션 생성
  // ─────────────────────────────────────────────────────
  async create(userId: string, dto: CreatePracticeDto) {
    // 1) 악기 find-or-create
    let instrumentId: string | undefined;
    if (dto.instrumentName) {
      const instrument = await this.prisma.instrument.upsert({
        where: { name: dto.instrumentName },
        create: { name: dto.instrumentName },
        update: {},
      });
      instrumentId = instrument.id;
    }

    // 2) 곡 upsert — SongsService에 위임
    let songId: string | undefined;
    if (dto.songTitle) {
      songId = await this.songs.upsertByTitle(userId, dto.songTitle, dto.artist, dto.targetBpm);
    }

    // 3) PracticeSession 생성 (transaction)
    const session = await this.prisma.$transaction(async (tx) => {
      const s = await tx.practiceSession.create({
        data: {
          userId,
          practicedAt: new Date(dto.practicedAt),
          durationMinutes: dto.durationMinutes,
          bpm: dto.bpm,
          instrumentId,
          songId,
          // 연습 유형 중간 테이블
          sessionTypes: dto.practiceTypes?.length
            ? {
                createMany: {
                  data: dto.practiceTypes.map((t) => ({ practiceType: t })),
                },
              }
            : undefined,
          // 메모
          memos: dto.memo
            ? { create: { userId, content: dto.memo } }
            : undefined,
        },
        include: {
          sessionTypes: true,
          memos: true,
          instrument: { select: { name: true } },
          song: { select: { title: true, artist: true, targetBpm: true } },
        },
      });

      // BpmRecord — 곡 + BPM 모두 있을 때만
      if (songId && dto.bpm) {
        await tx.bpmRecord.create({
          data: {
            userId,
            songId,
            sessionId: s.id,
            bpm: dto.bpm,
          },
        });
      }

      // Streak 업데이트
      await this.updateStreak(tx, userId, new Date(dto.practicedAt));

      return s;
    });

    await this.auditLog.log('PRACTICE_CREATE', userId, {
      sessionId: session.id,
      durationMinutes: session.durationMinutes,
    });

    return this.formatSession(session);
  }

  // ─────────────────────────────────────────────────────
  // 목록 조회 (최신순, cursor 기반 페이지네이션)
  // ─────────────────────────────────────────────────────
  async findAll(userId: string, cursor?: string, limit = 20) {
    const sessions = await this.prisma.practiceSession.findMany({
      where: { userId },
      orderBy: [{ practicedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sessionTypes: true,
        instrument: { select: { name: true } },
        song: { select: { title: true, artist: true, targetBpm: true } },
      },
    });

    const hasNext = sessions.length > limit;
    const items = hasNext ? sessions.slice(0, limit) : sessions;

    return {
      items: items.map((s) => this.formatSession(s)),
      nextCursor: hasNext ? items[items.length - 1].id : null,
    };
  }

  // ─────────────────────────────────────────────────────
  // 단건 조회
  // ─────────────────────────────────────────────────────
  async findOne(userId: string, sessionId: string) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        sessionTypes: true,
        memos: { orderBy: { createdAt: 'asc' } },
        instrument: { select: { name: true } },
        song: { select: { title: true, artist: true, targetBpm: true } },
      },
    });

    if (!session) throw new NotFoundException('연습 기록을 찾을 수 없습니다.');
    if (session.userId !== userId)
      throw new ForbiddenException('접근 권한이 없습니다.');

    return this.formatSession(session);
  }

  // ─────────────────────────────────────────────────────
  // 수정 (PATCH)
  // ─────────────────────────────────────────────────────
  async update(userId: string, sessionId: string, dto: import('./dto/update-practice.dto').UpdatePracticeDto) {
    // 소유권 확인
    const existing = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, songId: true },
    });
    if (!existing) throw new NotFoundException('연습 기록을 찾을 수 없습니다.');
    if (existing.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');

    // 악기 find-or-create
    let instrumentId: string | undefined;
    if (dto.instrumentName !== undefined) {
      const inst = await this.prisma.instrument.upsert({
        where: { name: dto.instrumentName },
        create: { name: dto.instrumentName },
        update: {},
      });
      instrumentId = inst.id;
    }

    // 곡 upsert — SongsService에 위임
    let songId: string | undefined = existing.songId ?? undefined;
    if (dto.songTitle !== undefined) {
      songId = await this.songs.upsertByTitle(userId, dto.songTitle, dto.artist, dto.targetBpm);
    } else if (dto.targetBpm && existing.songId) {
      await this.songs.updateTargetBpm(userId, existing.songId, dto.targetBpm);
    }

    const session = await this.prisma.$transaction(async (tx) => {
      // sessionTypes 교체
      if (dto.practiceTypes !== undefined) {
        await tx.practiceSessionType.deleteMany({ where: { sessionId } });
        if (dto.practiceTypes.length > 0) {
          await tx.practiceSessionType.createMany({
            data: dto.practiceTypes.map((t) => ({ sessionId, practiceType: t })),
          });
        }
      }

      // 메모 교체 (단순화: 기존 메모 전부 삭제 후 새로 생성)
      if (dto.memo !== undefined) {
        await tx.memo.deleteMany({ where: { sessionId } });
        if (dto.memo !== null && dto.memo.trim().length > 0) {
          await tx.memo.create({ data: { userId, sessionId, content: dto.memo } });
        }
      }

      // BpmRecord 교체 (bpm이 바뀌었을 때 — 기존 레코드 삭제 후 새로 생성)
      if (dto.bpm !== undefined && songId) {
        await tx.bpmRecord.deleteMany({ where: { sessionId } });
        if (dto.bpm) {
          await tx.bpmRecord.create({
            data: { userId, songId, sessionId, bpm: dto.bpm },
          });
        }
      }

      const updated = await tx.practiceSession.update({
        where: { id: sessionId },
        data: {
          ...(dto.practicedAt ? { practicedAt: new Date(dto.practicedAt) } : {}),
          ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
          ...(dto.bpm !== undefined ? { bpm: dto.bpm } : {}),
          ...(instrumentId !== undefined ? { instrumentId } : {}),
          ...(dto.songTitle !== undefined ? { songId: songId ?? null } : {}),
        },
        include: {
          sessionTypes: true,
          memos: { orderBy: { createdAt: 'asc' } },
          instrument: { select: { name: true } },
          song: { select: { title: true, artist: true, targetBpm: true } },
        },
      });
      return updated;
    });

    return this.formatSession(session);
  }

  // ─────────────────────────────────────────────────────
  // 삭제
  // ─────────────────────────────────────────────────────
  async remove(userId: string, sessionId: string) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) throw new NotFoundException('연습 기록을 찾을 수 없습니다.');
    if (session.userId !== userId)
      throw new ForbiddenException('접근 권한이 없습니다.');

    // onDelete: SetNull이므로 세션 삭제 전 BpmRecord 명시적 삭제
    await this.prisma.bpmRecord.deleteMany({ where: { sessionId } });
    await this.prisma.practiceSession.delete({ where: { id: sessionId } });
    await this.auditLog.log('PRACTICE_DELETE', userId, { sessionId });
    return { message: '삭제되었습니다.' };
  }

  // ─────────────────────────────────────────────────────
  // Streak 업데이트 (private)
  // ─────────────────────────────────────────────────────
  async updateStreak(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    userId: string,
    practicedAt: Date,
  ) {
    const today = this.toDateOnly(practicedAt);

    const streak = await tx.streak.findUnique({ where: { userId } });

    if (!streak) {
      // 첫 연습
      await tx.streak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastPracticedAt: today,
        },
      });
      return;
    }

    const last = streak.lastPracticedAt
      ? this.toDateOnly(streak.lastPracticedAt)
      : null;

    const todayMs = today.getTime();
    const lastMs = last?.getTime() ?? 0;
    const diffDays = Math.round((todayMs - lastMs) / 86_400_000);

    if (diffDays === 0) return; // 오늘 이미 연습함

    const newCurrent = diffDays === 1 ? streak.currentStreak + 1 : 1;
    const newLongest = Math.max(streak.longestStreak, newCurrent);

    await tx.streak.update({
      where: { userId },
      data: {
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastPracticedAt: today,
      },
    });
  }

  // ─────────────────────────────────────────────────────
  // 월별 캘린더 통계
  // ─────────────────────────────────────────────────────
  async getMonthlyStats(userId: string, year: number, month: number) {
    // month: 1-indexed (1~12)
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate   = new Date(Date.UTC(year, month, 0));     // 해당 월 마지막 날

    // 목표 시간 조회
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { dailyGoalMinutes: true, weeklyGoalMinutes: true },
    });
    const dailyGoalMinutes = profile?.dailyGoalMinutes  ?? 30;
    const weeklyGoalDays   = Math.max(1, Math.min(7,
      Math.round((profile?.weeklyGoalMinutes ?? 150) / dailyGoalMinutes),
    ));

    // 해당 월 모든 세션 조회
    const sessions = await this.prisma.practiceSession.findMany({
      where: {
        userId,
        practicedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { practicedAt: 'asc' },
      include: {
        song:       { select: { title: true } },
        instrument: { select: { name: true } },
      },
    });

    // 날짜별 그룹핑
    type DayLevel = 'perfect' | 'great' | 'good' | 'ok' | 'none';
    type DayStat = {
      totalMinutes: number;
      level: DayLevel;
      sessions: { id: string; songTitle: string | null; instrumentName: string | null; durationMinutes: number; bpm: number | null }[];
    };
    const days: Record<string, DayStat> = {};

    for (const s of sessions) {
      const key = this.formatDate(s.practicedAt);
      if (!days[key]) days[key] = { totalMinutes: 0, level: 'none', sessions: [] };
      days[key].totalMinutes += s.durationMinutes;
      days[key].sessions.push({
        id:              s.id,
        songTitle:       s.song?.title ?? null,
        instrumentName:  s.instrument?.name ?? null,
        durationMinutes: s.durationMinutes,
        bpm:             s.bpm ?? null,
      });
    }

    // 레벨 계산 — perfect(100%) / great(80%+) / good(60%+) / ok(>0%) / none
    for (const day of Object.values(days)) {
      const { totalMinutes: m } = day;
      if      (m >= dailyGoalMinutes)             day.level = 'perfect';
      else if (m >= dailyGoalMinutes * 0.8)       day.level = 'great';
      else if (m >= dailyGoalMinutes * 0.6)       day.level = 'good';
      else if (m > 0)                             day.level = 'ok';
    }

    // 요약
    const dayList = Object.values(days);
    const summary = {
      practicedDays: dayList.length,
      totalMinutes:  dayList.reduce((s, d) => s + d.totalMinutes, 0),
      perfectDays:   dayList.filter(d => d.level === 'perfect').length,
      greatDays:     dayList.filter(d => d.level === 'great').length,
      goodDays:      dayList.filter(d => d.level === 'good').length,
      okDays:        dayList.filter(d => d.level === 'ok').length,
    };

    // 스트릭 — 실제 세션 데이터 기반으로 계산
    const streak = await this.computeStreak(userId);

    return {
      year,
      month,
      dailyGoalMinutes,
      weeklyGoalDays,
      days,
      summary,
      streak,
    };
  }

  // ─────────────────────────────────────────────────────
  // 스트릭 조회
  // ─────────────────────────────────────────────────────
  async getStreak(userId: string) {
    return this.computeStreak(userId);
  }

  // ─────────────────────────────────────────────────────
  // 홈 화면 요약
  // ─────────────────────────────────────────────────────
  async getSummary(userId: string) {
    const now = new Date();

    // 오늘 날짜 (UTC 기준 — @db.Date와 일치)
    const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    // 이번 주 월요일 (UTC)
    const dayOfWeek    = now.getUTCDay(); // 0=일
    const diffToMon    = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStartUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon));

    // 유저 프로필 (주간 목표 일수 계산용)
    const profile = await this.prisma.userProfile.findUnique({
      where:  { userId },
      select: { dailyGoalMinutes: true, weeklyGoalMinutes: true },
    });
    const dailyGoal  = profile?.dailyGoalMinutes  ?? 30;
    const weeklyGoal = profile?.weeklyGoalMinutes ?? 150;
    const weekGoalDays = Math.max(1, Math.min(7, Math.round(weeklyGoal / dailyGoal)));

    const [todayAgg, weekSessions, recentSessions, streak] = await Promise.all([
      // 오늘 총 연습 시간
      this.prisma.practiceSession.aggregate({
        _sum: { durationMinutes: true },
        where: { userId, practicedAt: todayUtc },
      }),

      // 이번 주 연습한 날짜 목록 (중복 제거)
      this.prisma.practiceSession.findMany({
        where:    { userId, practicedAt: { gte: weekStartUtc } },
        select:   { practicedAt: true },
        distinct: ['practicedAt'],
      }),

      // 최근 연습 3개
      this.prisma.practiceSession.findMany({
        where:   { userId },
        orderBy: [{ practicedAt: 'desc' }, { createdAt: 'desc' }],
        take:    3,
        include: {
          song:         { select: { title: true } },
          instrument:   { select: { name: true } },
          sessionTypes: true,
        },
      }),

      // 스트릭
      this.computeStreak(userId),
    ]);

    return {
      todayMinutes:        todayAgg._sum.durationMinutes ?? 0,
      weekPracticedDays:   weekSessions.length,
      weekGoalDays,
      weekPracticedDates:  weekSessions.map(s => this.formatDate(s.practicedAt)),
      streak,
      recentSessions:      recentSessions.map(s => this.formatSession(s)),
    };
  }

  // ─────────────────────────────────────────────────────
  // 리포트 목록 (주간 / 월간)
  // ─────────────────────────────────────────────────────
  async getReportList(userId: string, type: 'weekly' | 'monthly', limit = 10) {
    const sessions = await this.prisma.practiceSession.findMany({
      where: { userId },
      orderBy: { practicedAt: 'desc' },
      select: { practicedAt: true, durationMinutes: true },
    });

    if (type === 'weekly') {
      const weekMap = new Map<string, {
        year: number; week: number; totalMinutes: number; days: Set<string>;
      }>();
      for (const s of sessions) {
        const { year, week } = this.getISOWeek(s.practicedAt);
        const key = `${year}-W${String(week).padStart(2, '0')}`;
        if (!weekMap.has(key)) weekMap.set(key, { year, week, totalMinutes: 0, days: new Set() });
        const e = weekMap.get(key)!;
        e.totalMinutes += s.durationMinutes;
        e.days.add(this.formatDate(s.practicedAt));
      }
      const sorted = [...weekMap.values()]
        .sort((a, b) => a.year !== b.year ? b.year - a.year : b.week - a.week)
        .slice(0, limit);
      return sorted.map((v, i) => {
        const start = this.getWeekStart(v.year, v.week);
        const end   = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
        const prev  = sorted[i + 1];
        return {
          year: v.year, week: v.week,
          label: `${v.year}년 ${start.getUTCMonth() + 1}월 ${this.getWeekOfMonth(start)}주차`,
          dateRange: `${start.getUTCMonth() + 1}/${start.getUTCDate()} ~ ${end.getUTCMonth() + 1}/${end.getUTCDate()}`,
          totalMinutes: v.totalMinutes,
          practicedDays: v.days.size,
          prevDiffMinutes: prev != null ? v.totalMinutes - prev.totalMinutes : null,
        };
      });
    } else {
      const monthMap = new Map<string, {
        year: number; month: number; totalMinutes: number; days: Set<string>;
      }>();
      for (const s of sessions) {
        const y = s.practicedAt.getUTCFullYear();
        const m = s.practicedAt.getUTCMonth() + 1;
        const key = `${y}-${m}`;
        if (!monthMap.has(key)) monthMap.set(key, { year: y, month: m, totalMinutes: 0, days: new Set() });
        const e = monthMap.get(key)!;
        e.totalMinutes += s.durationMinutes;
        e.days.add(this.formatDate(s.practicedAt));
      }
      const sorted = [...monthMap.values()]
        .sort((a, b) => a.year !== b.year ? b.year - a.year : b.month - a.month)
        .slice(0, limit);
      return sorted.map((v, i) => {
        const prev = sorted[i + 1];
        return {
          year: v.year, month: v.month,
          label: `${v.year}년 ${v.month}월`,
          totalMinutes: v.totalMinutes,
          practicedDays: v.days.size,
          prevDiffMinutes: prev != null ? v.totalMinutes - prev.totalMinutes : null,
        };
      });
    }
  }

  // ─────────────────────────────────────────────────────
  // 주간 리포트 상세
  // ─────────────────────────────────────────────────────
  async getWeeklyReport(userId: string, yearParam?: number, weekParam?: number) {
    const { year, week } = yearParam != null && weekParam != null
      ? { year: yearParam, week: weekParam }
      : this.getISOWeek(new Date());

    const weekStart = this.getWeekStart(year, week);
    const weekEnd   = new Date(weekStart); weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    const nextMonday = new Date(weekStart.getTime() + 7 * 86_400_000);

    const sessions = await this.prisma.practiceSession.findMany({
      where: { userId, practicedAt: { gte: weekStart, lte: weekEnd } },
      include: { song: { select: { id: true, title: true } } },
      orderBy: { practicedAt: 'asc' },
    });

    const totalMinutes = sessions.reduce((s, p) => s + p.durationMinutes, 0);

    // 지난 주 총 시간
    const prevStart = new Date(weekStart); prevStart.setUTCDate(weekStart.getUTCDate() - 7);
    const prevEnd   = new Date(weekStart); prevEnd.setUTCDate(weekStart.getUTCDate() - 1);
    const prevAgg   = await this.prisma.practiceSession.aggregate({
      _sum: { durationMinutes: true },
      where: { userId, practicedAt: { gte: prevStart, lte: prevEnd } },
    });
    const prevTotal = prevAgg._sum.durationMinutes ?? 0;
    const prevDiffMinutes = (prevTotal > 0 || totalMinutes > 0) ? totalMinutes - prevTotal : null;

    // 요일별 데이터 (월~일)
    const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];
    const dayData = DAY_NAMES.map((day, i) => {
      const date = new Date(weekStart); date.setUTCDate(weekStart.getUTCDate() + i);
      const dateStr = this.formatDate(date);
      const minutes = sessions
        .filter(s => this.formatDate(s.practicedAt) === dateStr)
        .reduce((acc, s) => acc + s.durationMinutes, 0);
      return { day, date: dateStr, minutes };
    });

    // 곡별 연습 시간 TOP 3
    const songMinMap = new Map<string, { title: string; minutes: number }>();
    for (const s of sessions) {
      if (!s.song) continue;
      const e = songMinMap.get(s.song.id);
      if (e) e.minutes += s.durationMinutes;
      else   songMinMap.set(s.song.id, { title: s.song.title, minutes: s.durationMinutes });
    }
    const topSongs = [...songMinMap.values()]
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 3);

    // BPM 향상 곡 (이번 주 BPM 레코드)
    const bpmRecords = await this.prisma.bpmRecord.findMany({
      where: { userId, recordedAt: { gte: weekStart, lt: nextMonday } },
      include: { song: { select: { title: true } } },
      orderBy: { recordedAt: 'asc' },
    });
    const bpmBySong = new Map<string, { title: string; records: number[] }>();
    for (const r of bpmRecords) {
      const e = bpmBySong.get(r.songId);
      if (e) e.records.push(r.bpm);
      else   bpmBySong.set(r.songId, { title: r.song.title, records: [r.bpm] });
    }
    const bpmGains: { title: string; fromBpm: number; toBpm: number }[] = [];
    for (const [, v] of bpmBySong) {
      if (v.records.length >= 2) {
        const first = v.records[0]; const last = v.records[v.records.length - 1];
        if (last > first) bpmGains.push({ title: v.title, fromBpm: first, toBpm: last });
      }
    }

    const practicedDays = new Set(sessions.map(s => this.formatDate(s.practicedAt))).size;
    const { currentStreak } = await this.computeStreak(userId);

    return {
      year, week,
      label: `${year}년 ${weekStart.getUTCMonth() + 1}월 ${this.getWeekOfMonth(weekStart)}주차`,
      dateRange: `${weekStart.getUTCMonth() + 1}/${weekStart.getUTCDate()} ~ ${weekEnd.getUTCMonth() + 1}/${weekEnd.getUTCDate()}`,
      totalMinutes, practicedDays, prevDiffMinutes,
      streak: currentStreak,
      dayData, topSongs, bpmGains,
    };
  }

  // ─────────────────────────────────────────────────────
  // 월간 리포트 상세
  // ─────────────────────────────────────────────────────
  async getMonthlyReport(userId: string, yearParam?: number, monthParam?: number) {
    const now = new Date();
    const year  = yearParam  ?? now.getUTCFullYear();
    const month = monthParam ?? now.getUTCMonth() + 1;

    const startDate  = new Date(Date.UTC(year, month - 1, 1));
    const endDate    = new Date(Date.UTC(year, month, 0));
    const nextMonthStart = new Date(Date.UTC(year, month, 1));

    const sessions = await this.prisma.practiceSession.findMany({
      where: { userId, practicedAt: { gte: startDate, lte: endDate } },
      include: { instrument: { select: { name: true } } },
      orderBy: { practicedAt: 'asc' },
    });

    const totalMinutes  = sessions.reduce((s, p) => s + p.durationMinutes, 0);
    const practicedDays = new Set(sessions.map(s => this.formatDate(s.practicedAt))).size;

    // 전달 대비
    const prevYear  = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevAgg   = await this.prisma.practiceSession.aggregate({
      _sum: { durationMinutes: true },
      where: {
        userId,
        practicedAt: {
          gte: new Date(Date.UTC(prevYear, prevMonth - 1, 1)),
          lte: new Date(Date.UTC(prevYear, prevMonth, 0)),
        },
      },
    });
    const prevTotal = prevAgg._sum.durationMinutes ?? 0;
    const prevDiffMinutes = (prevTotal > 0 || totalMinutes > 0) ? totalMinutes - prevTotal : null;

    // 악기별 분포
    const COLORS = ['#0EA5E9', '#2DD4BF', '#7DD3FC', '#F59E0B', '#10B981'];
    const instMap = new Map<string, number>();
    for (const s of sessions) {
      const name = s.instrument?.name ?? '기타';
      instMap.set(name, (instMap.get(name) ?? 0) + s.durationMinutes);
    }
    const instruments = [...instMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, minutes], i) => ({ name, minutes, color: COLORS[i % COLORS.length] }));

    // 이달 최고 BPM 향상 곡
    const bpmRecords = await this.prisma.bpmRecord.findMany({
      where: { userId, recordedAt: { gte: startDate, lt: nextMonthStart } },
      include: { song: { select: { title: true } } },
      orderBy: { recordedAt: 'asc' },
    });
    const bpmBySong = new Map<string, { title: string; records: number[] }>();
    for (const r of bpmRecords) {
      const e = bpmBySong.get(r.songId);
      if (e) e.records.push(r.bpm);
      else   bpmBySong.set(r.songId, { title: r.song.title, records: [r.bpm] });
    }
    let topBpmSong: { title: string; fromBpm: number; toBpm: number } | null = null;
    let maxGain = 0;
    for (const [, v] of bpmBySong) {
      if (v.records.length >= 2) {
        const gain = v.records[v.records.length - 1] - v.records[0];
        if (gain > maxGain) {
          maxGain = gain;
          topBpmSong = { title: v.title, fromBpm: v.records[0], toBpm: v.records[v.records.length - 1] };
        }
      }
    }

    // 요일별 히트맵 (0=월~6=일, 평균 분)
    const dayMinutes = new Array(7).fill(0) as number[];
    const dayCounts  = new Array(7).fill(0) as number[];
    for (const s of sessions) {
      const dow = (s.practicedAt.getUTCDay() + 6) % 7;
      dayMinutes[dow] += s.durationMinutes;
      dayCounts[dow]++;
    }
    const dayHeatmap = dayMinutes.map((m, i) => dayCounts[i] > 0 ? Math.round(m / dayCounts[i]) : 0);

    // 시간대별 히트맵 (createdAt 기준)
    const hourHeatmap = new Array(24).fill(0) as number[];
    for (const s of sessions) {
      hourHeatmap[s.createdAt.getUTCHours()]++;
    }

    // 이달 최장 스트리크
    const practicedSet = [...new Set(sessions.map(s => this.formatDate(s.practicedAt)))].sort();
    let bestStreak = practicedSet.length > 0 ? 1 : 0;
    let run = 1;
    for (let i = 1; i < practicedSet.length; i++) {
      const diff = (new Date(practicedSet[i]).getTime() - new Date(practicedSet[i - 1]).getTime()) / 86_400_000;
      run = diff === 1 ? run + 1 : 1;
      if (run > bestStreak) bestStreak = run;
    }

    return {
      year, month,
      label: `${year}년 ${month}월`,
      totalMinutes, practicedDays, prevDiffMinutes,
      bestStreak, instruments, topBpmSong, dayHeatmap, hourHeatmap,
    };
  }

  // ─────────────────────────────────────────────────────
  // 내부 헬퍼
  // ─────────────────────────────────────────────────────
  // ISO 주차 계산 (public — 컨트롤러에서도 사용)
  getISOWeek(date: Date): { year: number; week: number } {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
    return { year: d.getUTCFullYear(), week };
  }

  private getWeekStart(year: number, week: number): Date {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dow  = jan4.getUTCDay() || 7;
    const start = new Date(jan4);
    start.setUTCDate(jan4.getUTCDate() - dow + 1 + (week - 1) * 7);
    return start;
  }

  private getWeekOfMonth(date: Date): number {
    // 단순히 날짜 기준으로 주차 계산: 1~7일=1주차, 8~14일=2주차...
    return Math.ceil(date.getUTCDate() / 7);
  }

  private formatDate(date: Date): string {
    // @db.Date 값은 UTC midnight으로 저장됨
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toDateOnly(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * 실제 세션 데이터에서 연속 일수를 직접 계산.
   * 저장된 Streak 카운터는 세션 삭제/수정 시 보정되지 않아 신뢰할 수 없으므로
   * 매번 실제 데이터 기반으로 계산한다.
   */
  private async computeStreak(userId: string) {
    // 연습한 날짜 목록 (중복 제거, 최신순)
    const rows = await this.prisma.practiceSession.findMany({
      where:    { userId },
      select:   { practicedAt: true },
      distinct: ['practicedAt'],
      orderBy:  { practicedAt: 'desc' },
    });

    if (rows.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // UTC midnight ms 배열 (내림차순)
    const days = rows.map(r => {
      const d = r.practicedAt;
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    });

    const todayMs = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    );

    // currentStreak: 오늘 또는 어제부터 이어지는 연속 일수
    let currentStreak = 0;
    const diffFromToday = Math.round((todayMs - days[0]) / 86_400_000);
    if (diffFromToday <= 1) {
      currentStreak = 1;
      for (let i = 1; i < days.length; i++) {
        if (Math.round((days[i - 1] - days[i]) / 86_400_000) === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // longestStreak: 전체 기록 중 가장 긴 연속 일수
    let longestStreak = currentStreak;
    let run = 1;
    for (let i = 1; i < days.length; i++) {
      if (Math.round((days[i - 1] - days[i]) / 86_400_000) === 1) {
        run++;
        if (run > longestStreak) longestStreak = run;
      } else {
        run = 1;
      }
    }

    return { currentStreak, longestStreak };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatSession(s: any) {
    return {
      id: s.id,
      practicedAt: s.practicedAt,
      durationMinutes: s.durationMinutes,
      bpm: s.bpm ?? null,
      instrumentName: s.instrument?.name ?? null,
      songTitle: s.song?.title ?? null,
      artist: s.song?.artist ?? null,
      targetBpm: s.song?.targetBpm ?? null,
      practiceTypes: s.sessionTypes?.map((t: any) => t.practiceType) ?? [],
      memos: s.memos?.map((m: any) => ({ id: m.id, content: m.content, createdAt: m.createdAt })) ?? [],
      createdAt: s.createdAt,
    };
  }
}
