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

export class CreatePracticeDto {
  /** 연습 날짜 (YYYY-MM-DD) */
  @IsDateString()
  practicedAt!: string;

  /** 연습 시간 (분, 5~720) */
  @IsInt()
  @Min(5)
  @Max(720)
  durationMinutes!: number;

  /** 악기 이름 (문자열 — 없으면 find-or-create) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  instrumentName?: string;

  /** 곡 제목 (선택) */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  songTitle?: string;

  /** 아티스트 (선택) */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  artist?: string;

  /** 이 세션의 BPM (달성 BPM, 선택) */
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(300)
  bpm?: number;

  /** 곡 목표 BPM (선택 — Song.targetBpm 에 저장) */
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(300)
  targetBpm?: number;

  /** 연습 유형 (복수 선택) */
  @IsOptional()
  @IsArray()
  @IsEnum(PracticeType, { each: true })
  practiceTypes?: PracticeType[];

  /** 메모 (선택, 최대 1000자) */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;
}
