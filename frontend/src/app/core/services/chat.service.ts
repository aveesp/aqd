import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ChatMessage, ConversationSummary, MessagePage } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private readonly http: HttpClient) {}

  listConversations(): Observable<ConversationSummary[]> {
    return this.http.get<ConversationSummary[]>(`${API_BASE_URL}/chat/conversations`);
  }

  listMessages(chatId: string): Observable<MessagePage> {
    return this.http.get<MessagePage>(`${API_BASE_URL}/chat/conversations/${chatId}/messages`);
  }

  sendMessage(targetUserId: string, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${API_BASE_URL}/chat/messages/${targetUserId}`, { content });
  }

  markRead(chatId: string): Observable<{ modifiedCount: number }> {
    return this.http.patch<{ modifiedCount: number }>(`${API_BASE_URL}/chat/conversations/${chatId}/read`, {});
  }
}
