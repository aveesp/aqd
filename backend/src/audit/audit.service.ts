import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

export interface AuditEntry {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.auditLogModel.create({
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      before: entry.before ?? null,
      after: entry.after ?? null,
    });
  }

  async listForTarget(
    targetType: string,
    targetId: string,
  ): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ targetType, targetId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async list(
    page = 1,
    limit = 50,
  ): Promise<{
    logs: AuditLogDocument[];
    page: number;
    limit: number;
    total: number;
  }> {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.auditLogModel.countDocuments().exec(),
    ]);
    return { logs, page, limit, total };
  }
}
