import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UsersService }      from './users.service';
import { UpdateProfileDto }  from './dto/update-profile.dto';
import { JwtAuthGuard }      from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /api/users/me */
  @Get('me')
  getMe(@Req() req: AuthRequest) {
    return this.usersService.getMe(req.user.id);
  }

  /** PATCH /api/users/me */
  @Patch('me')
  updateMe(@Req() req: AuthRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(req.user.id, dto);
  }
}
