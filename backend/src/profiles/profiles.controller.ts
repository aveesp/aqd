import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';

@UseGuards(JwtAccessGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post('me')
  createOwn(@CurrentUser() user: JwtPayload, @Body() dto: CreateProfileDto) {
    return this.profilesService.create(user.sub, dto);
  }

  @Get('me')
  getOwn(@CurrentUser() user: JwtPayload) {
    return this.profilesService.findByUserId(user.sub);
  }

  @Patch('me')
  updateOwn(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.profilesService.updateOwn(user.sub, dto);
  }

  @Patch('me/privacy')
  updatePrivacy(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePrivacyDto,
  ) {
    return this.profilesService.updatePrivacy(user.sub, dto);
  }

  // Must come before the :id route below, otherwise "by-users" would be
  // matched as a profile ID.
  @Get('by-users')
  getByUserIds(@Query('ids') ids: string, @CurrentUser() user: JwtPayload) {
    const userIds = (ids ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.profilesService.findByUserIdsForViewer(userIds, {
      userId: user.sub,
      role: user.role,
    });
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.profilesService.findByIdForViewer(id, {
      userId: user.sub,
      role: user.role,
    });
  }
}
