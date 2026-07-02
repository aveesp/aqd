import { PartialType } from '@nestjs/mapped-types';
import { CreateFaqItemDto } from './create-faq-item.dto';

export class UpdateFaqItemDto extends PartialType(CreateFaqItemDto) {}
