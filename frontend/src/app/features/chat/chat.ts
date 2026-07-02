import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { ChatSocketService } from '../../core/services/chat-socket.service';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatMessage, ConversationSummary } from '../../core/models/chat.model';
import { Profile } from '../../core/models/profile.model';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';

interface ConversationView extends ConversationSummary {
  profile: Profile | undefined;
}

@Component({
  selector: 'app-chat',
  imports: [FormsModule, NavBar],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly conversations = signal<ConversationView[]>([]);
  readonly loadingConversations = signal(true);
  readonly selectedOtherUserId = signal<string | null>(null);
  readonly selectedChatId = signal<string | null>(null);
  readonly selectedProfile = signal<Profile | undefined>(undefined);
  readonly messages = signal<ChatMessage[]>([]);
  readonly loadingMessages = signal(false);
  readonly draft = signal('');
  readonly sending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly otherIsTyping = signal(false);

  private typingTimeout: ReturnType<typeof setTimeout> | undefined;
  private readonly currentUserId = () => this.authService.currentUser()?.id;

  ngOnInit(): void {
    this.chatSocket.connect();
    this.destroyRef.onDestroy(() => this.chatSocket.disconnect());

    this.chatSocket.newMessage$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => {
      if (message.chatId === this.selectedChatId()) {
        this.messages.update((msgs) => [...msgs, message]);
      }
      this.loadConversations();
    });

    this.chatSocket.typing$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ fromUserId }) => {
      if (fromUserId === this.selectedOtherUserId()) {
        this.otherIsTyping.set(true);
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => this.otherIsTyping.set(false), 3000);
      }
    });

    const targetUserId = this.route.snapshot.queryParamMap.get('with');
    this.loadConversations(targetUserId ?? undefined);
  }

  private loadConversations(openUserId?: string): void {
    this.loadingConversations.set(true);
    this.chatService.listConversations().subscribe({
      next: (summaries) => {
        const otherUserIds = summaries.map((s) => s.otherUserId);
        if (otherUserIds.length === 0) {
          this.conversations.set([]);
          this.loadingConversations.set(false);
          if (openUserId) this.openWithUser(openUserId);
          return;
        }
        this.profileService.getByUserIds(otherUserIds).subscribe({
          next: (profiles) => {
            const byUserId = new Map(profiles.map((p) => [p.userId, p]));
            this.conversations.set(summaries.map((s) => ({ ...s, profile: byUserId.get(s.otherUserId) })));
            this.loadingConversations.set(false);
            if (openUserId) {
              this.openWithUser(openUserId);
            } else if (!this.selectedOtherUserId() && summaries.length > 0) {
              this.select(summaries[0]);
            }
          },
          error: () => this.loadingConversations.set(false),
        });
      },
      error: () => this.loadingConversations.set(false),
    });
  }

  private openWithUser(userId: string): void {
    const existing = this.conversations().find((c) => c.otherUserId === userId);
    if (existing) {
      this.select(existing);
      return;
    }
    // No conversation yet — compose mode: no chatId until the first message is sent.
    this.selectedOtherUserId.set(userId);
    this.selectedChatId.set(null);
    this.messages.set([]);
    this.profileService.getByUserIds([userId]).subscribe((profiles) => this.selectedProfile.set(profiles[0]));
  }

  select(conversation: ConversationSummary): void {
    this.selectedOtherUserId.set(conversation.otherUserId);
    this.selectedChatId.set(conversation.chatId);
    this.selectedProfile.set(this.conversations().find((c) => c.chatId === conversation.chatId)?.profile);
    this.loadingMessages.set(true);
    this.chatService.listMessages(conversation.chatId).subscribe({
      next: (page) => {
        this.messages.set(page.messages);
        this.loadingMessages.set(false);
        this.chatService.markRead(conversation.chatId).subscribe(() => this.loadConversations());
      },
      error: () => {
        this.loadingMessages.set(false);
        this.errorMessage.set('Could not load messages.');
      },
    });
  }

  onDraftInput(): void {
    const otherUserId = this.selectedOtherUserId();
    if (otherUserId) {
      this.chatSocket.emitTyping(otherUserId);
    }
  }

  send(): void {
    const content = this.draft().trim();
    const otherUserId = this.selectedOtherUserId();
    if (!content || !otherUserId) return;

    this.sending.set(true);
    this.chatService.sendMessage(otherUserId, content).subscribe({
      next: (message) => {
        this.sending.set(false);
        this.draft.set('');
        this.selectedChatId.set(message.chatId);
        if (!this.messages().some((m) => m._id === message._id)) {
          this.messages.update((msgs) => [...msgs, message]);
        }
        this.loadConversations();
      },
      error: (err: HttpErrorResponse) => {
        this.sending.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not send message.');
      },
    });
  }

  isMine(message: ChatMessage): boolean {
    return message.senderId === this.currentUserId();
  }
}
