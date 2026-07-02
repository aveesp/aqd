import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { VerificationDecisionDto } from './dto/verification-decision.dto';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { Role } from '../auth/roles.enum';
import { UserStatus } from '../users/schemas/user.schema';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.email, dto.password);
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.SuperAdmin)
  @Post('staff')
  createStaff(@CurrentUser() actor: JwtPayload, @Body() dto: CreateStaffDto) {
    return this.adminService.createStaff(
      actor.sub,
      dto.email,
      dto.password,
      dto.role,
    );
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.SupportStaff, Role.MatchmakingStaff, Role.Admin, Role.SuperAdmin)
  @Get('users')
  listUsers(
    @Query('role') role?: Role,
    @Query('status') status?: UserStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.listUsers(
      role,
      status,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.Admin, Role.SuperAdmin)
  @Patch('users/:userId/status')
  setUserStatus(
    @CurrentUser() actor: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.setUserStatus(actor.sub, userId, dto.status);
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.SupportStaff, Role.MatchmakingStaff, Role.Admin, Role.SuperAdmin)
  @Get('profiles/verification-queue')
  listVerificationQueue(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.listVerificationQueue(Number(page), Number(limit));
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.SupportStaff, Role.MatchmakingStaff, Role.Admin, Role.SuperAdmin)
  @Patch('profiles/:profileId/verification')
  decideVerification(
    @CurrentUser() actor: JwtPayload,
    @Param('profileId') profileId: string,
    @Body() dto: VerificationDecisionDto,
  ) {
    return this.adminService.decideVerification(
      actor.sub,
      profileId,
      dto.decision,
    );
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.Admin, Role.SuperAdmin)
  @Patch('profiles/:profileId/assign/:staffUserId')
  assignStaffToProfile(
    @CurrentUser() actor: JwtPayload,
    @Param('profileId') profileId: string,
    @Param('staffUserId') staffUserId: string,
  ) {
    return this.adminService.assignStaffToProfile(
      actor.sub,
      profileId,
      staffUserId,
    );
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.Admin, Role.SuperAdmin)
  @Patch('subscriptions/:userId/activate')
  activateSubscriptionManually(
    @CurrentUser() actor: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: ActivateSubscriptionDto,
  ) {
    return this.adminService.activateSubscriptionManually(
      actor.sub,
      userId,
      dto.plan,
      dto.billingCycle,
    );
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.Admin, Role.SuperAdmin)
  @Get('audit-logs')
  listAuditLogs(@Query('page') page = '1', @Query('limit') limit = '50') {
    return this.auditService.list(Number(page), Number(limit));
  }
}
