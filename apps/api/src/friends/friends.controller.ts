import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, ParseUUIDPipe, Req,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto, RespondFriendRequestDto } from './dto/friend.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string };
}

@UseGuards(JwtAuthGuard)
@Controller()
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  // GET /users/search?q=
  @Get('users/search')
  searchUsers(
    @Query('q') q: string,
    @Req() req: AuthRequest,
  ) {
    return this.friendsService.searchUsers(q, req.user.id);
  }

  // POST /friends/requests
  @Post('friends/requests')
  sendRequest(
    @Req() req: AuthRequest,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(req.user.id, dto);
  }

  // GET /friends/requests
  @Get('friends/requests')
  getIncomingRequests(@Req() req: AuthRequest) {
    return this.friendsService.getIncomingRequests(req.user.id);
  }

  // PATCH /friends/requests/:requestId
  @Patch('friends/requests/:requestId')
  respondToRequest(
    @Req() req: AuthRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendsService.respondToRequest(req.user.id, requestId, dto);
  }

  // GET /friends
  @Get('friends')
  getFriends(@Req() req: AuthRequest) {
    return this.friendsService.getFriends(req.user.id);
  }

  // DELETE /friends/:friendId
  @Delete('friends/:friendId')
  removeFriend(
    @Req() req: AuthRequest,
    @Param('friendId', ParseUUIDPipe) friendId: string,
  ) {
    return this.friendsService.removeFriend(req.user.id, friendId);
  }

  // GET /friends/:userId/profile
  @Get('friends/:userId/profile')
  getFriendProfile(
    @Req() req: AuthRequest,
    @Param('userId', ParseUUIDPipe) friendId: string,
  ) {
    return this.friendsService.getFriendProfile(req.user.id, friendId);
  }
}
