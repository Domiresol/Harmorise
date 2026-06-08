import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/** 개발 환경 여부 — Rate Limit을 건너뜀 */
const IS_DEV = process.env['NODE_ENV'] !== 'production';

/** 요청 기록 버킷 */
interface Bucket {
  count:     number;
  resetAt:   number;  // epoch ms
}

/** @RateLimit 데코레이터로 설정 전달 */
export const RATE_LIMIT_KEY = 'rate_limit';
export interface RateLimitOptions {
  /** 윈도우 크기 (초) */
  windowSec: number;
  /** 윈도우 내 최대 요청 수 */
  max: number;
}

/** 데코레이터 팩토리 */
import { SetMetadata } from '@nestjs/common';
export const RateLimit = (opts: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, opts);

/**
 * 인메모리 슬라이딩-윈도우 Rate Limit Guard.
 * 프로덕션에서는 Redis 기반으로 교체 권장.
 *
 * 적용: @UseGuards(RateLimitGuard) + @RateLimit({ windowSec, max })
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {
    // 5분마다 만료된 키 정리
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  canActivate(ctx: ExecutionContext): boolean {
    // 개발 환경에서는 Rate Limit 비활성화
    if (IS_DEV) return true;

    const opts = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!opts) return true;  // 데코레이터 없으면 통과

    const req = ctx.switchToHttp().getRequest<{ ip?: string; socket?: { remoteAddress?: string } }>();
    const ip  = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const key = `${ctx.getClass().name}:${ctx.getHandler().name}:${ip}`;
    const now = Date.now();
    const windowMs = opts.windowSec * 1000;

    const bucket = this.store.get(key);

    if (!bucket || now > bucket.resetAt) {
      // 새 윈도우 시작
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    bucket.count += 1;

    if (bucket.count > opts.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      throw new HttpException(
        { statusCode: 429, message: `요청이 너무 많습니다. ${retryAfter}초 후 다시 시도해주세요.` },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, bucket] of this.store.entries()) {
      if (now > bucket.resetAt) this.store.delete(key);
    }
  }
}
