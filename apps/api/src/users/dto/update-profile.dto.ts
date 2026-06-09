import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  declare nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  declare handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  declare bio?: string;

  @IsOptional()
  @IsString()
  declare mainInstrumentId?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(720)
  declare dailyGoalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(5040)
  declare weeklyGoalMinutes?: number;
}
