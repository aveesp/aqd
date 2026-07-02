import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { Profile, ProfileSchema } from './schemas/profile.schema';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }]),
    StorageModule,
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
