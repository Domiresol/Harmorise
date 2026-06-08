import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SongsService } from './songs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string };
}

@Controller('songs')
@UseGuards(JwtAuthGuard)
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  /**
   * GET /api/songs?q=검색어
   * q 없으면 최근 수정 20개 반환.
   * 연습 기록 작성 화면에서 곡 선택 드롭다운용.
   */
  @Get()
  findAll(
    @Req() req: AuthRequest,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? Number(limit) : 20;
    return q && q.trim().length > 0
      ? this.songsService.search(req.user.id, q.trim(), lim)
      : this.songsService.findAll(req.user.id, lim);
  }

  /**
   * GET /api/songs/:id — 단건 조회
   */
  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.songsService.findOne(req.user.id, id);
  }

  /**
   * GET /api/songs/:id/sessions — 곡별 연습 기록 + 통계
   * 곡 상세 화면 "연습 추이" 탭에서 사용
   */
  @Get(':id/sessions')
  getSessionsBySong(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.songsService.getSessionsBySong(req.user.id, id);
  }
}
