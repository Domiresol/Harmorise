import {
  IsString, IsOptional, MaxLength, MinLength, IsIn, IsUUID,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  description?: string;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  description?: string;
}

export class JoinRoomDto {
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  inviteCode!: string;
}

export class RespondJoinRequestDto {
  @IsString()
  @IsIn(['accept', 'reject'])
  action!: 'accept' | 'reject';
}
