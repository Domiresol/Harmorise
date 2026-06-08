import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';

// ── Prisma 모킹 ────────────────────────────────────────────────────────────────
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
  },
  phoneVerification: {
    create:     jest.fn(),
    findFirst:  jest.fn(),
    update:     jest.fn(),
  },
};

const mockJwt = {
  sign:       jest.fn().mockReturnValue('mock-access-token'),
  signAsync:  jest.fn().mockResolvedValue('mock-phone-token'),
  verifyAsync: jest.fn(),
};

const mockSms = {
  generateCode:          jest.fn().mockReturnValue('123456'),
  sendVerificationCode:  jest.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService,    useValue: mockJwt },
        { provide: SmsService,    useValue: mockSms },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── sendCode ──────────────────────────────────────────────────────────────
  describe('sendCode', () => {
    const dto = { phone: '01012345678' };

    it('신규 번호면 인증번호 레코드를 생성하고 SMS를 발송한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.phoneVerification.create.mockResolvedValue({});

      const result = await service.sendCode(dto, true);

      expect(mockPrisma.phoneVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ phone: dto.phone, code: '123456' }) }),
      );
      expect(mockSms.sendVerificationCode).toHaveBeenCalledWith(dto.phone, '123456');
      expect(result).toEqual({ message: '인증번호가 발송되었습니다.' });
    });

    it('이미 가입된 번호면 ConflictException을 던진다 (signup=true)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(service.sendCode(dto, true)).rejects.toThrow(ConflictException);
    });

    it('아이디찾기 용도(signup=false)면 중복 체크를 하지 않는다', async () => {
      mockPrisma.phoneVerification.create.mockResolvedValue({});

      await service.sendCode(dto, false);

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  // ─── verifyCode ────────────────────────────────────────────────────────────
  describe('verifyCode', () => {
    const dto = { phone: '01012345678', code: '123456' };

    const validRecord = {
      id:        'rec-uuid',
      phone:     '01012345678',
      code:      '123456',
      expiresAt: new Date(Date.now() + 60_000),
      isUsed:    false,
    };

    it('올바른 코드면 phoneToken을 반환하고 레코드를 사용 처리한다', async () => {
      mockPrisma.phoneVerification.findFirst.mockResolvedValue(validRecord);
      mockPrisma.phoneVerification.update.mockResolvedValue({});

      const result = await service.verifyCode(dto);

      expect(mockPrisma.phoneVerification.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isUsed: true } }),
      );
      expect(result).toEqual({ phoneToken: 'mock-phone-token' });
    });

    it('만료된 레코드가 없으면 BadRequestException을 던진다', async () => {
      mockPrisma.phoneVerification.findFirst.mockResolvedValue(null);

      await expect(service.verifyCode(dto)).rejects.toThrow(BadRequestException);
    });

    it('코드가 틀리면 BadRequestException을 던진다', async () => {
      mockPrisma.phoneVerification.findFirst.mockResolvedValue({
        ...validRecord,
        code: '999999',
      });

      await expect(service.verifyCode({ ...dto, code: '123456' })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── signup ────────────────────────────────────────────────────────────────
  describe('signup', () => {
    const dto = {
      email:      'test@example.com',
      password:   'password12',
      phone:      '01012345678',
      phoneToken: 'valid-phone-token',
    };

    beforeEach(() => {
      // phoneToken 검증 성공 stub
      mockJwt.verifyAsync.mockResolvedValue({
        phone:    dto.phone,
        verified: true,
        purpose:  'phone-verified',
      });
    });

    it('정상 입력이면 사용자를 생성하고 accessToken을 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // 이메일, 전화번호 모두 미존재
      mockPrisma.user.create.mockResolvedValue({
        id:    'new-user-id',
        email: dto.email,
        role:  'USER',
      });

      const result = await service.signup(dto);

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'mock-access-token' });
    });

    it('이미 사용 중인 이메일이면 ConflictException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' }); // 이메일 중복

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });

    it('phoneToken이 유효하지 않으면 BadRequestException을 던진다', async () => {
      mockJwt.verifyAsync.mockRejectedValue(new Error('invalid token'));

      await expect(service.signup(dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────
  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'password12' };

    it('올바른 자격증명이면 accessToken을 반환한다', async () => {
      const hash = await bcrypt.hash(dto.password, 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id:           'user-id',
        email:        dto.email,
        passwordHash: hash,
        isActive:     true,
        role:         'USER',
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.login(dto);

      expect(result).toEqual({ accessToken: 'mock-access-token' });
    });

    it('존재하지 않는 이메일이면 UnauthorizedException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('비밀번호가 틀리면 UnauthorizedException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id:           'user-id',
        email:        dto.email,
        passwordHash: await bcrypt.hash('other-password', 12),
        isActive:     true,
        role:         'USER',
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('비활성화 계정이면 UnauthorizedException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id:           'user-id',
        email:        dto.email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        isActive:     false,
        role:         'USER',
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── findId ────────────────────────────────────────────────────────────────
  describe('findId', () => {
    const dto = { phone: '01012345678', phoneToken: 'valid-token' };

    beforeEach(() => {
      mockJwt.verifyAsync.mockResolvedValue({
        phone:    dto.phone,
        verified: true,
        purpose:  'phone-verified',
      });
    });

    it('이메일을 마스킹해서 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'dosol@gmail.com' });

      const result = await service.findId(dto);

      // d***l@gmail.com 형태
      expect(result.email).toMatch(/^d\*+l@gmail\.com$/);
    });

    it('두 글자 이하 로컬파트도 마스킹된다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'ab@example.com' });

      const result = await service.findId(dto);

      expect(result.email).toMatch(/^a\*@example\.com$/);
    });

    it('가입된 계정이 없으면 NotFoundException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findId(dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── resetPassword ─────────────────────────────────────────────────────────
  describe('resetPassword', () => {
    const dto = {
      phone:       '01012345678',
      phoneToken:  'valid-token',
      newPassword: 'newPass123',
    };

    beforeEach(() => {
      mockJwt.verifyAsync.mockResolvedValue({
        phone:    dto.phone,
        verified: true,
        purpose:  'phone-verified',
      });
    });

    it('비밀번호를 해싱하여 업데이트한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-id' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.resetPassword(dto);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-id' } }),
      );
      expect(result).toEqual({ message: '비밀번호가 변경되었습니다.' });
    });

    it('가입된 계정이 없으면 NotFoundException을 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(NotFoundException);
    });
  });
});
