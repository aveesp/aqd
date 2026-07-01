import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProfileDocument = HydratedDocument<Profile>;

export enum Gender {
  Male = 'male',
  Female = 'female',
}

export enum VerificationStatus {
  Unverified = 'unverified',
  Pending = 'pending',
  Verified = 'verified',
  Rejected = 'rejected',
}

@Schema({ _id: false })
export class Personal {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ type: Date, required: true })
  dob: Date;

  @Prop({ type: String, enum: Gender, required: true })
  gender: Gender;

  @Prop({ type: Number })
  heightCm?: number;

  @Prop({ trim: true })
  maritalStatus?: string;

  @Prop({ trim: true, maxlength: 2000 })
  bio?: string;
}
const PersonalSchema = SchemaFactory.createForClass(Personal);

@Schema({ _id: false })
export class Family {
  @Prop({ trim: true })
  fatherOccupation?: string;

  @Prop({ trim: true })
  motherOccupation?: string;

  @Prop({ type: Number })
  siblings?: number;

  @Prop({ trim: true })
  familyType?: string;

  @Prop({ trim: true })
  familyValues?: string;
}
const FamilySchema = SchemaFactory.createForClass(Family);

@Schema({ _id: false })
export class Education {
  @Prop({ trim: true })
  level?: string;

  @Prop({ trim: true })
  field?: string;

  @Prop({ trim: true })
  institution?: string;
}
const EducationSchema = SchemaFactory.createForClass(Education);

@Schema({ _id: false })
export class Occupation {
  @Prop({ trim: true })
  title?: string;

  @Prop({ trim: true })
  industry?: string;

  @Prop({ trim: true })
  incomeBand?: string;
}
const OccupationSchema = SchemaFactory.createForClass(Occupation);

@Schema({ _id: false })
export class ReligionInfo {
  @Prop({ trim: true, default: 'Islam' })
  religion: string;

  @Prop({ trim: true })
  sect?: string;

  @Prop({ trim: true })
  maslak?: string;

  @Prop({ trim: true })
  prayerStatus?: string;
}
const ReligionSchema = SchemaFactory.createForClass(ReligionInfo);

@Schema({ _id: false })
export class Lifestyle {
  @Prop({ trim: true })
  diet?: string;

  @Prop({ trim: true })
  smoking?: string;

  @Prop({ type: [String], default: [] })
  languages: string[];
}
const LifestyleSchema = SchemaFactory.createForClass(Lifestyle);

@Schema({ _id: false })
export class GeoPoint {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: string;

  @Prop({ type: [Number], default: undefined })
  coordinates?: [number, number];
}
const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);

@Schema({ _id: false })
export class LocationInfo {
  @Prop({ trim: true })
  country?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  district?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  area?: string;

  @Prop({ trim: true })
  pincode?: string;

  @Prop({ type: GeoPointSchema })
  geo?: GeoPoint;
}
const LocationSchema = SchemaFactory.createForClass(LocationInfo);

@Schema({ _id: false })
export class PartnerPreferences {
  @Prop({ type: Number })
  ageMin?: number;

  @Prop({ type: Number })
  ageMax?: number;

  @Prop({ type: Number })
  heightMin?: number;

  @Prop({ type: Number })
  heightMax?: number;

  @Prop({ trim: true })
  sect?: string;

  @Prop({ trim: true })
  maslak?: string;

  @Prop({ trim: true })
  location?: string;

  @Prop({ trim: true })
  education?: string;

  @Prop({ trim: true })
  income?: string;
}
const PartnerPreferencesSchema =
  SchemaFactory.createForClass(PartnerPreferences);

@Schema({ _id: false })
export class Privacy {
  @Prop({ default: false })
  hidePhotos: boolean;

  @Prop({ default: false })
  hideContact: boolean;

  @Prop({ default: false })
  hideLastActive: boolean;
}
const PrivacySchema = SchemaFactory.createForClass(Privacy);

@Schema({ timestamps: true })
export class Profile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: PersonalSchema, required: true })
  personal: Personal;

  @Prop({ type: FamilySchema, default: {} })
  family: Family;

  @Prop({ type: EducationSchema, default: {} })
  education: Education;

  @Prop({ type: OccupationSchema, default: {} })
  occupation: Occupation;

  @Prop({ type: ReligionSchema, default: {} })
  religion: ReligionInfo;

  @Prop({ type: LifestyleSchema, default: {} })
  lifestyle: Lifestyle;

  @Prop({ type: LocationSchema, default: {} })
  location: LocationInfo;

  @Prop({ type: PartnerPreferencesSchema, default: {} })
  partnerPreferences: PartnerPreferences;

  @Prop({ type: PrivacySchema, default: {} })
  privacy: Privacy;

  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.Unverified,
  })
  verificationStatus: VerificationStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedStaffId: Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  profileCompleteness: number;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
ProfileSchema.index({ 'location.geo': '2dsphere' });
ProfileSchema.index({ 'personal.gender': 1, 'personal.dob': 1 });
ProfileSchema.index({ 'religion.sect': 1, 'religion.maslak': 1 });
ProfileSchema.index({
  'location.country': 1,
  'location.state': 1,
  'location.city': 1,
});
ProfileSchema.index({ verificationStatus: 1 });
ProfileSchema.index({ createdAt: -1 });
