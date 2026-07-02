import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import {
  MatchSuggestion,
  MatchSuggestionSchema,
} from './schemas/match-suggestion.schema';
import { ProfilesModule } from '../profiles/profiles.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MatchSuggestion.name, schema: MatchSuggestionSchema },
    ]),
    ProfilesModule,
    AuditModule,
  ],
  controllers: [MatchmakingController],
  providers: [MatchmakingService],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
