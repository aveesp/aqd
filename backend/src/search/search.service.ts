import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import {
  Profile,
  ProfileDocument,
  VerificationStatus,
} from '../profiles/schemas/profile.schema';
import { ProfilesService } from '../profiles/profiles.service';
import { SearchProfilesDto } from './dto/search-profiles.dto';

export interface SearchResult {
  results: Record<string, unknown>[];
  page: number;
  limit: number;
  total: number;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
    private readonly profilesService: ProfilesService,
  ) {}

  async search(
    dto: SearchProfilesDto,
    viewerUserId: string,
  ): Promise<SearchResult> {
    const filter: QueryFilter<Profile> = { userId: { $ne: viewerUserId } };

    if (dto.gender) filter['personal.gender'] = dto.gender;
    if (dto.maritalStatus) filter['personal.maritalStatus'] = dto.maritalStatus;
    if (dto.sect) filter['religion.sect'] = dto.sect;
    if (dto.maslak) filter['religion.maslak'] = dto.maslak;
    if (dto.educationLevel) filter['education.level'] = dto.educationLevel;
    if (dto.country) filter['location.country'] = dto.country;
    if (dto.state) filter['location.state'] = dto.state;
    if (dto.city) filter['location.city'] = dto.city;

    if (dto.verifiedOnly) {
      filter.verificationStatus = VerificationStatus.Verified;
    } else if (dto.verificationStatus) {
      filter.verificationStatus = dto.verificationStatus;
    }

    if (dto.heightMin !== undefined || dto.heightMax !== undefined) {
      filter['personal.heightCm'] = {
        ...(dto.heightMin !== undefined && { $gte: dto.heightMin }),
        ...(dto.heightMax !== undefined && { $lte: dto.heightMax }),
      };
    }

    // Age is derived from date of birth: an ageMin/ageMax range maps to a dob
    // range with the bounds inverted (older age => earlier dob).
    if (dto.ageMin !== undefined || dto.ageMax !== undefined) {
      const now = new Date();
      const dobFilter: Record<string, Date> = {};
      if (dto.ageMax !== undefined) {
        dobFilter.$gte = new Date(
          now.getFullYear() - dto.ageMax - 1,
          now.getMonth(),
          now.getDate(),
        );
      }
      if (dto.ageMin !== undefined) {
        dobFilter.$lte = new Date(
          now.getFullYear() - dto.ageMin,
          now.getMonth(),
          now.getDate(),
        );
      }
      filter['personal.dob'] = dobFilter;
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      this.profileModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.profileModel.countDocuments(filter).exec(),
    ]);

    return {
      results: profiles.map((profile) =>
        this.profilesService.redactForOtherUsers(profile),
      ),
      page,
      limit,
      total,
    };
  }
}
