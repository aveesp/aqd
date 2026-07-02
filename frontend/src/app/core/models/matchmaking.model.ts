import { Profile } from './profile.model';

export type SuggestionStatus = 'suggested' | 'viewed' | 'accepted' | 'declined';

export interface MatchSuggestion {
  _id: string;
  status: SuggestionStatus;
  note?: string;
  createdAt: string;
  suggestedProfile: Profile;
}
