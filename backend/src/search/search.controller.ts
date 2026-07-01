import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { SearchService } from './search.service';
import { SearchProfilesDto } from './dto/search-profiles.dto';

@UseGuards(JwtAccessGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('profiles')
  searchProfiles(
    @Query() dto: SearchProfilesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.searchService.search(dto, user.sub);
  }
}
