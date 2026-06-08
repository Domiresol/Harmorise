import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  let service: SmsService;
  let logSpy: jest.SpyInstance;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      throw new Error(`Config key not set: ${key}`);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);

    // Logger.log 스파이
    logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── generateCode ──────────────────────────────────────────────────────────
  describe('generateCode', () => {
    it('6자리 숫자 문자열을 반환한다', () => {
      const code = service.generateCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('100000 이상 999999 이하인 값만 생성된다', () => {
      for (let i = 0; i < 20; i++) {
        const n = Number(service.generateCode());
        expect(n).toBeGreaterThanOrEqual(100000);
        expect(n).toBeLessThanOrEqual(999999);
      }
    });
  });

  // ─── sendVerificationCode (개발 환경) ──────────────────────────────────────
  describe('sendVerificationCode - dev', () => {
    it('개발 환경에서는 에러 없이 완료되고 logger.log 를 호출한다', async () => {
      await expect(
        service.sendVerificationCode('01012345678', '123456'),
      ).resolves.toBeUndefined();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('01012345678'),
      );
    });

    it('로그 메시지에 인증번호가 포함된다', async () => {
      await service.sendVerificationCode('01099998888', '654321');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('654321'));
    });
  });
});
