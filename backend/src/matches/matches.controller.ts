import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { MatchesService } from './matches.service';

@UseGuards(JwtAccessGuard)
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post('interests/:targetUserId')
  expressInterest(
    @CurrentUser() user: JwtPayload,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.matchesService.expressInterest(user.sub, targetUserId);
  }

  @Patch('interests/:interestId/accept')
  acceptInterest(
    @CurrentUser() user: JwtPayload,
    @Param('interestId') interestId: string,
  ) {
    return this.matchesService.respondToInterest(interestId, user.sub, true);
  }

  @Patch('interests/:interestId/decline')
  declineInterest(
    @CurrentUser() user: JwtPayload,
    @Param('interestId') interestId: string,
  ) {
    return this.matchesService.respondToInterest(interestId, user.sub, false);
  }

  @Get('interests/sent')
  listSentInterests(@CurrentUser() user: JwtPayload) {
    return this.matchesService.listSentInterests(user.sub);
  }

  @Get('interests/received')
  listReceivedInterests(@CurrentUser() user: JwtPayload) {
    return this.matchesService.listReceivedInterests(user.sub);
  }

  @Post('favorites/:targetUserId')
  addFavorite(
    @CurrentUser() user: JwtPayload,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.matchesService.addFavorite(user.sub, targetUserId);
  }

  @Delete('favorites/:targetUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFavorite(
    @CurrentUser() user: JwtPayload,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.matchesService.removeFavorite(user.sub, targetUserId);
  }

  @Get('favorites')
  listFavorites(@CurrentUser() user: JwtPayload) {
    return this.matchesService.listFavorites(user.sub);
  }

  @Post('shortlist/:targetUserId')
  addToShortlist(
    @CurrentUser() user: JwtPayload,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.matchesService.addToShortlist(user.sub, targetUserId);
  }

  @Delete('shortlist/:targetUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFromShortlist(
    @CurrentUser() user: JwtPayload,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.matchesService.removeFromShortlist(user.sub, targetUserId);
  }

  @Get('shortlist')
  listShortlist(@CurrentUser() user: JwtPayload) {
    return this.matchesService.listShortlist(user.sub);
  }

  @Post('block/:targetUserId')
  blockUser(
    @CurrentUser() user: JwtPayload,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.matchesService.blockUser(user.sub, targetUserId);
  }

  @Delete('block/:targetUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unblockUser(
    @CurrentUser() user: JwtPayload,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.matchesService.unblockUser(user.sub, targetUserId);
  }

  @Get('blocked')
  listBlocked(@CurrentUser() user: JwtPayload) {
    return this.matchesService.listBlocked(user.sub);
  }
}
