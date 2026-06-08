import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard }   from '../common/guards/admin.guard';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /api/admin/stats/overview — 핵심 지표 */
  @Get('stats/overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  /** GET /api/admin/stats/activity — 요일별 세션 + 악기 분포 */
  @Get('stats/activity')
  getActivity() {
    return this.adminService.getActivity();
  }

  /** GET /api/admin/users?cursor=&limit=&search= — 유저 목록 */
  @Get('users')
  getUsers(
    @Query('cursor') cursor?: string,
    @Query('limit')  limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(cursor, limit ? Number(limit) : 20, search);
  }

  /** PATCH /api/admin/users/:id/status — 유저 활성/정지 */
  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto.isActive);
  }
}
