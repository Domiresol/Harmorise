import { IsString, IsUUID, IsIn } from 'class-validator';

export class SendFriendRequestDto {
  @IsUUID()
  toUserId!: string;
}

export class RespondFriendRequestDto {
  @IsString()
  @IsIn(['accept', 'reject'])
  action!: 'accept' | 'reject';
}
