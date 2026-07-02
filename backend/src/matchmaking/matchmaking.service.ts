import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MatchSuggestion,
  MatchSuggestionDocument,
  SuggestionStatus,
} from './schemas/match-suggestion.schema';
import { ProfilesService } from '../profiles/profiles.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '../auth/roles.enum';

@Injectable()
export class MatchmakingService {
  constructor(
    @InjectModel(MatchSuggestion.name)
    private readonly suggestionModel: Model<MatchSuggestionDocument>,
    private readonly profilesService: ProfilesService,
    private readonly auditService: AuditService,
  ) {}

  async listMyClients(staffId: string): Promise<Record<string, unknown>[]> {
    const profiles = await this.profilesService.listByAssignedStaff(staffId);
    return profiles.map(
      (p) => p.toObject() as unknown as Record<string, unknown>,
    );
  }

  async createSuggestion(
    actorId: string,
    actorRole: Role,
    clientProfileId: string,
    suggestedProfileId: string,
    note: string | undefined,
  ): Promise<MatchSuggestionDocument> {
    if (clientProfileId === suggestedProfileId) {
      throw new ForbiddenException('Cannot suggest a client to themselves');
    }
    const clientProfile = await this.profilesService.findById(clientProfileId);
    await this.assertCanManageClient(actorId, actorRole, clientProfile.id);
    // Confirms the target profile actually exists — throws NotFoundException otherwise.
    await this.profilesService.findById(suggestedProfileId);

    const existing = await this.suggestionModel
      .findOne({ clientProfileId, suggestedProfileId })
      .exec();
    if (existing) {
      throw new ConflictException(
        'This profile has already been suggested to this client',
      );
    }

    const suggestion = await this.suggestionModel.create({
      clientProfileId,
      suggestedProfileId,
      assignedStaffId: actorId,
      note,
    });
    await this.auditService.log({
      actorId,
      action: 'matchmaking.suggest',
      targetType: 'match_suggestion',
      targetId: suggestion.id,
      after: { clientProfileId, suggestedProfileId },
    });
    return suggestion;
  }

  async listForStaffClient(
    actorId: string,
    actorRole: Role,
    clientProfileId: string,
  ): Promise<Record<string, unknown>[]> {
    await this.assertCanManageClient(actorId, actorRole, clientProfileId);
    const suggestions = await this.suggestionModel
      .find({ clientProfileId })
      .sort({ createdAt: -1 })
      .exec();
    return Promise.all(
      suggestions.map(async (s) => {
        const suggestedProfile = await this.profilesService.findById(
          s.suggestedProfileId.toString(),
        );
        return {
          _id: s.id,
          status: s.status,
          note: s.note,
          createdAt: s.createdAt,
          suggestedProfile: suggestedProfile.toObject(),
        };
      }),
    );
  }

  async listForClient(
    clientUserId: string,
  ): Promise<Record<string, unknown>[]> {
    const clientProfile = await this.profilesService.findByUserId(clientUserId);
    const suggestions = await this.suggestionModel
      .find({ clientProfileId: clientProfile.id })
      .sort({ createdAt: -1 })
      .exec();
    return Promise.all(
      suggestions.map(async (s) => {
        const suggestedProfile = await this.profilesService.findById(
          s.suggestedProfileId.toString(),
        );
        return {
          _id: s.id,
          status: s.status,
          note: s.note,
          createdAt: s.createdAt,
          suggestedProfile:
            this.profilesService.redactForOtherUsers(suggestedProfile),
        };
      }),
    );
  }

  async respondToSuggestion(
    clientUserId: string,
    suggestionId: string,
    status: SuggestionStatus,
  ): Promise<MatchSuggestionDocument> {
    const clientProfile = await this.profilesService.findByUserId(clientUserId);
    const suggestion = await this.suggestionModel.findById(suggestionId).exec();
    if (
      !suggestion ||
      suggestion.clientProfileId.toString() !== clientProfile.id
    ) {
      throw new ForbiddenException(
        'This suggestion does not belong to your profile',
      );
    }
    suggestion.status = status;
    await suggestion.save();
    return suggestion;
  }

  // admin/super_admin can manage any client; matchmaking_staff only their
  // own assigned clients.
  private async assertCanManageClient(
    actorId: string,
    actorRole: Role,
    clientProfileId: string,
  ): Promise<void> {
    if (actorRole === Role.Admin || actorRole === Role.SuperAdmin) {
      return;
    }
    const clientProfile = await this.profilesService.findById(clientProfileId);
    if (clientProfile.assignedStaffId?.toString() !== actorId) {
      throw new ForbiddenException(
        'You are not the assigned matchmaking staff for this client',
      );
    }
  }
}
