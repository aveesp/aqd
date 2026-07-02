import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { SendMessageDto } from './dto/send-message.dto';
import { SendAttachmentDto } from './dto/send-attachment.dto';
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  attachmentFileFilter,
} from './upload.constants';

@UseGuards(JwtAccessGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('messages/:targetUserId')
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('targetUserId') targetUserId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.sub, targetUserId, dto.content);
  }

  @Post('messages/:targetUserId/attachment')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
      fileFilter: attachmentFileFilter,
    }),
  )
  async sendAttachment(
    @CurrentUser() user: JwtPayload,
    @Param('targetUserId') targetUserId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SendAttachmentDto,
  ) {
    const message = await this.chatService.sendAttachment(
      user.sub,
      targetUserId,
      file,
      dto.caption,
    );
    this.chatGateway.broadcastMessage(user.sub, targetUserId, message);
    return message;
  }

  @Get('attachments/:messageId/file')
  async getAttachment(
    @CurrentUser() user: JwtPayload,
    @Param('messageId') messageId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.chatService.getAttachmentFilePath(
      user.sub,
      messageId,
    );
    res.sendFile(filePath);
  }

  @Get('conversations')
  listConversations(@CurrentUser() user: JwtPayload) {
    return this.chatService.listConversations(user.sub);
  }

  @Get('conversations/:chatId/messages')
  listMessages(
    @CurrentUser() user: JwtPayload,
    @Param('chatId') chatId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.listMessages(
      user.sub,
      chatId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Patch('conversations/:chatId/read')
  markRead(@CurrentUser() user: JwtPayload, @Param('chatId') chatId: string) {
    return this.chatService.markRead(user.sub, chatId);
  }
}
