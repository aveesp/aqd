export type InterestStatus = 'pending' | 'accepted' | 'declined';

export interface Interest {
  _id: string;
  fromUserId: string;
  toUserId: string;
  status: InterestStatus;
  respondedAt: string | null;
  createdAt: string;
}

export interface FavoriteOrShortlistEntry {
  _id: string;
  userId: string;
  targetUserId: string;
  createdAt: string;
}

export interface BlockEntry {
  _id: string;
  blockerUserId: string;
  blockedUserId: string;
  createdAt: string;
}
