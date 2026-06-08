import { Body, Controller, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendCodeDto }      from './dto/send-code.dto';
import { VerifyCodeDto }    from './dto/verify-code.dto';
import { SignupDto }        from './dto/signup.dto';
import { LoginDto }         from './dto/login.dto';
import { FindIdDto }        from './dto/find-id.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RateLimitGuard, RateLimit } from '../common/guards/rate-limit.guard';

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/phone/send-code?signup=true
   * - signup=true  → 회원가입용 (기존 번호 차단)
   * - signup=false → 아이디찾기/비번초기화용
   * Rate Limit: IP당 10분에 3회 (SMS 요금 폭탄 방지)
   */
  @Post('phone/send-code')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowSec: 600, max: 3 })
  sendCode(
    @Body() dto: SendCodeDto,
    @Query('signup') signup: string,
  ) {
    return this.authService.sendCode(dto, signup === 'true');
  }

  /**
   * POST /api/auth/phone/verify
   * Rate Limit: IP당 10분에 10회 (브루트포스 방지)
   */
  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowSec: 600, max: 10 })
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto);
  }

  /** POST /api/auth/signup — IP당 1시간에 5회 */
  @Post('signup')
  @RateLimit({ windowSec: 3600, max: 5 })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  /**
   * POST /api/auth/login
   * Rate Limit: IP당 15분에 10회 (브루트포스 방지)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowSec: 900, max: 10 })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** POST /api/auth/find-id — IP당 10분에 5회 */
  @Post('find-id')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowSec: 600, max: 5 })
  findId(@Body() dto: FindIdDto) {
    return this.authService.findId(dto);
  }

  /** POST /api/auth/reset-password — IP당 10분에 5회 */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowSec: 600, max: 5 })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
