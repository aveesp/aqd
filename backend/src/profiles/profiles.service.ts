import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DocumentType,
  Photo,
  Profile,
  ProfileDocument,
  VerificationDocument,
  VerificationStatus,
} from './schemas/profile.schema';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { Role, ADMIN_PANEL_ROLES } from '../auth/roles.enum';
import { StorageService } from '../storage/storage.service';
import { MAX_PHOTOS } from './upload.constants';

export interface ProfileViewer {
  userId: string;
  role: Role;
}

const COMPLETENESS_SECTIONS: (keyof Profile)[] = [
  'personal',
  'family',
  'education',
  'occupation',
  'religion',
  'lifestyle',
  'location',
  'partnerPreferences',
];

// class-transformer instantiates DTO classes with every declared field as an
// own property, so unset optional fields exist as `undefined` rather than
// being absent. Spreading such an object over existing data would clobber
// values the caller didn't intend to touch, so strip undefined keys first.
function withoutUndefined(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

@Injectable()
export class ProfilesService {
  constructor(
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
    private readonly storageService: StorageService,
  ) {}

  async create(
    userId: string,
    dto: CreateProfileDto,
  ): Promise<ProfileDocument> {
    const existing = await this.profileModel.findOne({ userId }).exec();
    if (existing) {
      throw new ConflictException('Profile already exists for this account');
    }
    const profile = new this.profileModel({
      userId,
      ...dto,
      personal: { ...dto.personal, dob: new Date(dto.personal.dob) },
    });
    profile.profileCompleteness = this.computeCompleteness(profile);
    await profile.save();
    return profile;
  }

  async findByUserId(userId: string): Promise<ProfileDocument> {
    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  async findById(id: string): Promise<ProfileDocument> {
    const profile = await this.profileModel.findById(id).exec();
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  async findByIdForViewer(
    id: string,
    viewer: ProfileViewer,
  ): Promise<Record<string, unknown>> {
    const profile = await this.findById(id);
    const isOwner = profile.userId.toString() === viewer.userId;
    const isStaff = ADMIN_PANEL_ROLES.includes(viewer.role);
    if (isOwner || isStaff) {
      return profile.toObject() as unknown as Record<string, unknown>;
    }
    return this.redactForOtherUsers(profile);
  }

  // Batch lookup so match/favorite/shortlist/interest lists (which only
  // store userId references) can resolve display names in one request
  // instead of one round-trip per entry. Same visibility rules as
  // findByIdForViewer, applied per-profile.
  async findByUserIdsForViewer(
    userIds: string[],
    viewer: ProfileViewer,
  ): Promise<Record<string, unknown>[]> {
    const uniqueIds = [...new Set(userIds)];
    const profiles = await this.profileModel
      .find({ userId: { $in: uniqueIds } })
      .exec();
    const isStaff = ADMIN_PANEL_ROLES.includes(viewer.role);
    return profiles.map((profile) => {
      const isOwner = profile.userId.toString() === viewer.userId;
      return isOwner || isStaff
        ? (profile.toObject() as unknown as Record<string, unknown>)
        : this.redactForOtherUsers(profile);
    });
  }

  // Owner and admin-panel staff see the full document; every other viewer
  // gets internal fields stripped and privacy toggles enforced. `hideContact`
  // doesn't have a dedicated field to redact yet (no contact info modeled on
  // Profile yet). `verificationDocuments` are identity documents — never
  // shown to anyone but the owner/staff, no toggle needed. Public so other
  // modules (e.g. search) can apply the same redaction to list results.
  redactForOtherUsers(profile: ProfileDocument): Record<string, unknown> {
    const plain = profile.toObject();
    const { assignedStaffId, privacy, verificationDocuments, ...rest } = plain;
    void assignedStaffId;
    void verificationDocuments;
    const location = rest.location as Record<string, unknown> | undefined;
    if (location?.geo) {
      const { geo, ...locationRest } = location;
      void geo;
      rest.location = locationRest;
    }
    if (privacy?.hidePhotos) {
      rest.photos = [];
    }
    return rest;
  }

  async updateOwn(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileDocument> {
    const profile = await this.findByUserId(userId);
    // Each top-level field is a nested subdocument; merge shallowly per-section
    // so a partial update (e.g. { education: { level } }) doesn't wipe sibling
    // fields already stored in that section (e.g. education.field).
    for (const section of COMPLETENESS_SECTIONS) {
      const incoming = dto[section as keyof UpdateProfileDto] as
        Record<string, unknown> | undefined;
      if (incoming === undefined) continue;
      const current = profile[section] as {
        toObject?: () => Record<string, unknown>;
      };
      const existing: Record<string, unknown> =
        current?.toObject?.() ?? current ?? {};
      const merged: Record<string, unknown> = {
        ...existing,
        ...withoutUndefined(incoming),
      };
      if (section === 'personal' && typeof incoming.dob === 'string') {
        merged.dob = new Date(incoming.dob);
      }
      profile.set(section as string, merged);
    }
    profile.profileCompleteness = this.computeCompleteness(profile);
    await profile.save();
    return profile;
  }

  async updatePrivacy(
    userId: string,
    dto: UpdatePrivacyDto,
  ): Promise<ProfileDocument> {
    const profile = await this.findByUserId(userId);
    const existing = profile.privacy as unknown as {
      toObject: () => Record<string, unknown>;
    };
    profile.set('privacy', {
      ...existing.toObject(),
      ...withoutUndefined(dto as unknown as Record<string, unknown>),
    });
    await profile.save();
    return profile;
  }

  async listByVerificationStatus(
    status: VerificationStatus,
    page = 1,
    limit = 20,
  ): Promise<{
    profiles: ProfileDocument[];
    page: number;
    limit: number;
    total: number;
  }> {
    const filter = { verificationStatus: status };
    const skip = (page - 1) * limit;
    const [profiles, total] = await Promise.all([
      this.profileModel
        .find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.profileModel.countDocuments(filter).exec(),
    ]);
    return { profiles, page, limit, total };
  }

  async setVerificationStatus(
    id: string,
    status: VerificationStatus,
  ): Promise<ProfileDocument> {
    const profile = await this.findById(id);
    profile.verificationStatus = status;
    await profile.save();
    return profile;
  }

  async assignStaff(
    id: string,
    staffUserId: string | null,
  ): Promise<ProfileDocument> {
    const profile = await this.findById(id);
    profile.assignedStaffId =
      staffUserId as unknown as ProfileDocument['assignedStaffId'];
    await profile.save();
    return profile;
  }

  async listByAssignedStaff(staffUserId: string): Promise<ProfileDocument[]> {
    return this.profileModel.find({ assignedStaffId: staffUserId }).exec();
  }

  // --- Photos ---

  async addPhotos(
    userId: string,
    files: Express.Multer.File[],
  ): Promise<ProfileDocument> {
    const profile = await this.findByUserId(userId);
    const remainingSlots = MAX_PHOTOS - profile.photos.length;
    if (remainingSlots <= 0) {
      throw new BadRequestException(`Maximum ${MAX_PHOTOS} photos allowed`);
    }
    const toUpload = files.slice(0, remainingSlots);
    const saved = await Promise.all(
      toUpload.map((file) =>
        this.storageService.saveFile('photos', file.buffer, file.originalname),
      ),
    );
    const hasPrimary = profile.photos.some((p) => p.isPrimary);
    saved.forEach((s, i) => {
      profile.photos.push({
        url: s.url,
        filename: s.filename,
        isPrimary: !hasPrimary && i === 0,
        uploadedAt: new Date(),
      });
    });
    await profile.save();
    return profile;
  }

  async deletePhoto(userId: string, photoId: string): Promise<ProfileDocument> {
    const profile = await this.findByUserId(userId);
    const photos = profile.photos as unknown as (Photo & {
      _id: { toString(): string };
    })[];
    const idx = photos.findIndex((p) => p._id.toString() === photoId);
    if (idx === -1) {
      throw new NotFoundException('Photo not found');
    }
    const [removed] = photos.splice(idx, 1);
    await this.storageService.deleteFile('photos', removed.filename);
    if (removed.isPrimary && photos.length > 0) {
      photos[0].isPrimary = true;
    }
    profile.markModified('photos');
    await profile.save();
    return profile;
  }

  async setPrimaryPhoto(
    userId: string,
    photoId: string,
  ): Promise<ProfileDocument> {
    const profile = await this.findByUserId(userId);
    const photos = profile.photos as unknown as (Photo & {
      _id: { toString(): string };
    })[];
    let found = false;
    for (const photo of photos) {
      const match = photo._id.toString() === photoId;
      photo.isPrimary = match;
      if (match) found = true;
    }
    if (!found) {
      throw new NotFoundException('Photo not found');
    }
    profile.markModified('photos');
    await profile.save();
    return profile;
  }

  // --- Verification documents ---

  async addDocument(
    userId: string,
    file: Express.Multer.File,
    docType: DocumentType,
  ): Promise<ProfileDocument> {
    const profile = await this.findByUserId(userId);
    const saved = await this.storageService.saveFile(
      'documents',
      file.buffer,
      file.originalname,
    );
    profile.verificationDocuments.push({
      filename: saved.filename,
      docType,
      uploadedAt: new Date(),
    });
    // Submitting a new document (re-)starts the review process.
    profile.verificationStatus = VerificationStatus.Pending;
    await profile.save();
    return profile;
  }

  async getOwnDocumentFilePath(userId: string, docId: string): Promise<string> {
    const profile = await this.findByUserId(userId);
    return this.resolveDocumentPath(profile, docId);
  }

  async getDocumentFilePathForStaff(
    profileId: string,
    docId: string,
  ): Promise<string> {
    const profile = await this.findById(profileId);
    return this.resolveDocumentPath(profile, docId);
  }

  private resolveDocumentPath(profile: ProfileDocument, docId: string): string {
    const docs =
      profile.verificationDocuments as unknown as (VerificationDocument & {
        _id: { toString(): string };
      })[];
    const doc = docs.find((d) => d._id.toString() === docId);
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    return this.storageService.getFilePath('documents', doc.filename);
  }

  private computeCompleteness(profile: Profile): number {
    const filledSections = COMPLETENESS_SECTIONS.filter((section) => {
      const value = profile[section] as Record<string, unknown> | undefined;
      if (!value) return false;
      return Object.values(value).some(
        (v) => v !== undefined && v !== null && v !== '',
      );
    });
    return Math.round(
      (filledSections.length / COMPLETENESS_SECTIONS.length) * 100,
    );
  }
}
