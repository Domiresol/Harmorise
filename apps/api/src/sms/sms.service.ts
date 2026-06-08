import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly isDev: boolean;

  constructor(private readonly config: ConfigService) {
    this.isDev = config.get<string>('NODE_ENV') !== 'production';
  }

  /**
   * 6자리 인증번호 생성
   */
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * SMS 인증번호 발송
   *
   * 개발 환경: 콘솔 출력만
   * 프로덕션: Solapi로 실제 문자 발송
   *
   * Solapi 설정법:
   *   1. https://app.solapi.com 가입 후 API Key/Secret 발급
   *   2. 발신 번호 등록 (본인 명의 번호)
   *   3. .env에 아래 항목 추가:
   *      SOLAPI_API_KEY=...
   *      SOLAPI_API_SECRET=...
   *      SOLAPI_SENDER=01012345678  (등록한 발신 번호)
   */
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const message = `[Harmorise] 인증번호는 [${code}]입니다. 3분 이내에 입력해주세요.`;

    if (this.isDev) {
      // 개발 환경: 콘솔에만 출력
      this.logger.log(`📱 [DEV] SMS to ${phone}: ${message}`);
      return;
    }

    // 프로덕션: Solapi 실제 발송
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SolapiMessageService } = require('solapi');
      const apiKey    = this.config.getOrThrow<string>('SOLAPI_API_KEY');
      const apiSecret = this.config.getOrThrow<string>('SOLAPI_API_SECRET');
      const from      = this.config.getOrThrow<string>('SOLAPI_SENDER');

      const service = new SolapiMessageService(apiKey, apiSecret);
      await service.sendOne({ to: phone, from, text: message });

      this.logger.log(`SMS sent to ${phone}`);
    } catch (err) {
      this.logger.error(`SMS 발송 실패: ${phone}`, err);
      throw new Error('SMS 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  }
}
