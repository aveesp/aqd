import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Interest,
  InterestDocument,
  InterestStatus,
} from './schemas/interest.schema';
import { Favorite, FavoriteDocument } from './schemas/favorite.schema';
import { Shortlist, ShortlistDocument } from './schemas/shortlist.schema';
import { Block, BlockDocument } from './schemas/block.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Interest.name)
    private readonly interestModel: Model<InterestDocument>,
    @InjectModel(Favorite.name)
    private readonly favoriteModel: Model<FavoriteDocument>,
    @InjectModel(Shortlist.name)
    private readonly shortlistModel: Model<ShortlistDocument>,
    @InjectModel(Block.name) private readonly blockModel: Model<BlockDocument>,
    private readonly usersService: UsersService,
  ) {}

  // --- Interests ---

  async expressInterest(
    fromUserId: string,
    toUserId: string,
  ): Promise<InterestDocument> {
    this.assertNotSelf(fromUserId, toUserId);
    await this.usersService.findById(toUserId);
    await this.assertNotBlocked(fromUserId, toUserId);

    const existing = await this.interestModel
      .findOne({ fromUserId, toUserId })
      .exec();
    if (existing) {
      throw new ConflictException('Interest already sent to this user');
    }
    return this.interestModel.create({ fromUserId, toUserId });
  }

  async respondToInterest(
    interestId: string,
    respondingUserId: string,
    accept: boolean,
  ): Promise<InterestDocument> {
    const interest = await this.interestModel.findById(interestId).exec();
    if (!interest) {
      throw new NotFoundException('Interest not found');
    }
    if (interest.toUserId.toString() !== respondingUserId) {
      throw new ForbiddenException(
        'Only the recipient can respond to this interest',
      );
    }
    if (interest.status !== InterestStatus.Pending) {
      throw new ConflictException(
        'This interest has already been responded to',
      );
    }
    interest.status = accept
      ? InterestStatus.Accepted
      : InterestStatus.Declined;
    interest.respondedAt = new Date();
    await interest.save();
    return interest;
  }

  async listSentInterests(userId: string): Promise<InterestDocument[]> {
    return this.interestModel
      .find({ fromUserId: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async listReceivedInterests(userId: string): Promise<InterestDocument[]> {
    return this.interestModel
      .find({ toUserId: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  // --- Favorites ---

  async addFavorite(
    userId: string,
    targetUserId: string,
  ): Promise<FavoriteDocument> {
    this.assertNotSelf(userId, targetUserId);
    await this.usersService.findById(targetUserId);
    const existing = await this.favoriteModel
      .findOne({ userId, targetUserId })
      .exec();
    if (existing) {
      return existing;
    }
    return this.favoriteModel.create({ userId, targetUserId });
  }

  async removeFavorite(userId: string, targetUserId: string): Promise<void> {
    await this.favoriteModel.deleteOne({ userId, targetUserId }).exec();
  }

  async listFavorites(userId: string): Promise<FavoriteDocument[]> {
    return this.favoriteModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  // --- Shortlist ---

  async addToShortlist(
    userId: string,
    targetUserId: string,
  ): Promise<ShortlistDocument> {
    this.assertNotSelf(userId, targetUserId);
    await this.usersService.findById(targetUserId);
    const existing = await this.shortlistModel
      .findOne({ userId, targetUserId })
      .exec();
    if (existing) {
      return existing;
    }
    return this.shortlistModel.create({ userId, targetUserId });
  }

  async removeFromShortlist(
    userId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.shortlistModel.deleteOne({ userId, targetUserId }).exec();
  }

  async listShortlist(userId: string): Promise<ShortlistDocument[]> {
    return this.shortlistModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  // --- Blocks ---

  async blockUser(
    blockerUserId: string,
    blockedUserId: string,
  ): Promise<BlockDocument> {
    this.assertNotSelf(blockerUserId, blockedUserId);
    await this.usersService.findById(blockedUserId);
    const existing = await this.blockModel
      .findOne({ blockerUserId, blockedUserId })
      .exec();
    if (existing) {
      return existing;
    }
    return this.blockModel.create({ blockerUserId, blockedUserId });
  }

  async unblockUser(
    blockerUserId: string,
    blockedUserId: string,
  ): Promise<void> {
    await this.blockModel.deleteOne({ blockerUserId, blockedUserId }).exec();
  }

  async listBlocked(userId: string): Promise<BlockDocument[]> {
    return this.blockModel
      .find({ blockerUserId: userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  private assertNotSelf(userId: string, targetUserId: string): void {
    if (userId === targetUserId) {
      throw new BadRequestException(
        'You cannot perform this action on your own profile',
      );
    }
  }

  private async assertNotBlocked(
    userId: string,
    targetUserId: string,
  ): Promise<void> {
    const block = await this.blockModel
      .findOne({
        $or: [
          { blockerUserId: userId, blockedUserId: targetUserId },
          { blockerUserId: targetUserId, blockedUserId: userId },
        ],
      })
      .exec();
    if (block) {
      throw new ForbiddenException(
        'This action is not available between these users',
      );
    }
  }
}
