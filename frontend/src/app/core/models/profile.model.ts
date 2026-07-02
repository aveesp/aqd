export interface Personal {
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'male' | 'female';
  heightCm?: number;
  maritalStatus?: string;
  bio?: string;
}

export interface Family {
  fatherOccupation?: string;
  motherOccupation?: string;
  siblings?: number;
  familyType?: string;
  familyValues?: string;
}

export interface Education {
  level?: string;
  field?: string;
  institution?: string;
}

export interface Occupation {
  title?: string;
  industry?: string;
  incomeBand?: string;
}

export interface ReligionInfo {
  religion?: string;
  sect?: string;
  maslak?: string;
  prayerStatus?: string;
}

export interface Lifestyle {
  diet?: string;
  smoking?: string;
  languages?: string[];
}

export interface LocationInfo {
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  area?: string;
  pincode?: string;
}

export interface PartnerPreferences {
  ageMin?: number;
  ageMax?: number;
  heightMin?: number;
  heightMax?: number;
  sect?: string;
  maslak?: string;
  location?: string;
  education?: string;
  income?: string;
}

export interface Privacy {
  hidePhotos: boolean;
  hideContact: boolean;
  hideLastActive: boolean;
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface Profile {
  _id: string;
  userId: string;
  personal: Personal;
  family?: Family;
  education?: Education;
  occupation?: Occupation;
  religion?: ReligionInfo;
  lifestyle?: Lifestyle;
  location?: LocationInfo;
  partnerPreferences?: PartnerPreferences;
  privacy?: Privacy;
  verificationStatus: VerificationStatus;
  profileCompleteness: number;
  createdAt: string;
  updatedAt: string;
}
