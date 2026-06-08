import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PracticeType } from '@prisma/client';

/** PATCH /practice/:id — 모든 필드 선택적 */
export class UpdatePracticeDto {
  @IsOptional()
  @IsDateString()
  practicedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(720)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  instrumentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  songTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  artist?: string;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(300)
  bpm?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(300)
  targetBpm?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(PracticeType, { each: true })
  practiceTypes?: PracticeType[];

  /** 메모 — null 전달 시 기존 메모 삭제 */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string | null;
}
