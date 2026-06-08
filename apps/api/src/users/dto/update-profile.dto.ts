import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  declare nickname?: string;

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
