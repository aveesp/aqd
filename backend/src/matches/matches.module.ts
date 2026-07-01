import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { Interest, InterestSchema } from './schemas/interest.schema';
import { Favorite, FavoriteSchema } from './schemas/favorite.schema';
import { Shortlist, ShortlistSchema } from './schemas/shortlist.schema';
import { Block, BlockSchema } from './schemas/block.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Interest.name, schema: InterestSchema },
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Shortlist.name, schema: ShortlistSchema },
      { name: Block.name, schema: BlockSchema },
    ]),
    UsersModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
