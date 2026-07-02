import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { AnalyticsService } from './analytics.service';

// Revenue/subscription/user-growth data — business-sensitive, so scoped to
// admin/super_admin only, matching the CMS module's access level rather
// than the broader verification-queue staff roles.
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.Admin, Role.SuperAdmin)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary() {
    return this.analyticsService.getSummary();
  }

  @Get('registrations')
  getRegistrations(@Query('days') days = '30') {
    return this.analyticsService.getRegistrationsTimeSeries(Number(days));
  }

  @Get('revenue')
  getRevenue(@Query('days') days = '30') {
    return this.analyticsService.getRevenueTimeSeries(Number(days));
  }
}
