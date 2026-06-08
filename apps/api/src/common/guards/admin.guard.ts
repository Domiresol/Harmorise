import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * ADMIN role 전용 Guard.
 * JwtAuthGuard 이후에 사용 — req.user가 이미 세팅된 상태를 전제.
 *
 * 사용법:
 *   @UseGuards(JwtAuthGuard, AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ user?: { role?: string } }>();

    if (!req.user) {
      throw new UnauthorizedException('인증이 필요합니다.');
    }

    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }

    return true;
  }
}
