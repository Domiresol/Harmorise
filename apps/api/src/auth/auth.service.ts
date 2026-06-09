import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { FindIdDto } from './dto/find-id.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const VERIFICATION_TTL_MINUTES  = 3;
const SMS_COOLDOWN_SECONDS       = 60;  // 재발송 최소 간격

@Injectable()
export class AuthService {
  private readonly phoneTokenSecret: string;

  constructor(
    private readonly prisma:    PrismaService,
    private readonly jwt:       JwtService,
    private readonly sms:       SmsService,
    private readonly config:    ConfigService,
    private readonly auditLog:  AuditLogService,
  ) {
    this.phoneTokenSecret = this.config.getOrThrow<string>('PHONE_TOKEN_SECRET');
  }

  // ─────────────────────────────────────────────────────────────
  // 전화번호 인증 1단계: 인증번호 발송
  // ─────────────────────────────────────────────────────────────

  /**
   * @param checkDuplicate true면 이미 가입된 번호인지 확인 후 차단 (회원가입용)
   *                       false면 번호만 인증 (아이디찾기/비밀번호초기화용)
   */
  async sendCode(dto: SendCodeDto, checkDuplicate: boolean): Promise<{ message: string }> {
    if (checkDuplicate) {
      const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existing) {
        throw new ConflictException('이미 가입된 전화번호입니다.');
      }
    }

    // 60초 쿨다운: 최근 발송 기록 확인
    const recentlySent = await this.prisma.phoneVerification.findFirst({
      where: {
        phone: dto.phone,
        createdAt: { gt: new Date(Date.now() - SMS_COOLDOWN_SECONDS * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recentlySent) {
      const waitSec = SMS_COOLDOWN_SECONDS - Math.floor((Date.now() - recentlySent.createdAt.getTime()) / 1000);
      throw new BadRequestException(`인증번호를 이미 발송했습니다. ${waitSec}초 후 다시 시도해주세요.`);
    }

    // 만료된 레코드 정리 (해당 번호의 오래된 레코드 삭제)
    await this.prisma.phoneVerification.deleteMany({
      where: {
        phone:     dto.phone,
        expiresAt: { lt: new Date() },
      },
    });

    const code      = this.sms.generateCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000);

    await this.prisma.phoneVerification.create({
      data: { phone: dto.phone, code, expiresAt },
    });

    await this.sms.sendVerificationCode(dto.phone, code);

    return { message: '인증번호가 발송되었습니다.' };
  }

  // ─────────────────────────────────────────────────────────────
  // 전화번호 인증 2단계: 인증번호 확인
  // ─────────────────────────────────────────────────────────────

  async verifyCode(dto: VerifyCodeDto): Promise<{ phoneToken: string }> {
    // 해당 번호의 최신 미사용 인증 레코드 조회
    const record = await this.prisma.phoneVerification.findFirst({
      where: {
        phone:  dto.phone,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('인증번호가 만료되었거나 존재하지 않습니다. 다시 요청해주세요.');
    }

    if (record.code !== dto.code) {
      throw new BadRequestException('인증번호가 올바르지 않습니다.');
    }

    // 사용 처리
    await this.prisma.phoneVerification.update({
      where: { id: record.id },
      data:  { isUsed: true },
    });

    // 단기 phoneToken 발급 (10분 유효, 회원가입/아이디찾기/비번초기화에서 사용)
    const phoneToken = await this.jwt.signAsync(
      { phone: dto.phone, verified: true, purpose: this.phoneTokenSecret },
      { expiresIn: '10m' },
    );

    return { phoneToken };
  }

  // ─────────────────────────────────────────────────────────────
  // 회원가입
  // ─────────────────────────────────────────────────────────────

  async signup(dto: SignupDto): Promise<{ accessToken: string }> {
    // phoneToken 검증
    await this.verifyPhoneToken(dto.phoneToken, dto.phone);

    // 이메일 중복 확인
    const emailExists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailExists) throw new ConflictException('이미 사용 중인 이메일입니다.');

    // 전화번호 중복 확인 (혹시 모를 race condition 대비)
    const phoneExists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (phoneExists) throw new ConflictException('이미 가입된 전화번호입니다.');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // handle 자동 생성: 이메일 로컬파트 영문/숫자만 + 중복 시 랜덤 suffix
    const baseHandle  = dto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const handle      = await this.generateUniqueHandle(baseHandle || 'user');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        phone: dto.phone,
        profile: {
          create: { nickname: dto.email.split('@')[0], handle },
        },
        subscription: {
          create: { plan: 'FREE' },
        },
        streak: {
          create: {},
        },
      },
    });

    return { accessToken: this.issueAccessToken(user.id, user.email, user.role) };
  }

  // ─────────────────────────────────────────────────────────────
  // 로그인
  // ─────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<{ accessToken: string; user: { id: string; email: string; role: string } }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      await this.auditLog.log('LOGIN_FAIL', undefined, { email: dto.email, reason: 'user_not_found' });
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.auditLog.log('LOGIN_FAIL', user.id, { reason: 'wrong_password' });
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    if (!user.isActive) {
      await this.auditLog.log('LOGIN_FAIL', user.id, { reason: 'account_inactive' });
      throw new UnauthorizedException('비활성화된 계정입니다. 고객센터에 문의해주세요.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    });

    await this.auditLog.log('LOGIN_SUCCESS', user.id);

    return {
      accessToken: this.issueAccessToken(user.id, user.email, user.role),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 아이디(이메일) 찾기
  // ─────────────────────────────────────────────────────────────

  async findId(dto: FindIdDto): Promise<{ email: string }> {
    await this.verifyPhoneToken(dto.phoneToken, dto.phone);

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('해당 전화번호로 가입된 계정이 없습니다.');
    }

    // 이메일 마스킹: dosol@gmail.com → d***l@gmail.com
    const [localPart, domain] = user.email.split('@');
    const masked =
      localPart.length <= 2
        ? localPart[0] + '*'.repeat(localPart.length - 1)
        : localPart[0] + '*'.repeat(localPart.length - 2) + localPart.slice(-1);

    return { email: `${masked}@${domain}` };
  }

  // ─────────────────────────────────────────────────────────────
  // 비밀번호 초기화
  // ─────────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.verifyPhoneToken(dto.phoneToken, dto.phone);

    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      throw new NotFoundException('해당 전화번호로 가입된 계정이 없습니다.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { passwordHash },
    });

    return { message: '비밀번호가 변경되었습니다.' };
  }

  // ─────────────────────────────────────────────────────────────
  // 내부 헬퍼
  // ─────────────────────────────────────────────────────────────

  private async generateUniqueHandle(base: string): Promise<string> {
    // 최대 30자 제한
    const trimmed = base.slice(0, 24);
    let candidate = trimmed;
    while (true) {
      const exists = await this.prisma.userProfile.findUnique({ where: { handle: candidate } });
      if (!exists) return candidate;
      // 중복이면 4자리 랜덤 숫자 suffix
      candidate = `${trimmed}${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }

  private issueAccessToken(id: string, email: string, role: string): string {
    return this.jwt.sign({ sub: id, email, role });
  }

  private async verifyPhoneToken(token: string, expectedPhone: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync<{ phone: string; verified: boolean; purpose: string }>(token);
      if (payload.phone !== expectedPhone || !payload.verified || payload.purpose !== this.phoneTokenSecret) {
        throw new Error();
      }
    } catch {
      throw new BadRequestException('전화번호 인증이 유효하지 않습니다. 다시 인증해주세요.');
    }
  }
}
