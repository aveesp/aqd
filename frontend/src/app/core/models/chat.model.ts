export interface ConversationSummary {
  chatId: string;
  otherUserId: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

export type AttachmentKind = 'image' | 'voice' | 'document';

export interface Attachment {
  filename: string;
  originalName: string;
  kind: AttachmentKind;
  mimeType: string;
  sizeBytes: number;
}

export interface ChatMessage {
  _id: string;
  chatId: string;
  senderId: string;
  content?: string;
  attachment?: Attachment | null;
  readAt: string | null;
  createdAt: string;
}

export interface MessagePage {
  messages: ChatMessage[];
  page: number;
  limit: number;
  total: number;
}
