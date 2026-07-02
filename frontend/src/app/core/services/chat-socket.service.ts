import { Injectable } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import { Subject } from 'rxjs';
import { WS_BASE_URL } from '../config/api.config';
import { TokenStorageService } from './token-storage.service';
import { ChatMessage } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  private socket: Socket | null = null;

  private readonly newMessageSubject = new Subject<ChatMessage>();
  private readonly typingSubject = new Subject<{ fromUserId: string }>();

  readonly newMessage$ = this.newMessageSubject.asObservable();
  readonly typing$ = this.typingSubject.asObservable();

  constructor(private readonly tokenStorage: TokenStorageService) {}

  connect(): void {
    if (this.socket?.connected) {
      return;
    }
    this.socket = io(`${WS_BASE_URL}/chat`, {
      auth: { token: this.tokenStorage.getAccessToken() },
      transports: ['websocket'],
    });
    this.socket.on('newMessage', (message: ChatMessage) => this.newMessageSubject.next(message));
    this.socket.on('typing', (payload: { fromUserId: string }) => this.typingSubject.next(payload));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  emitTyping(targetUserId: string): void {
    this.socket?.emit('typing', { targetUserId });
  }
}
