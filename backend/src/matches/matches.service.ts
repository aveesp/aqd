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
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PLAN_FEATURES } from '../subscriptions/plan-catalog';

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
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  // --- Interests ---

  async expressInterest(
    fromUserId: string,
    toUserId: string,
  ): Promise<InterestDocument> {
    this.assertNotSelf(fromUserId, toUserId);
    await this.usersService.findById(toUserId);
    await this.assertNotBlocked(fromUserId, toUserId);
    await this.assertWithinDailyInterestLimit(fromUserId);

    const existing = await this.interestModel
      .findOne({ fromUserId, toUserId })
      .exec();
    if (existing) {
      throw new ConflictException('Interest already sent to this user');
    }
    return this.interestModel.create({ fromUserId, toUserId });
  }

  // Free/Basic/Premium plans cap how many interests can be sent per day
  // (SRS: "free-tier contact/message limits"); VIP is unlimited.
  private async assertWithinDailyInterestLimit(
    fromUserId: string,
  ): Promise<void> {
    const plan = await this.subscriptionsService.getEffectivePlan(fromUserId);
    const limit = PLAN_FEATURES[plan].dailyInterestLimit;
    if (limit === null) {
      return;
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sentToday = await this.interestModel
      .countDocuments({ fromUserId, createdAt: { $gte: startOfToday } })
      .exec();
    if (sentToday >= limit) {
      throw new ForbiddenException(
        `Daily interest limit reached for your ${plan} plan (${limit}/day). Upgrade your subscription to send more.`,
      );
    }
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

  async areBlocked(userIdA: string, userIdB: string): Promise<boolean> {
    const block = await this.blockModel
      .findOne({
        $or: [
          { blockerUserId: userIdA, blockedUserId: userIdB },
          { blockerUserId: userIdB, blockedUserId: userIdA },
        ],
      })
      .exec();
    return !!block;
  }

  async hasAcceptedInterest(
    userIdA: string,
    userIdB: string,
  ): Promise<boolean> {
    const interest = await this.interestModel
      .findOne({
        status: InterestStatus.Accepted,
        $or: [
          { fromUserId: userIdA, toUserId: userIdB },
          { fromUserId: userIdB, toUserId: userIdA },
        ],
      })
      .exec();
    return !!interest;
  }

  private async assertNotBlocked(
    userId: string,
    targetUserId: string,
  ): Promise<void> {
    if (await this.areBlocked(userId, targetUserId)) {
      throw new ForbiddenException(
        'This action is not available between these users',
      );
    }
  }
}
