import { IsString, Matches, Length } from 'class-validator';

export class VerifyCodeDto {
  @IsString()
  @Matches(/^01[016789]\d{7,8}$/, { message: '올바른 휴대폰 번호를 입력해주세요.' })
  declare phone: string;

  @IsString()
  @Length(6, 6, { message: '인증번호는 6자리입니다.' })
  declare code: string;
}
