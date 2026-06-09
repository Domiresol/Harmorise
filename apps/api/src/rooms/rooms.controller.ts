import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, ParseUUIDPipe, Req,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import {
  CreateRoomDto, UpdateRoomDto,
  JoinRoomDto, RespondJoinRequestDto,
} from './dto/room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string };
}

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // POST /rooms — 방 생성
  @Post()
  createRoom(
    @Req() req: AuthRequest,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomsService.createRoom(req.user.id, dto);
  }

  // GET /rooms — 내 방 목록
  @Get()
  getMyRooms(@Req() req: AuthRequest) {
    return this.roomsService.getMyRooms(req.user.id);
  }

  // POST /rooms/join — 초대코드로 입장 요청
  @Post('join')
  requestJoin(
    @Req() req: AuthRequest,
    @Body() dto: JoinRoomDto,
  ) {
    return this.roomsService.requestJoin(req.user.id, dto);
  }

  // GET /rooms/:roomId — 방 상세
  @Get(':roomId')
  getRoomDetail(
    @Req() req: AuthRequest,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.roomsService.getRoomDetail(roomId, req.user.id);
  }

  // PATCH /rooms/:roomId — 방 정보 수정 (방장)
  @Patch(':roomId')
  updateRoom(
    @Req() req: AuthRequest,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.updateRoom(roomId, req.user.id, dto);
  }

  // DELETE /rooms/:roomId — 방 삭제 (방장)
  @Delete(':roomId')
  deleteRoom(
    @Req() req: AuthRequest,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.roomsService.deleteRoom(roomId, req.user.id);
  }

  // GET /rooms/:roomId/feed — 방 피드
  @Get(':roomId/feed')
  getRoomFeed(
    @Req() req: AuthRequest,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.roomsService.getRoomFeed(roomId, req.user.id, cursor, limit ? +limit : 20);
  }

  // GET /rooms/:roomId/members — 멤버 목록
  @Get(':roomId/members')
  getRoomMembers(
    @Req() req: AuthRequest,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.roomsService.getRoomMembers(roomId, req.user.id);
  }

  // DELETE /rooms/:roomId/members/me — 방 나가기
  @Delete(':roomId/members/me')
  leaveRoom(
    @Req() req: AuthRequest,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.roomsService.leaveRoom(roomId, req.user.id);
  }

  // DELETE /rooms/:roomId/members/:targetUserId — 멤버 강퇴 (방장)
  @Delete(':roomId/members/:targetUserId')
  kickMember(
    @Req() req: AuthRequest,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.roomsService.kickMember(roomId, req.user.id, targetUserId);
  }

  // GET /rooms/:roomId/join-requests — 입장 요청 목록 (방장)
  @Get(':roomId/join-requests')
  getJoinRequests(
    @Req() req: AuthRequest,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.roomsService.getJoinRequests(roomId, req.user.id);
  }

  // PATCH /rooms/:roomId/join-requests/:requestId — 수락/거절 (방장)
  @Patch(':roomId/join-requests/:requestId')
  respondJoinRequest(
    @Req() req: AuthRequest,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: RespondJoinRequestDto,
  ) {
    return this.roomsService.respondJoinRequest(roomId, requestId, req.user.id, dto);
  }

  // POST /rooms/:roomId/invite-code/refresh — 초대코드 재발급 (방장)
  @Post(':roomId/invite-code/refresh')
  refreshInviteCode(
    @Req() req: AuthRequest,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.roomsService.refreshInviteCode(roomId, req.user.id);
  }

  // PATCH /rooms/:roomId/transfer-host — 방장 위임
  @Patch(':roomId/transfer-host')
  transferHost(
    @Req() req: AuthRequest,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body('newHostId', ParseUUIDPipe) newHostId: string,
  ) {
    return this.roomsService.transferHost(roomId, req.user.id, newHostId);
  }
}
