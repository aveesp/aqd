import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MatchSuggestionDocument = HydratedDocument<MatchSuggestion>;

export enum SuggestionStatus {
  Suggested = 'suggested',
  Viewed = 'viewed',
  Accepted = 'accepted',
  Declined = 'declined',
}

@Schema({ timestamps: true })
export class MatchSuggestion {
  @Prop({ type: Types.ObjectId, ref: 'Profile', required: true })
  clientProfileId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Profile', required: true })
  suggestedProfileId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedStaffId: Types.ObjectId;

  @Prop({ trim: true, maxlength: 1000 })
  note?: string;

  @Prop({
    type: String,
    enum: SuggestionStatus,
    default: SuggestionStatus.Suggested,
  })
  status: SuggestionStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MatchSuggestionSchema =
  SchemaFactory.createForClass(MatchSuggestion);
MatchSuggestionSchema.index({ clientProfileId: 1, status: 1 });
MatchSuggestionSchema.index(
  { clientProfileId: 1, suggestedProfileId: 1 },
  { unique: true },
);
MatchSuggestionSchema.index({ assignedStaffId: 1 });
