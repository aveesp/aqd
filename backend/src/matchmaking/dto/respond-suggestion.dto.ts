import { IsIn } from 'class-validator';
import { SuggestionStatus } from '../schemas/match-suggestion.schema';

const CLIENT_DECISIONS = [
  SuggestionStatus.Viewed,
  SuggestionStatus.Accepted,
  SuggestionStatus.Declined,
] as const;

export class RespondSuggestionDto {
  @IsIn(CLIENT_DECISIONS)
  status: SuggestionStatus;
}
