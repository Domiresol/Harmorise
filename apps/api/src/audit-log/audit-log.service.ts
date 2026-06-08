import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditMeta = Record<string, string | number | boolean | null | undefined>;

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 감사 로그 기록 — 실패해도 메인 플로우에 영향 없도록 내부에서 catch
   */
  async log(action: AuditAction, userId?: string, meta: AuditMeta = {}): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          userId: userId ?? null,
          meta,
        },
      });
    } catch {
      // 로그 실패가 서비스 장애로 이어지지 않도록 조용히 무시
    }
  }
}
