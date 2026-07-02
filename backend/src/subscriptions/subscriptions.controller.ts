import { Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @UseGuards(JwtAccessGuard)
  @Get('me')
  getMine(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.getOrCreateMine(user.sub);
  }

  @UseGuards(JwtAccessGuard)
  @Patch('me/cancel-auto-renew')
  cancelAutoRenew(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.cancelAutoRenew(user.sub);
  }
}
