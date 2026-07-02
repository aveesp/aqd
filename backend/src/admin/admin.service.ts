import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ProfilesService } from '../profiles/profiles.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UserStatus } from '../users/schemas/user.schema';
import { VerificationStatus } from '../profiles/schemas/profile.schema';
import { Role } from '../auth/roles.enum';
import { BillingCycle, Plan } from '../subscriptions/plan-catalog';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly profilesService: ProfilesService,
    private readonly auditService: AuditService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async createStaff(
    actorId: string,
    email: string,
    password: string,
    role: Role,
  ) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({ email, passwordHash, role });
    // Staff accounts are provisioned directly active — they don't go through
    // the email-verification flow regular users do.
    await this.usersService.setStatus(user.id, UserStatus.Active);
    await this.auditService.log({
      actorId,
      action: 'staff.create',
      targetType: 'user',
      targetId: user.id,
      after: { email: user.email, role: user.role },
    });
    return { id: user.id, email: user.email, role: user.role };
  }

  async listUsers(
    role: Role | undefined,
    status: UserStatus | undefined,
    page: number,
    limit: number,
  ) {
    const filter: { role?: Role; status?: UserStatus } = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    const { users, ...meta } = await this.usersService.list(
      filter,
      page,
      limit,
    );
    return {
      ...meta,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      })),
    };
  }

  async setUserStatus(actorId: string, userId: string, status: UserStatus) {
    const before = await this.usersService.findById(userId);
    const beforeStatus = before.status;
    const updated = await this.usersService.setStatus(userId, status);
    await this.auditService.log({
      actorId,
      action: 'user.status',
      targetType: 'user',
      targetId: userId,
      before: { status: beforeStatus },
      after: { status: updated.status },
    });
    return { id: updated.id, email: updated.email, status: updated.status };
  }

  async listVerificationQueue(page: number, limit: number) {
    const { profiles, ...meta } =
      await this.profilesService.listByVerificationStatus(
        VerificationStatus.Pending,
        page,
        limit,
      );
    return { ...meta, profiles: profiles.map((p) => p.toObject()) };
  }

  async decideVerification(
    actorId: string,
    profileId: string,
    decision: VerificationStatus,
  ) {
    const before = await this.profilesService.findById(profileId);
    const beforeStatus = before.verificationStatus;
    const updated = await this.profilesService.setVerificationStatus(
      profileId,
      decision,
    );
    await this.auditService.log({
      actorId,
      action: 'profile.verification',
      targetType: 'profile',
      targetId: profileId,
      before: { verificationStatus: beforeStatus },
      after: { verificationStatus: updated.verificationStatus },
    });
    return updated.toObject();
  }

  // Manual activation covers offline/bank-transfer payments — a common
  // real-world fallback for a marriage-bureau business, alongside the
  // Razorpay online checkout flow.
  async activateSubscriptionManually(
    actorId: string,
    userId: string,
    plan: Plan,
    billingCycle: BillingCycle,
  ) {
    await this.usersService.findById(userId);
    const updated = await this.subscriptionsService.activate(
      userId,
      plan,
      billingCycle,
    );
    await this.auditService.log({
      actorId,
      action: 'subscription.activateManual',
      targetType: 'user',
      targetId: userId,
      after: { plan: updated.plan, billingCycle: updated.billingCycle },
    });
    return updated.toObject();
  }

  async getVerificationDocumentFilePath(
    profileId: string,
    docId: string,
  ): Promise<string> {
    return this.profilesService.getDocumentFilePathForStaff(profileId, docId);
  }

  async assignStaffToProfile(
    actorId: string,
    profileId: string,
    staffUserId: string,
  ) {
    const staff = await this.usersService.findById(staffUserId);
    const before = await this.profilesService.findById(profileId);
    const updated = await this.profilesService.assignStaff(profileId, staff.id);
    await this.auditService.log({
      actorId,
      action: 'profile.assignStaff',
      targetType: 'profile',
      targetId: profileId,
      before: { assignedStaffId: before.assignedStaffId },
      after: { assignedStaffId: staff.id },
    });
    return updated.toObject();
  }
}
