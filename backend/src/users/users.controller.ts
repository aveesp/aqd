import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAccessGuard)
  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    const found = await this.usersService.findById(user.sub);
    return {
      id: found.id,
      email: found.email,
      role: found.role,
      status: found.status,
      emailVerifiedAt: found.emailVerifiedAt,
    };
  }
}
