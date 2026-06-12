import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PracticeService } from './practice.service';
import { CreatePracticeDto } from './dto/create-practice.dto';
import { UpdatePracticeDto } from './dto/update-practice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string };
}

@Controller('practice')
@UseGuards(JwtAuthGuard)
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  /** POST /api/practice — 연습 기록 생성 */
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreatePracticeDto) {
    return this.practiceService.create(req.user.id, dto);
  }

  /** GET /api/practice — 목록 (cursor 기반 페이지네이션) */
  @Get()
  findAll(
    @Req() req: AuthRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.practiceService.findAll(
      req.user.id,
      cursor,
      limit ? Number(limit) : 20,
    );
  }

  /** GET /api/practice/streak — 스트릭 조회 */
  @Get('streak')
  getStreak(@Req() req: AuthRequest) {
    return this.practiceService.getStreak(req.user.id);
  }

  /** GET /api/practice/stats/summary — 홈 화면 요약 */
  @Get('stats/summary')
  getSummary(@Req() req: AuthRequest) {
    return this.practiceService.getSummary(req.user.id);
  }

  /** GET /api/practice/stats/report-list?type=weekly&limit=10 — 주간/월간 리포트 목록 */
  @Get('stats/report-list')
  getReportList(
    @Req() req: AuthRequest,
    @Query('type') type: 'weekly' | 'monthly' = 'weekly',
    @Query('limit') limit?: string,
  ) {
    return this.practiceService.getReportList(
      req.user.id,
      type,
      limit ? Number(limit) : 10,
    );
  }

  /** GET /api/practice/stats/weekly?year=2026&week=21 — 주간 리포트 상세 */
  @Get('stats/weekly')
  getWeeklyReport(
    @Req() req: AuthRequest,
    @Query('year') year?: string,
    @Query('week') week?: string,
  ) {
    return this.practiceService.getWeeklyReport(
      req.user.id,
      year ? Number(year) : undefined,
      week ? Number(week) : undefined,
    );
  }

  /** GET /api/practice/stats/monthly-detail?year=2026&month=5 — 월간 리포트 상세 */
  @Get('stats/monthly-detail')
  getMonthlyDetail(
    @Req() req: AuthRequest,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.practiceService.getMonthlyReport(
      req.user.id,
      year  ? Number(year)  : undefined,
      month ? Number(month) : undefined,
    );
  }

  /** GET /api/practice/stats/monthly?year=2026&month=5 — 월별 캘린더 통계 */
  @Get('stats/monthly')
  getMonthlyStats(
    @Req() req: AuthRequest,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const today = new Date();
    return this.practiceService.getMonthlyStats(
      req.user.id,
      year  ? Number(year)  : today.getFullYear(),
      month ? Number(month) : today.getMonth() + 1,
    );
  }

  /** GET /api/practice/:id — 단건 조회 */
  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.practiceService.findOne(req.user.id, id);
  }

  /** PATCH /api/practice/:id — 수정 */
  @Patch(':id')
  update(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePracticeDto,
  ) {
    return this.practiceService.update(req.user.id, id, dto);
  }

  /** DELETE /api/practice/:id — 삭제 */
  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.practiceService.remove(req.user.id, id);
  }
}
