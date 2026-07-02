import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { Role } from '../auth/roles.enum';
import { MatchmakingService } from './matchmaking.service';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { RespondSuggestionDto } from './dto/respond-suggestion.dto';

@UseGuards(JwtAccessGuard)
@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  // --- Client-facing: view and respond to suggestions made for your own profile ---

  @Get('suggestions')
  listMySuggestions(@CurrentUser() user: JwtPayload) {
    return this.matchmakingService.listForClient(user.sub);
  }

  @Patch('suggestions/:id/respond')
  respond(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RespondSuggestionDto,
  ) {
    return this.matchmakingService.respondToSuggestion(
      user.sub,
      id,
      dto.status,
    );
  }

  // --- Staff-facing: manage assigned clients and suggest matches ---

  @UseGuards(RolesGuard)
  @Roles(Role.MatchmakingStaff, Role.Admin, Role.SuperAdmin)
  @Get('my-clients')
  listMyClients(@CurrentUser() user: JwtPayload) {
    return this.matchmakingService.listMyClients(user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.MatchmakingStaff, Role.Admin, Role.SuperAdmin)
  @Post('suggestions')
  createSuggestion(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSuggestionDto,
  ) {
    return this.matchmakingService.createSuggestion(
      user.sub,
      user.role,
      dto.clientProfileId,
      dto.suggestedProfileId,
      dto.note,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.MatchmakingStaff, Role.Admin, Role.SuperAdmin)
  @Get('clients/:clientProfileId/suggestions')
  listClientSuggestions(
    @CurrentUser() user: JwtPayload,
    @Param('clientProfileId') clientProfileId: string,
  ) {
    return this.matchmakingService.listForStaffClient(
      user.sub,
      user.role,
      clientProfileId,
    );
  }
}
