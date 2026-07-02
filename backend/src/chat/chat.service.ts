import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat, ChatDocument } from './schemas/chat.schema';
import { Attachment, Message, MessageDocument } from './schemas/message.schema';
import { MatchesService } from '../matches/matches.service';
import { UsersService } from '../users/users.service';
import { StorageService } from '../storage/storage.service';
import { kindForMimeType } from './upload.constants';

export interface ConversationSummary {
  chatId: string;
  otherUserId: string;
  lastMessageAt: Date | null;
  unreadCount: number;
}

const ATTACHMENT_SUBDIR = 'chat-attachments';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private readonly chatModel: Model<ChatDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    private readonly matchesService: MatchesService,
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  async sendMessage(
    senderId: string,
    targetUserId: string,
    content: string,
  ): Promise<MessageDocument> {
    const chat = await this.prepareSend(senderId, targetUserId);
    const message = await this.messageModel.create({
      chatId: chat._id,
      senderId,
      content,
    });
    chat.lastMessageAt = message.createdAt as unknown as Date;
    await chat.save();
    return message;
  }

  async sendAttachment(
    senderId: string,
    targetUserId: string,
    file: Express.Multer.File,
    caption?: string,
  ): Promise<MessageDocument> {
    const kind = kindForMimeType(file.mimetype);
    if (!kind) {
      throw new BadRequestException('Unsupported attachment type');
    }
    const chat = await this.prepareSend(senderId, targetUserId);
    const saved = await this.storageService.saveFile(
      ATTACHMENT_SUBDIR,
      file.buffer,
      file.originalname,
    );
    const attachment: Attachment = {
      filename: saved.filename,
      originalName: file.originalname,
      kind,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
    const message = await this.messageModel.create({
      chatId: chat._id,
      senderId,
      content: caption,
      attachment,
    });
    chat.lastMessageAt = message.createdAt as unknown as Date;
    await chat.save();
    return message;
  }

  async getAttachmentFilePath(
    userId: string,
    messageId: string,
  ): Promise<string> {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message || !message.attachment) {
      throw new NotFoundException('Attachment not found');
    }
    await this.getChatForParticipant(userId, message.chatId.toString());
    return this.storageService.getFilePath(
      ATTACHMENT_SUBDIR,
      message.attachment.filename,
    );
  }

  private async prepareSend(
    senderId: string,
    targetUserId: string,
  ): Promise<ChatDocument> {
    if (senderId === targetUserId) {
      throw new ForbiddenException('You cannot message yourself');
    }
    const sender = await this.usersService.findById(senderId);
    if (!sender.emailVerifiedAt) {
      throw new ForbiddenException(
        'Please verify your email before sending messages',
      );
    }
    await this.assertCanMessage(senderId, targetUserId);
    return this.getOrCreateChat(senderId, targetUserId);
  }

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    const chats = await this.chatModel
      .find({ participantIds: userId })
      .sort({ lastMessageAt: -1 })
      .exec();

    return Promise.all(
      chats.map(async (chat) => {
        const otherUserId = chat.participantIds
          .find((id) => id.toString() !== userId)!
          .toString();
        const unreadCount = await this.messageModel.countDocuments({
          chatId: chat._id,
          senderId: { $ne: userId },
          readAt: null,
        });
        return {
          chatId: chat.id,
          otherUserId,
          lastMessageAt: chat.lastMessageAt,
          unreadCount,
        };
      }),
    );
  }

  async listMessages(
    userId: string,
    chatId: string,
    page = 1,
    limit = 30,
  ): Promise<{
    messages: MessageDocument[];
    page: number;
    limit: number;
    total: number;
  }> {
    const chat = await this.getChatForParticipant(userId, chatId);
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ chatId: chat._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments({ chatId: chat._id }).exec(),
    ]);
    return { messages: messages.reverse(), page, limit, total };
  }

  async markRead(
    userId: string,
    chatId: string,
  ): Promise<{ modifiedCount: number }> {
    const chat = await this.getChatForParticipant(userId, chatId);
    const result = await this.messageModel
      .updateMany(
        { chatId: chat._id, senderId: { $ne: userId }, readAt: null },
        { readAt: new Date() },
      )
      .exec();
    return { modifiedCount: result.modifiedCount };
  }

  private async getChatForParticipant(
    userId: string,
    chatId: string,
  ): Promise<ChatDocument> {
    const chat = await this.chatModel.findById(chatId).exec();
    if (!chat) {
      throw new NotFoundException('Conversation not found');
    }
    const isParticipant = chat.participantIds.some(
      (id) => id.toString() === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }
    return chat;
  }

  private async getOrCreateChat(
    userIdA: string,
    userIdB: string,
  ): Promise<ChatDocument> {
    const existing = await this.chatModel
      .findOne({ participantIds: { $all: [userIdA, userIdB], $size: 2 } })
      .exec();
    if (existing) {
      return existing;
    }
    return this.chatModel.create({ participantIds: [userIdA, userIdB] });
  }

  // Messaging is gated behind a mutually-accepted Interest, per SRS FR-20,
  // and blocked if either party has blocked the other.
  private async assertCanMessage(
    userIdA: string,
    userIdB: string,
  ): Promise<void> {
    const [hasInterest, blocked] = await Promise.all([
      this.matchesService.hasAcceptedInterest(userIdA, userIdB),
      this.matchesService.areBlocked(userIdA, userIdB),
    ]);
    if (blocked) {
      throw new ForbiddenException(
        'This action is not available between these users',
      );
    }
    if (!hasInterest) {
      throw new ForbiddenException(
        'You can only message users who have accepted your interest',
      );
    }
  }
}
