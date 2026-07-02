export interface ConversationSummary {
  chatId: string;
  otherUserId: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatMessage {
  _id: string;
  chatId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface MessagePage {
  messages: ChatMessage[];
  page: number;
  limit: number;
  total: number;
}
