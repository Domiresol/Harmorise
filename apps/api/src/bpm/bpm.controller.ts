import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { BpmService } from './bpm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string };
}

@Controller('bpm')
@UseGuards(JwtAuthGuard)
export class BpmController {
  constructor(private readonly bpmService: BpmService) {}

  /** GET /api/bpm/songs — BPM 기록이 있는 곡 목록 */
  @Get('songs')
  getSongs(@Req() req: AuthRequest) {
    return this.bpmService.getSongs(req.user.id);
  }

  /** GET /api/bpm/songs/:songId — 특정 곡 BPM 성장 이력 */
  @Get('songs/:songId')
  getSongHistory(@Req() req: AuthRequest, @Param('songId', ParseUUIDPipe) songId: string) {
    return this.bpmService.getSongHistory(req.user.id, songId);
  }

  /** PATCH /api/bpm/songs/:songId — 목표 BPM 수정 */
  @Patch('songs/:songId')
  updateTargetBpm(
    @Req() req: AuthRequest,
    @Param('songId', ParseUUIDPipe) songId: string,
    @Body('targetBpm') targetBpm: number,
  ) {
    return this.bpmService.updateTargetBpm(req.user.id, songId, targetBpm);
  }
}
