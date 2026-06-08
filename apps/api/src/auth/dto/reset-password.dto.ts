import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Matches(/^01[016789]\d{7,8}$/, { message: '올바른 휴대폰 번호를 입력해주세요.' })
  declare phone: string;

  @IsString()
  declare phoneToken: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  @MaxLength(50)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: '비밀번호는 영문과 숫자를 모두 포함해야 합니다.',
  })
  declare newPassword: string;
}
